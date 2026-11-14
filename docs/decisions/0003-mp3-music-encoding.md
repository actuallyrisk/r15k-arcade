# 0003 – Music is encoded as MP3 with a WASM encoder

- Status: accepted (2026-11-04)
- Deciders: owner

## Context

Music is pre-rendered by our own offline synth (`tools/song-render`). The plan named AAC `.m4a` first
and MP3 as fallback. AAC needs ffmpeg (a native binary download per OS), and AAC support could only be
verified on the four WebViews with real device builds.

## Decision

- Music is encoded as MP3 by a WASM encoder that is a dev dependency (no binary downloads, identical
  output on Windows, macOS and Linux).
- SFX stay short PCM WAV.
- The renderer writes metadata per track: sample rate, encoder delay, padding and loop points. The
  mixer uses them for sample-accurate, gapless loops (`AudioBufferSourceNode.loopStart/loopEnd`).

## Consequences

- MP3 decoding is available in WebView2, WKWebView and Android WebView, so no per-platform format
  switch is needed.
- MP3 is slightly larger than AAC at equal quality; chiptune music at low bitrates stays far below the
  3 MB audio budget.
- Revisit if the audio budget gets tight (e.g. Opus once all WebViews decode it reliably).
