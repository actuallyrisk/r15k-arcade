// R15K Arcade tools – counts the audio frames of an MPEG-1 Layer III stream (the music metadata needs
// them for the encoder padding). An ID3v2 tag at the start and an ID3v1 tag at the end are skipped; a
// Xing/Info frame (gapless metadata, no audio) is detected and not counted. Anything else that is not a
// complete frame fails loudly.

/** Frame count of an MP3 stream. */
export interface Mp3FrameInfo {
  readonly audioFrames: number;
  readonly hasInfoTag: boolean;
  readonly samplesPerFrame: 1152;
}

/** Bitrates of MPEG-1 Layer III by header index (kbps; 0 = free format, unsupported). */
const BITRATES_KBPS: readonly number[] = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
/** Sample rates of MPEG-1 by header index (Hz). */
const SAMPLE_RATES: readonly number[] = [44_100, 48_000, 32_000];
/** Side information bytes of an MPEG-1 frame: mono, stereo. */
const SIDE_INFO_MONO = 17;
const SIDE_INFO_STEREO = 32;
/** Header bytes, CRC bytes, ID3v2 header bytes and ID3v1 tag bytes. */
const HEADER_BYTES = 4;
const CRC_BYTES = 2;
const ID3V2_HEADER_BYTES = 10;
const ID3V1_BYTES = 128;

/** Parsed frame header. */
interface FrameHeader {
  readonly frameBytes: number;
  /** Offset of the Xing/Info tag from the frame start, if the frame holds one. */
  readonly tagOffset: number;
}

/** The ASCII text of `length` bytes from `offset`. */
function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** First 15 header bits of an MPEG-1 Layer III frame: 11 sync bits, version 11, layer 01. */
const MPEG1_LAYER3_SYNC = 0x7ffd;

/** The four header bytes at `offset` as a big-endian word (0 past the end). */
function headerWord(bytes: Uint8Array, offset: number): number {
  if (offset + HEADER_BYTES > bytes.length) {
    return 0;
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

/** Parses an MPEG-1 Layer III frame header at `offset`, or undefined when there is none. */
function frameHeaderAt(bytes: Uint8Array, offset: number): FrameHeader | undefined {
  const word = headerWord(bytes, offset);
  const bitrate = BITRATES_KBPS[(word >>> 12) & 0xf] ?? 0;
  const sampleRate = SAMPLE_RATES[(word >>> 10) & 0b11];
  if (word >>> 17 !== MPEG1_LAYER3_SYNC || bitrate === 0 || sampleRate === undefined) {
    return undefined;
  }
  // Bit 16 clear: a CRC follows the header. Channel mode 11: mono. Bit 9: one padding byte.
  const crc = ((word >>> 16) & 1) === 0 ? CRC_BYTES : 0;
  const sideInfo = ((word >>> 6) & 0b11) === 0b11 ? SIDE_INFO_MONO : SIDE_INFO_STEREO;
  return {
    frameBytes: Math.floor((144_000 * bitrate) / sampleRate) + ((word >>> 9) & 1),
    tagOffset: HEADER_BYTES + crc + sideInfo,
  };
}

/** Bytes of an ID3v2 tag at the start of the stream (0 when there is none). */
function id3v2Bytes(bytes: Uint8Array): number {
  if (asciiAt(bytes, 0, 3) !== 'ID3' || bytes.length < ID3V2_HEADER_BYTES) {
    return 0;
  }
  // The tag size is a 28-bit "synchsafe" integer (7 bits per byte); a footer adds another header size.
  const size = [6, 7, 8, 9].reduce((total, index) => total * 128 + ((bytes[index] ?? 0) & 0x7f), 0);
  const hasFooter = ((bytes[5] ?? 0) & 0x10) !== 0;
  return ID3V2_HEADER_BYTES + size + (hasFooter ? ID3V2_HEADER_BYTES : 0);
}

/** Whether the frame at `offset` is a Xing/Info frame. */
function isInfoFrame(bytes: Uint8Array, offset: number, header: FrameHeader): boolean {
  const tag = asciiAt(bytes, offset + header.tagOffset, 4);
  return tag === 'Xing' || tag === 'Info';
}

/** Throws unless the stream ends at `offset` or only an ID3v1 tag follows. */
function assertStreamEnd(bytes: Uint8Array, offset: number): void {
  const rest = bytes.length - offset;
  const isId3v1 = rest === ID3V1_BYTES && asciiAt(bytes, offset, 3) === 'TAG';
  if (rest !== 0 && !isId3v1) {
    throw new Error(`not an MPEG-1 Layer III stream: ${rest} unexpected bytes at offset ${offset}`);
  }
}

/** Counts the audio frames of an MPEG-1 Layer III stream; throws on anything that is not one. */
export function scanMp3Frames(bytes: Uint8Array): Mp3FrameInfo {
  let offset = id3v2Bytes(bytes);
  let audioFrames = 0;
  let hasInfoTag = false;
  let header = frameHeaderAt(bytes, offset);
  while (header !== undefined && offset + header.frameBytes <= bytes.length) {
    const isTag: boolean = audioFrames === 0 && !hasInfoTag && isInfoFrame(bytes, offset, header);
    hasInfoTag ||= isTag;
    audioFrames += isTag ? 0 : 1;
    offset += header.frameBytes;
    header = frameHeaderAt(bytes, offset);
  }
  assertStreamEnd(bytes, offset);
  if (audioFrames === 0) {
    throw new Error('not an MPEG-1 Layer III stream: no audio frames');
  }
  return { audioFrames, hasInfoTag, samplesPerFrame: 1152 };
}
