# 0004 – Fixed playfield width for fair, fully responsive gameplay

- Status: accepted (2026-11-04)
- Deciders: owner (requirement: fully responsive, every format equally hard)

## Context

The owner wants Bug Hunt to fill every display (phones, foldables, tablets, desktops, ultrawide) and at
the same time be equally hard everywhere, so highscores stay comparable. If the world simply grew with
the screen, wider displays would offer more items and shorter relative paths, and scores would scale
with the display width.

## Decision

- The playfield has a fixed logical width of 240 px (the original 160 px × 1.5).
- Its height adapts between 120 px and 480 px.
- Fall time and spawn timing are defined in seconds; vertical speeds scale with the field height.
- One integer pixel scale per frame; remaining space becomes the R15K frame, grid paper and side or
  top/bottom panels (HUD, info, touch area).

## Consequences

- Horizontal gameplay is identical on every device and vertical timing is identical in seconds, so
  difficulty and highscores are comparable.
- On very wide or very tall displays, part of the screen shows panels instead of playfield; the layout
  must make these panels useful and on-brand rather than empty.
