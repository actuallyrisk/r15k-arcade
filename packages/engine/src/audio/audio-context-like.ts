/** Subset of AudioParam used by the mixer. */
export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, startTime: number): unknown;
  linearRampToValueAtTime(value: number, endTime: number): unknown;
  cancelScheduledValues(cancelTime: number): unknown;
}

/** Subset of AudioNode used by the mixer. */
export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
}

/** Subset of GainNode used by the mixer. */
export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}

/** Subset of AudioBuffer used by the mixer. */
export interface AudioBufferLike {
  readonly duration: number;
  readonly length: number;
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

/** Subset of AudioBufferSourceNode used by the mixer. */
export interface BufferSourceLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
}

/** Minimal structural subset of WebAudio used by the mixer; a real AudioContext is assignable to it. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  addEventListener(type: 'statechange', listener: () => void): void;
}
