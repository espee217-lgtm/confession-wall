# Confession Wall Asset Cleanup Report

## Executive Summary
The largest deploy bloat is coming from `client/public/assets` (~65.87 MB), `client/src/assets` (~48.02 MB), and `client/public/emoji` (~31.03 MB). The highest-confidence cleanup candidates are unreferenced source/archive image sets (`guidebook/desktop-source`) and clearly duplicated files between `src/assets` and `public/assets/mobile`. A second large opportunity is legacy PNG copies in `public/assets/split-bouquet` while runtime uses `.webp`.

## Definitely Used Assets
- `client/public/assets/mobile/mobile-hero-banner.png` (used in `client/src/pages/Home.js`)
- `client/src/assets/forest-page-bg.webp`, `client/src/assets/forest-page-bg.png`, `client/src/assets/forest-page-bg-mobile.webp` (used in `client/src/AppStyle.css`)
- `client/src/assets/mobile-navbar-bg.webp`, `client/src/assets/mobile-navbar-bg.png`, `client/src/assets/mobile-navbar-bg-mobile.webp` (used in `client/src/AppStyle.css`)
- `client/public/assets/trending/*` active set:
  - `trending_header_strip.webp`
  - `podium_base.webp`
  - `rank_1_crown.webp`
  - `rank_2_silver.webp`
  - `rank_3_bronze.webp`
  - `trending_skin_grove.webp`
  - `trending_skin_moon.webp`
  - `trending_skin_scorched.webp`
  - `leaf_divider.webp`
  (used in `client/src/pages/TrendingPage.js`)
- `client/public/assets/fig-event-strip.webp` + fallback `client/public/assets/fig.png` (used in `client/src/components/ForestEventBanner.js`; strip also preloaded in `client/public/index.html`)
- `client/public/assets/wreath.png` (used in `client/src/pages/TrendingPage.js`)
- `client/public/assets/eye_circle_transparent_48.png` (used in `client/src/components/MobileBottomNav.js`)
- `client/public/guidebook/desktop/*.webp` (used via `client/src/data/guidebookContent.js`)
- `client/src/assets/cosmetics/*` and `client/src/assets/avatarFrames/*` heavy sprite sheets (used via dynamic imports in `client/src/components/CosmeticFx.js`)
- `client/public/emoji/noto/svg/*` (used via path resolver in `client/src/utils/emojiAsset.js`)
- `client/public/assets/seed-avatars/*.webp` (seed avatar system assets; generated/used by avatar logic and config paths)

## Likely Unused Assets

| Asset Path | Size | Why It Appears Unused | Search Method Used | Risk If Deleted |
|---|---:|---|---|---|
| `client/public/assets/kil.png` | 2,843,411 B | No reference in `client/src` or `client/public` text/code files | `rg -n "kil\\.png"` | Low |
| `client/public/assets/kal.png` | 2,483,578 B | No reference in `client/src` or `client/public` text/code files | `rg -n "kal\\.png"` | Low |
| `client/public/guidebook/desktop-source/*` (19 PNGs) | 16,117,527 B total | Runtime guidebook uses `guidebook/desktop/*.webp`; no `desktop-source` references found | `rg -n "desktop-source|guidebook/desktop-source"` | Low |
| `client/public/assets/split-bouquet/*.png` (16 PNGs) | 26,201,886 B total | Current component uses `.webp` bouquet assets only | `rg -n "split-bouquet/.*\\.png|split-bouquet/.*\\.webp"` + `SplitBouquetHero.js` | Medium |

## Duplicate or Redundant Assets

| Asset A | Asset B | Size | Where Used | Can One Be Removed Later? | Risk |
|---|---|---:|---|---|---|
| `client/src/assets/forest-page-bg.png` | `client/public/assets/mobile/forest-page-bg.png` | 1,956,885 B each | `src` copy is used in CSS; `public` copy has no active refs found | Yes, likely remove `public` copy after visual check | Low |
| `client/src/assets/mobile-navbar-bg.png` | `client/public/assets/mobile/mobile-navbar-bg.png` | 1,625,926 B each | `src` copy is used in CSS; `public` copy has no active refs found | Yes, likely remove `public` copy after visual check | Low |
| `client/public/guidebook/desktop/*.webp` | `client/public/guidebook/desktop-source/*.png` | varies | `.webp` is runtime; `.png` appears source/archive | Yes, archive or move source files out of deploy path | Low |
| `client/public/assets/split-bouquet/*.webp` | `client/public/assets/split-bouquet/*.png` | varies | `.webp` currently referenced; `.png` appears legacy/fallback | Possibly, but verify no legacy browser fallback requirement | Medium |

## Public Folder Deploy Bloat
- `client/public/assets`: **~65.87 MB**
  - Major contributors: split-bouquet PNG set, trending crowns/podium, `kil.png`, `kal.png`, `speed.png`, `blow.png`.
- `client/public/emoji`: **~31.03 MB**
  - Very large by count; appears intentionally used by emoji rendering paths.
- `client/public/guidebook`: **~15.69 MB**
  - Dominated by `desktop-source` PNGs (~15.37 MB) that appear archive-only.

## Guidebook Source Files
- `client/public/guidebook/desktop-source` contains 19 PNG files (~15.37 MB).
- Runtime guidebook image builder in `client/src/data/guidebookContent.js` points to `/guidebook/desktop/*.webp`.
- No references to `desktop-source` were found in code/config/CSS.
- Recommendation: move `desktop-source` outside `public/` (archive folder) or remove from deploy artifact after manual verification.

## Cosmetic Assets
- Active runtime cosmetic sprites are in `client/src/assets/cosmetics` and `client/src/assets/avatarFrames`, loaded by `client/src/components/CosmeticFx.js` via dynamic import mapping.
- These are required for equipped frames and shop/profile previews.
- High-size files (lotus, ice-monarch, storm-hoodie, grove-butterfly, demon-thorn) are expected and should **not** be deleted without product-level decisions.
- Current state is already safer than static eager imports because assets resolve per cosmetic ID.

## Safe Cleanup Plan

### Phase 1 (Lowest Risk)
1. Remove unreferenced single files:
   - `client/public/assets/kil.png`
   - `client/public/assets/kal.png`
2. Build + smoke test Home/Trending/Shop/Profile.

### Phase 2 (Still Low Risk)
1. Remove duplicate public mobile background copies that are not referenced:
   - `client/public/assets/mobile/forest-page-bg.png`
   - `client/public/assets/mobile/mobile-navbar-bg.png`
2. Keep `client/src/assets/*` versions (currently used in CSS image sets).

### Phase 3 (Archive/Source Cleanup)
1. Move `client/public/guidebook/desktop-source/*` out of `public/` to a non-deployed archive folder.
2. Keep `client/public/guidebook/desktop/*.webp` runtime set.

### Phase 4 (Medium Risk, Manual QA Required)
1. Evaluate deleting legacy `client/public/assets/split-bouquet/*.png` if `.webp` parity is confirmed across target browsers/devices.
2. Keep only `.webp` split-bouquet runtime assets.

## Do Not Delete Yet
- `client/public/emoji/noto/svg/*` (appears required by emoji path resolver)
- `client/src/assets/cosmetics/*` and `client/src/assets/avatarFrames/*` (runtime cosmetic system)
- `client/public/assets/seed-avatars/*.webp` (avatar content set)
- `client/public/assets/speed.png` and `client/public/assets/blow.png` (Shop uses these)
- `client/public/assets/fig.png` and `client/public/assets/fig-event-strip.webp` (event banner + preload paths)
- `client/public/assets/trending/*` (actively used by trending page)

## Scan Notes (Method)
- Reference scans were run with `rg` across:
  - `client/src`
  - `client/public/index.html`, `robots.txt`, `sitemap.xml`
- Duplicate detection used filename + byte-size match between:
  - `client/src/assets`
  - `client/public/assets`
- Size/bloat profiling used recursive file-size totals for:
  - `client/public/assets`
  - `client/public/guidebook`
  - `client/public/emoji`
  - `client/src/assets`
