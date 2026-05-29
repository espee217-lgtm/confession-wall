# Confession Wall Performance Audit Report

## Executive Summary

The biggest smoothness risks are not one single bug; they are a stack of heavy visuals and assets loading early.

Highest-impact issues found:

1. Huge cosmetic sprite sheets are statically imported through shared avatar/card components. Several are 5 MB to 13 MB PNGs, and the animation CSS is globally loaded.
2. The app does not use route-level `React.lazy` / `Suspense`; many heavy pages are imported into the initial bundle from `client/src/App.js`.
3. Desktop Home has a costly hover hit-test path that creates/draws canvas data and reads pixels during mouse movement for Krishna/Demon side sprites.
4. Mobile and desktop use many fixed translucent layers, blurred modal backdrops, large shadows, glow effects, and continuously running decorative animations.
5. Several above-the-fold or route-critical images are oversized, especially mobile hero/navbar/background assets and Trending podium/rank art.
6. `client/src/AppStyle.css` is very large and appears to be imported twice, once in `client/src/App.js` and once in `client/src/index.js`.

The site already has some good optimizations, including `content-visibility: auto` for repeated cards, mobile emoji lazy rendering, rAF-throttled bottom-nav scroll handling, and several mobile CSS reductions. The safest next work is to reduce startup weight and pause offscreen visual work before changing visible design.

## Already Optimized

- `client/src/AppStyle.css` uses `content-visibility: auto` and `contain-intrinsic-size` for repeated cards and comments.
- Mobile bottom nav scroll hide/show logic is rAF-throttled in `client/src/components/MobileBottomNav.js`.
- Mobile bottom nav backdrop blur has already been removed/reduced in later mobile nav CSS.
- Emoji picker mobile rendering was optimized to render active category/search results instead of all categories at once.
- Emoji picker sticky search/category behavior is overridden on mobile.
- Shop mobile CSS disables several backdrop filters and decorative animated overlays.
- Trending CSS has multiple containment and filter-removal rules for expensive stage/card areas.
- Some animated systems include `prefers-reduced-motion` handling, especially split bouquet, shop, and cosmetic animation CSS.
- Guidebook images are lazy loaded in `client/src/components/GuidebookPopup.js`.

## Highest Impact Fixes

1. Lazy-load cosmetic effects and sprite sheets by equipped cosmetic ID.
   Do not statically import every avatar frame/post theme sprite through `CosmeticFx.js`.

2. Add route-level code splitting.
   Lazy-load Shop, Chess, Reena pages, Settings, UserProfile, Admin pages, Guidebook, Trending, and Single Confession routes.

3. Replace or throttle desktop Home side-sprite pixel hit testing.
   The current canvas `getImageData` mouse path can cause desktop jank.

4. Compress and resize large public assets.
   Start with mobile hero/navbar/background, Trending podium/rank assets, and huge cosmetic PNG sprite sheets.

5. Reduce large blur/shadow effects on mobile.
   Replace big `backdrop-filter` and 70px+ decorative blurs with darker solid gradients or pre-rendered assets.

6. Pause animations when offscreen or tab is hidden.
   Fireflies, cosmetic sprites, bouquet float, and shop sheen should not run continuously when invisible.

7. Remove duplicate global CSS import after verifying cascade safety.
   `AppStyle.css` is imported from both `App.js` and `index.js`.

## Desktop Findings

- Desktop Home is visually heavy: fixed video background, layered overlay, split bouquet hero, Krishna/Demon side sprites, fireflies, glow shadows, and hover hit testing.
- Desktop Home side-sprite hit testing is the most suspicious desktop smoothness risk because it reads image alpha via canvas during `mousemove`.
- Desktop footer/nav uses forest image backgrounds and shadow/filter styling, but those are lower risk than Home sprite hit testing and large imports.
- Realm pages use video backgrounds (`forest3.mp4`, `Burnt.mp4`) and are directly imported rather than route-split.
- Trending desktop has meaningful containment/filter cleanup already, but the page still depends on large art and many layered card/stage elements.
- Shop/profile/settings pages are imported eagerly and use glass panels, backdrop blur, large shadows, and cosmetic previews.
- Admin/Reena/Chess pages are imported eagerly even though they are not needed for normal first-page users.

## Mobile Findings

- Mobile Home loads a large fixed video background plus a 1.9 MB mobile hero banner and large mobile forest/navbar background images.
- Mobile bottom nav design is now visually strong and mostly optimized, but it still has glow/shadow animation on the raised Confess button.
- Mobile composer and guest/auth overlays use full-screen fixed layers with blur and high z-index.
- Mobile cards use multiple shadows, decorative effects, cosmetic layers, and sometimes backdrop blur.
- Mobile Trending is asset-heavy: podium/rank images are around 2.6 MB to 2.9 MB each and may appear near the top of the page.
- Emoji picker rendering is improved, but the public emoji SVG folder contains thousands of files and should remain on-demand only.
- Settings/Profile mobile views use large blurred decorative blobs and glass cards, which are expensive on lower-end phones.

## Image Asset Findings

| File path | Size | Usage | Desktop/Mobile | Initial or lazy candidate | Recommendation |
|---|---:|---|---|---|---|
| `client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_7x7.png` | 13.2 MB | Imported by `CosmeticFx.js` | Both where avatars render | Should be lazy by equipped frame | Convert/compress to WebP/AVIF sprites or video; dynamic import only when used. |
| `client/src/assets/cosmetics/ice-monarch-frame/ice_monarch_avatar_frame_spritesheet_72f_8x9.png` | 11.9 MB | Imported by `CosmeticFx.js` | Both | Should be lazy by equipped frame | Same as above; this is a top priority. |
| `client/src/assets/avatarFrames/storm-hoodie-greenkey-spritesheet.png` | 6.4 MB | Imported by `CosmeticFx.js` | Both | Should be lazy by equipped frame | Dynamic import and compress. |
| `client/src/assets/avatarFrames/grove-butterfly-greenkey-spritesheet.png` | 5.3 MB | Imported by `CosmeticFx.js` | Both | Should be lazy by equipped frame | Dynamic import and compress. |
| `client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-spritesheet.png` | 5.2 MB | Imported by `CosmeticFx.js` | Both | Should be lazy by equipped frame | Dynamic import and compress. |
| `client/public/assets/trending/rank_1_crown.webp` | 2.9 MB | `TrendingPage.js` podium/rank art | Mostly Trending | Above fold on Trending | Create smaller mobile and desktop variants. |
| `client/public/assets/trending/rank_3_bronze.webp` | 2.8 MB | `TrendingPage.js` podium/rank art | Mostly Trending | Above fold on Trending | Resize/compress; lazy outside first viewport. |
| `client/public/assets/trending/rank_2_silver.webp` | 2.8 MB | `TrendingPage.js` podium/rank art | Mostly Trending | Above fold on Trending | Resize/compress; lazy outside first viewport. |
| `client/public/assets/trending/podium_base.webp` | 2.6 MB | `TrendingPage.js` mobile podium | Mobile Trending | Above fold candidate | Produce a smaller mobile podium image. |
| `client/public/assets/mobile/mobile-hero-banner.png` | 1.9 MB | `Home.js` mobile hero | Mobile | Above fold | Convert to WebP/AVIF and resize to actual mobile display width. |
| `client/public/assets/mobile/forest-page-bg.png` | 1.9 MB | Mobile page background | Mobile | Initial mobile candidate | Use compressed WebP/AVIF and consider CSS gradient fallback. |
| `client/src/assets/forest-page-bg.png` | 1.9 MB | Imported background copy | Both/unknown | Depends on usage | Remove duplicate if unused or convert to smaller format. |
| `client/public/assets/mobile/mobile-navbar-bg.png` | 1.6 MB | Mobile top/bottom navbar backgrounds | Mobile | Initial mobile | Create a narrow cropped navbar-specific WebP. |
| `client/src/assets/mobile-navbar-bg.png` | 1.6 MB | Imported navbar background copy | Both/unknown | Depends on usage | Remove duplicate if unused or convert. |
| `client/public/assets/kil.png` | 2.7 MB | No source usage found by scan | Unknown | Likely removable/lazy | Confirm if unused; remove from deploy if not referenced. |
| `client/public/assets/kal.png` | 2.4 MB | No source usage found by scan | Unknown | Likely removable/lazy | Confirm if unused; remove from deploy if not referenced. |
| `client/public/assets/speed.png` | 2.1 MB | `Shop.js` earn panel image | Shop | Route-only but route not split | Compress and lazy-load with Shop route. |
| `client/public/assets/blow.png` | 2.2 MB | `Shop.js` earn panel image | Shop | Route-only but route not split | Compress and lazy-load with Shop route. |
| `client/public/guidebook/desktop-source/*.png` | 2.3 MB each | Source images; app appears to use WebP guidebook files | Not runtime if unused | Should not ship if unnecessary | Keep outside public deploy or archive elsewhere. |
| `client/public/emoji/noto/svg` | ~31 MB total, 3731 files | Emoji picker SVG assets | Both when requested | On-demand only | Keep lazy/on-demand; avoid preloading or importing the whole set. |

## CSS Effects Findings

| File path | Selector/component | Effect | Desktop/Mobile/Both | Risk | Safer replacement idea |
|---|---|---|---|---|---|
| `client/src/AppStyle.css` | `.mobile-compose-backdrop` | Full-screen fixed overlay with backdrop blur | Mobile | High | Use darker solid overlay; reduce blur to 0-2px. |
| `client/src/AppStyle.css` | `.mobile-guest-auth-prompt` | Full-screen fixed overlay with `backdrop-filter: blur(12px)` | Mobile | High | Replace with opaque forest gradient overlay. |
| `client/src/AppStyle.css` | `.mobile-home-seo-intro` | Glass card with `backdrop-filter: blur(10px)` | Mobile | Medium | Use solid rgba background and light border. |
| `client/src/AppStyle.css` | `.composer-emoji-popover` | `backdrop-filter: blur(14px)` | Both/modal | Medium | Use solid dark panel; keep shadow lighter. |
| `client/src/AppStyle.css` | `.cw-emoji-search-wrap`, `.cw-emoji-category-tabs` | Sticky glass + blur on desktop; mobile override exists | Both | Medium | Keep mobile static; reduce desktop blur. |
| `client/src/AppStyle.css` | `.nav-firefly`, `.page-firefly` | Repeated glow box-shadows on animated elements | Both | Medium | Reduce count on mobile; pause offscreen. |
| `client/src/AppStyle.css` | `.mobile-home-bottom-nav`, Confess button | Large shadows/glow animation | Mobile | Low/Medium | Keep design, but disable pulse under reduced motion. |
| `client/src/pages/Settings.js` | inline decorative blobs | `filter: blur(70px)` and glass cards | Both/settings | High | Pre-render glow assets or reduce blur radius. |
| `client/src/pages/UserProfile.js` | inline decorative blobs/cards | `blur(70px/80px)`, backdrop blur 10-18px | Both/profile | High | Reduce to gradients without CSS blur. |
| `client/src/pages/WeeklyEventsPage.js` | decorative background blobs | `filter: blur(72px/86px)` | Both/weekly | High | Static background image or lower-radius radial gradient. |
| `client/src/pages/ConfessionPage.js` | compose/comment panels | backdrop blur 10-18px | Both/single post | Medium | Solid translucent backgrounds on mobile. |
| `client/src/pages/Shop.css` | modal backdrops/cards | blur 10-12px and large shadows | Both/shop | Medium | Mobile already reduced; route split first. |
| `client/src/styles/cosmetic-animations.css` | cosmetic layers | many drop-shadows/glows | Both | Medium/High | Only mount active equipped effects; pause offscreen. |
| `client/src/AppStyle.css` | Trending mobile cards/podium | large background images + shadows + blur halos | Mobile | High | Smaller art and simpler shadows on mobile. |

## Animation Findings

| File path | Component/selector | Animation type | Always-running or visibility-aware | Risk | Recommendation |
|---|---|---|---|---|---|
| `client/src/AppStyle.css` | `.nav-firefly-*` | Infinite transform/opacity/glow | Always while nav rendered | Medium | Reduce count on mobile and respect reduced motion. |
| `client/src/AppStyle.css` | `.page-firefly-*` | Fixed full-page fireflies | Always while rendered | Medium | Pause when hidden/offscreen; remove on low-power mobile. |
| `client/src/pages/Home.js` | Home side sprite hover hit testing | Mousemove canvas pixel reads | Runs on desktop mouse movement | High | Cache hit masks or replace with simpler hit regions. |
| `client/src/components/SplitBouquetHero.css` | `.split-bouquet-shell` | Infinite float | Always while hero mounted | Low/Medium | Pause if offscreen; reduced motion already present. |
| `client/src/pages/Shop.css` | `.shop-earn-item` | Sheen animation | Mostly shop; mobile disabled | Medium | Keep disabled on mobile; lazy-load Shop. |
| `client/src/styles/cosmetic-animations.css` | avatar frame sprite animations | Large sprite `steps(1)` animations | Always when mounted | High | Mount only visible/equipped cosmetics; IntersectionObserver pause. |
| `client/src/styles/cosmetic-animations.css` | badge/post theme effects | Infinite glow/rotation/particles | When cosmetic shown | Medium/High | Reduced-motion and offscreen pause. |
| `client/src/components/MobileRealmSwipeNav.js` + CSS | mobile realm arrows | Timed fade/arrow animation | Route/mobile only | Low | Current behavior acceptable. |
| `client/src/components/MobileBottomNav.js` | scroll hide/show | rAF-throttled scroll listener | Mobile only | Low | Already reasonable; keep rAF. |
| `client/src/App.js` | notification/active intervals | Polling every 25-30s | Always while app active | Low/Medium | Pause polling when `document.hidden`; rely more on socket. |
| `client/src/components/ForestEventBanner.js` | event countdown interval | Timer loop | While banner mounted | Low | Clear when hidden/offscreen if needed. |
| `client/src/pages/Shop.js` | `setInterval` for `now` | Timer loop | While Shop mounted | Low | Route splitting is higher impact. |

## Lazy Loading Findings

- `React.lazy` / `Suspense` are not used for route-level pages in `client/src/App.js`.
- `client/src/reportWebVitals.js` uses dynamic import, but this does not help app UI startup.
- `client/src/App.js` directly imports many heavy pages/components:
  - `Home`
  - `ConfessionPage`
  - `Settings`
  - `UserProfile`
  - `ThrivingGrove`
  - `ScorchedLands`
  - `BuddingLand`
  - `TrendingPage`
  - `SearchPage`
  - `ActivityPage`
  - `FriendsPage`
  - `ChessPage`
  - `Shop`
  - `BuySeeds`
  - `TitleAchievements`
  - `AdminDashboard`
  - Reena pages
  - `GuidebookPopup`
- Good candidates for `React.lazy`:
  - Admin pages
  - Shop/Buy Seeds
  - Chess
  - Reena pages
  - Settings/UserProfile
  - Guidebook popup
  - Single confession page
  - Trending page
  - Activity/Friends/Search pages
- `client/src/components/CosmeticFx.js` statically imports very large cosmetic spritesheets. This should be converted to dynamic imports or CSS URLs loaded only for active cosmetics.
- `client/src/data/emojiGroups.js` is about 55 KB. It is not the largest issue, but the emoji picker should continue loading/rendering only when opened.
- Guidebook runtime image loading is already mostly lazy, but the Guidebook component itself is still imported eagerly.

## Fixed/Transparent Layer Findings

- `client/src/pages/Home.js`: `HomeBackgroundVideo` renders a fixed full-screen video and overlay. Covers the viewport on Home.
- `client/src/pages/Home.js`: Krishna/Demon side sprite layers use high z-index and global hover/click logic.
- `client/src/components/SplitBouquetHero.css`: split bouquet hero adds an absolute hero layer with pointer event handling.
- `client/src/AppStyle.css`: mobile top navbar is sticky with high z-index and image background.
- `client/src/AppStyle.css`: mobile bottom nav is fixed with high z-index and visible outside normal page flow.
- `client/src/AppStyle.css`: mobile compose modal uses fixed high-z overlay above the bottom nav.
- `client/src/AppStyle.css`: settings modal overlay uses very high z-index and full-screen backdrop.
- `client/src/components/MobileRealmSwipeNav.js`: fixed swipe arrows overlay the mobile viewport with `pointer-events: none` except buttons.
- `client/src/AppStyle.css`: `.page-firefly` elements are fixed screen layers with glow shadows.
- `client/src/App.js`: desktop navbar/footer use forest image backgrounds and shadows/filters.

## Browser/GPU Smoothness Risks

- `Home.js` mousemove canvas alpha hit testing can force expensive CPU/GPU readback.
- Large `filter: blur(70px+)` effects in Settings, UserProfile, and WeeklyEvents are expensive, especially on integrated GPUs and mobile.
- Large fixed backgrounds with videos/images and translucent overlays increase paint/compositing cost.
- Global decorative fireflies and cosmetic animations can continue when not visible.
- Many shadows/glows/drop-shadows are layered over cards, navs, and sprites.
- `transition: all` appears on some image/sprite elements; transitions should be narrowed to `transform`, `opacity`, or `filter`.
- Huge sprite-sheet PNGs may consume substantial memory even before animation cost is considered.
- Route pages are eagerly imported, so users pay parsing/evaluation cost for pages they may never visit.

## Safe Patch Plan

### Phase 1: No Visual Design Change, Pure Performance Cleanup

1. Remove the duplicate `AppStyle.css` import after verifying cascade behavior.
2. Add route-level `React.lazy` / `Suspense` for non-home routes and rarely used pages.
3. Lazy-load `GuidebookPopup` only when opened.
4. Narrow `transition: all` rules to specific properties.
5. Add `document.hidden` checks to notification/activity polling intervals.
6. Replace Home side-sprite per-mousemove canvas reads with cached hit data or throttled hit testing.

### Phase 2: Mobile-Only Lighter Effects

1. Replace mobile full-screen backdrop blurs with solid dark forest overlays.
2. Reduce mobile card/modal shadow radius where repeated in feeds.
3. Keep mobile bottom nav visual design, but add reduced-motion handling for Confess glow.
4. Reduce or disable page fireflies on low-width mobile screens.
5. Keep emoji picker lazy rendering and no-swipe protections intact.

### Phase 3: Desktop Heavier Optimizations

1. Refactor Home Krishna/Demon hover/click hit testing.
2. Pause SplitBouquetHero animation when offscreen.
3. Reduce large decorative blur blobs on Settings/Profile/Weekly pages.
4. Review desktop Trending art loading after route splitting.

### Phase 4: Image Compression/Lazy Loading

1. Convert mobile hero/navbar/background PNGs to WebP/AVIF with mobile-sized dimensions.
2. Compress Trending podium/rank/skin assets and create smaller mobile variants.
3. Convert huge cosmetic spritesheets to compressed formats or alternative animation assets.
4. Remove or move unused public source PNGs from deploy output after confirming they are not referenced.
5. Keep decorative offscreen images lazy; keep true above-the-fold images eager.

### Phase 5: Optional Deeper Refactor

1. Build a cosmetic asset manifest that dynamically loads only equipped cosmetic assets.
2. Use IntersectionObserver to pause animated cosmetics in feed cards outside the viewport.
3. Consider feed/comment virtualization if long lists remain janky after asset and animation cleanup.
4. Add a lightweight performance budget check for large assets and initial JS chunks.
5. Add a reduced-effects mode for lower-end mobile devices.
