# Reena / Special Pages Performance Pass 6.2

This patch optimizes Reena/special-section visual assets without changing layout or mechanics.

## Size changes

| Original | New loaded asset | Before | After | Saved |
|---|---|---:|---:|---:|
| `client/public/reena-choice/forest-bg.png` | `client/public/reena-choice/forest-bg.webp` | 2.58 MB | 0.18 MB | 2.40 MB (93.2%) |
| `client/public/reena-choice/forest-bg.png` | `client/public/reena-choice/forest-bg-mobile.webp` | 2.58 MB | 0.09 MB | 2.49 MB (96.6%) |
| `client/public/reena-choice/MainSiteStone.png` | `client/public/reena-choice/MainSiteStone.webp` | 1.77 MB | 0.28 MB | 1.49 MB (84.0%) |
| `client/public/reena-choice/SpecialSectionStone.png` | `client/public/reena-choice/SpecialSectionStone.webp` | 2.06 MB | 0.34 MB | 1.72 MB (83.5%) |
| `client/public/reena/GRC.png` | `client/public/reena/GRC.webp` | 1.79 MB | 0.11 MB | 1.68 MB (94.0%) |
| `client/public/reena-kundali/infographics1.png` | `client/public/reena-kundali/infographics1.webp` | 2.06 MB | 0.17 MB | 1.89 MB (91.9%) |
| `client/public/reena-kundali/infographics2.png` | `client/public/reena-kundali/infographics2.webp` | 0.13 MB | 0.01 MB | 0.11 MB (90.5%) |
| `client/public/reena-kundali/infographics3.png` | `client/public/reena-kundali/infographics3.webp` | 2.02 MB | 0.17 MB | 1.85 MB (91.7%) |
| `client/public/reena-kundali/infographics4.png` | `client/public/reena-kundali/infographics4.webp` | 2.08 MB | 0.20 MB | 1.88 MB (90.5%) |
| `client/public/reena-kundali/infographics5.png` | `client/public/reena-kundali/infographics5.webp` | 2.06 MB | 0.20 MB | 1.86 MB (90.3%) |
| `client/public/reena-kundali/infographics6.png` | `client/public/reena-kundali/infographics6.webp` | 2.04 MB | 0.20 MB | 1.85 MB (90.4%) |
| `client/public/reena-kundali/infographics7.png` | `client/public/reena-kundali/infographics7.webp` | 2.04 MB | 0.21 MB | 1.84 MB (89.9%) |
| `client/public/reena-kundali/infographics8.png` | `client/public/reena-kundali/infographics8.webp` | 2.05 MB | 0.21 MB | 1.85 MB (90.0%) |
| `client/public/reena-choice/choicesbg.mp4` | `client/public/reena-choice/choicesbg.mp4` | 0.66 MB | 0.24 MB | 0.42 MB (63.2%) |

## Code changes

- Reena background CSS now uses `forest-bg.webp` and a lighter mobile `forest-bg-mobile.webp`.
- Reena/Kundali/Trivia/Apology pages avoid fixed background attachment on these special scroll-heavy pages.
- Choice page stones now use WebP.
- Kundali infographic slides now use WebP and lazy image decoding/loading.
- Reena GRC image now uses WebP and lazy image decoding/loading.
- Choice background video is compressed in-place using the same path and filename.

No backend, payment, auth, admin, route, shop logic, or layout changes are included.
