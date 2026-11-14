// R15K Arcade tools – CRC-32 (ISO-HDLC, as PNG chunks use it): reflected polynomial 0xEDB88320, initial
// value and final XOR 0xFFFFFFFF. The lookup table is built once when the module loads.

const POLYNOMIAL = 0xedb88320;

/** The 256-entry lookup table of the byte-wise algorithm. */
function buildTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? POLYNOMIAL ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const TABLE = buildTable();

/** CRC-32 of the bytes. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
