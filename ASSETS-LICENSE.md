# Assets licence

Copyright © 2026 R15K. All rights reserved.

The MIT licence in [LICENSE](LICENSE) covers the source code only. The assets of R15K Arcade and
everything generated from them are **not** open source: they may not be copied, modified, redistributed
or used in other works without written permission of R15K.

## What is covered

- Sprites, bitmap fonts, songs, rendered audio, icons, the logo, store graphics, and the name and brand
  "R15K".

### Source files

| Path            | Content                                                           |
| --------------- | ----------------------------------------------------------------- |
| `**/sprites/**` | Sprite data (text grids), e.g. `games/*/src/sprites/**`           |
| `**/fonts/**`   | Bitmap font glyph data, e.g. `packages/ui/src/fonts/**`           |
| `assets/**`     | Songs (`assets/songs/**`), icon and store graphics, pixel goldens |

### Generated outputs

| Output         | Paths                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Rendered audio | `apps/arcade/public/audio/**`, `apps/arcade/dist/audio/**` and the audio inside every package                        |
| Icons          | `apps/arcade/src-tauri/icons/**`, the icons inside `apps/arcade/src-tauri/gen/**` and every package, `.tmp/icons/**` |
| Pixel goldens  | `assets/goldens/**`                                                                                                  |

"Every package" means every built app package (APK, AAB, IPA, app bundle, DMG, MSIX, installer) and
every web build of the app.

## What is not covered

Code is never stored under an asset path. The code that loads and draws the assets (for example
`packages/ui/src/text/**` and `games/bug-hunt/src/view/sprite-sheets.ts`) is MIT-licensed like all other
source code. Public-domain melodies used in songs remain in the public domain; the arrangements and
recordings are covered by this licence.
