# W71 — office font slices

The office font is now generated into 145 disjoint unicode-range faces instead of downloading the 666,264-byte original font. The original and OFL license remain under assets/fonts; the distributed license remains public. apps/web and artwork/layout were not changed.

- ASCII/punctuation/Pixi measurement glyphs: 208 codepoints, 3,784 bytes.
- Scanned zh.ts/en.ts dictionary remainder: 223 codepoints, 8,840 bytes.
- Remaining 143 slices: 216–256 codepoints and 2,536–11,392 bytes each.
- Complete coverage: 36,999 mapped codepoints; all generated files total 1,027,840 bytes. The larger aggregate is intentional: first-screen font bytes fall from 666,264 to 12,624 (98.1% less).
- Every CSS URL uses the existing ?v= cache-busting convention with a reproducible content-derived build stamp. Vite supplies the /office/ base.
- Pixi bubble, plaque, hover name and board overflow all share loadGlyphs/setGlyphText. They assign text only after document.fonts.load with that actual text resolves; stale loads and destroyed labels cannot apply. Plaques refit after loading, and bubbles measure their background after loading.
- Startup explicitly requests ASCII and dictionary text. É and Å belong to ASCII because Pixi's font ascent probe uses them; otherwise the probe would fetch a third face.

## Real-page network acceptance

Playwright used cold Chromium contexts, 1440×900, reduced motion, an authenticated local API, /office/ and /office/?check=1. It waited for the canvas plus document.fonts.ready and another 1.5 seconds. No API response mocking. Browser invocations used flock /tmp/idesk-browser.lock.

The baseline was built from 7e267d5; latest main 6f689ed changes documentation only, so its office/API asset baseline is identical. W70 is still a separate branch: its supplied asset-only comparison is 1,368,978 → 1,090,056 gzip bytes (about 1.37 → 1.09 MB). This PR's measurement includes navigation and actual API JSON responses too; do not add the W70 improvement to these measured results as though it were already merged.

| Page | main raw bytes | W71 raw bytes | main gzip bytes | W71 gzip bytes | main actual encoded body bytes | W71 actual encoded body bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /office/ | 2,241,239 | 1,656,862 | 1,370,058 | 750,182 | 1,470,979 | 839,020 |
| /office/?check=1 | 2,241,177 | 1,656,800 | 1,369,836 | 749,960 | 1,470,777 | 838,818 |

Raw and gzip columns sum fetched response bodies, with gzip calculated consistently using node:zlib for every body (including already compressed fonts/images). Actual encoded body is the browser's resource timing encodedBodySize sum, excluding HTTP headers; the API compresses JS/CSS/JSON but serves WOFF2/PNG directly. The gzip comparison improves by 45.2%; actual encoded bodies improve by 43.0%.

Both W71 pages request exactly these fonts:

| Request | Bytes |
| --- | ---: |
| /office/fonts/fusion-pixel-ascii.woff2?v=5b8bf6c23349 | 3,784 |
| /office/fonts/fusion-pixel-dictionary.woff2?v=f2cde8cd3f5d | 8,840 |

The exact request URLs and every response size are in baseline.json and final.json alongside this report. slice-sizes.json lists every generated slice.

## Glyph screenshots

Live local API calls created a codex agent named 像素龘 on host 龘饕餮, published and claimed task 䶮龘饕餮测试, and posted that title through the report endpoint. zh-light.png and en-dark.png show the live page at 1920×1080 with a rare-glyph report bubble and host plaque. The 3x files use nearest-neighbor enlargement; detail crops show the same bubble/plaque. The screenshot JSON records the actual loaded font faces and requested font URLs. Source and sliced glyph outlines for 䶮、龘、饕、餮 compare identically (outlines.json).

The source font itself does not map ✓; this PR preserves its full supported cmap and does not invent or replace glyphs. Original fallback behavior for unsupported characters remains.

## Validation

- pnpm typecheck — exit 0.
- flock /tmp/idesk-test.lock pnpm test — exit 0, 959 tests across 100 files.
- pnpm --filter office build — exit 0, no warnings (also after rebase).
- pnpm lint — exit 0, no warnings, 425 files checked (also after rebase).
- Focused font/Pixi tests — 5 passed after final generation/rebase. They inspect actual WOFF2 cmap partitions, exact CSS ranges, source coverage, scanned dictionary coverage, and deferred bubble/plaque application plus stale/destroyed targets.
- Ran node apps/office/tools/font-slices.mjs twice on the final script; SHA-256 of all 145 WOFF2 files and fonts.css matched (146 files). Rebase leaves those hashes unchanged.
- git fetch && git rebase origin/main && pnpm install completed; PR branch clean.
