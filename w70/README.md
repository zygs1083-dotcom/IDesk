# W70 indexed PNG acceptance evidence

The shared encoder writes color type 3, depth 8, PLTE with the unchanged 42 palette colors followed by transparent black, tRNS with only index 42 transparent, and level-9 zlib IDAT with filter 0 on every row. Every save decodes through pngjs and asserts byte-for-byte RGBA equality before writing; malformed alpha, off-palette opaque colors and nonzero transparent RGB fail explicitly.

| Atlas | Before B | After B | RGBA pixel differences | Nonzero RGB on transparent pixels, before / after |
| --- | ---: | ---: | ---: | ---: |
| tiles | 1681 | 526 | 0 | 0 / 0 |
| furniture | 21317 | 7672 | 0 | 0 / 0 |
| sprites | 459751 | 132137 | 0 | 0 / 0 |
| Total | 482749 | 140335 | 0 | 0 / 0 |

Raw atlas saving: 342414 bytes (70.9%). `atlases-before/` preserves main's original encodings; `atlases-after/` preserves indexed encodings. Both sides were decoded with pngjs and compared across every RGBA pixel, including transparent pixels.

## First screen static payload

Built with `pnpm --filter office build`; resource set observed in headless Chromium on `/office/?check=1`, 1440×900, fresh page. Includes the HTML entry, all four initially requested JS chunks, CSS, tiles/furniture/sprites/catalog/layout JSON, all three PNG atlases and the font. Dynamic API/WS payloads and HTTP headers are excluded. Gzip figures are the sum of each resource compressed separately using Node zlib level 9, not an assertion that the server compresses every format. Both columns use the final rebased build’s unchanged JS/CSS/HTML/JSON/font bytes; the before column substitutes main’s original PNGs, which W69a did not change. `rebased-resources.json` records the final build’s requested URLs. This isolates the W70 encoding saving.

| Resource | Before raw B | Before gzip B | After raw B | After gzip B |
| --- | ---: | ---: | ---: | ---: |
| index.html | 691 | 367 | 691 | 367 |
| CSS | 7922 | 2077 | 7922 | 2077 |
| JS (4 initial chunks) | 1000339 | 289419 | 1000339 | 289419 |
| catalog.json | 9621 | 858 | 9621 | 858 |
| fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2 | 666264 | 654195 | 666264 | 654195 |
| furniture.json | 3958 | 552 | 3958 | 552 |
| furniture.png | 21317 | 18448 | 7672 | 6986 |
| layout.json | 12196 | 1440 | 12196 | 1440 |
| sprites.json | 56605 | 1954 | 56605 | 1954 |
| sprites.png | 459751 | 398173 | 132137 | 131458 |
| tiles.json | 832 | 222 | 832 | 222 |
| tiles.png | 1681 | 1273 | 526 | 528 |
| **Total** | 2241177 | 1368978 | 1898763 | 1090056 |

Raw saving: 342414 bytes (15.3%); gzip saving: 278922 bytes (20.4%). Font alone: 666264 raw / 654195 gzip bytes, 60.0% of the new gzip total; it is the largest remaining resource and is unchanged.

## Browser screenshots

`before/` and `after/` use `prefers-reduced-motion: reduce` to hold animation frames fixed; both capture `/office/?check=1` with the check mode's default noon lighting. Both panorama pairs have identical file SHA-256 and therefore zero pixel differences:

| Panorama | SHA-256 (both before and after) |
| --- | --- |
| 1440×900 | 132cbed2cda7a6b2efb7e7d9b54a095f3f3119e6a42c14fb4cbfff5bc1c135ad |
| 1280×768 (1 world pixel per screen pixel) | 0b12bf0031380972644bff6b642dc01d46eb2af6a1b0ce3e2ac39b71a5a891fb |

`check-before/` and `check-after/` retain the existing check-office script's complete 14-image runs (panoramas, detailed work areas, dusk/night and chair comparison), each with zero browser errors. Those runs retain normal animation and are not used for hash equality. Every independent Chromium run was guarded by `flock /tmp/idesk-browser.lock`.

## Deterministic generators

Each of `pnpm --filter office tiles`, `pnpm --filter office furniture`, and `pnpm --filter office sprites` was run twice with the final encoder. Both rounds match `first.sha256`; the integer color-key optimization also leaves all hashes unchanged. Previews and generated JSON remain byte-identical to main. The furniture hash change is expected from lossless re-encoding.

Run the stored old/new pixel comparison from any checkout with office dependencies installed:

```sh
node verify-pixels.mjs /absolute/path/to/IDesk/apps/office/package.json
```
