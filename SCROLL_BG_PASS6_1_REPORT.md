# Scroll Background Optimization Pass 6.1 Report

## Goal
Improve scroll smoothness on scroll-heavy pages such as Trending/Search/Activity without changing layout.

## Main risk found
`client/src/AppStyle.css` used `forest-page-bg.png` with `background-attachment: fixed` on `.search-page-shell` and `.activity-page-shell`. Fixed large backgrounds can cause heavier repaint work during scroll.

## Added assets
| File | Purpose |
|---|---|
| `client/src/assets/forest-page-bg.webp` | Desktop WebP replacement for page forest background |
| `client/src/assets/forest-page-bg-mobile.webp` | Lighter mobile WebP background |
| `client/src/assets/mobile-navbar-bg.webp` | Desktop/full-size WebP for mobile navbar art |
| `client/src/assets/mobile-navbar-bg-mobile.webp` | Lighter mobile navbar WebP |

## Size comparison
| Asset | Old PNG | New WebP |
|---|---:|---:|
| `forest-page-bg` desktop | 1.87 MB | 0.04 MB |
| `forest-page-bg` mobile | 1.87 MB | 0.01 MB |
| `mobile-navbar-bg` desktop | 1.55 MB | 0.05 MB |
| `mobile-navbar-bg` mobile | 1.55 MB | 0.02 MB |

## CSS changes
- `.search-page-shell, .activity-page-shell` now use `image-set()` with WebP first and PNG fallback.
- `fixed no-repeat` was changed to `no-repeat scroll` for the large page background.
- `.search-page-shell::before, .activity-page-shell::before` changed from `position: fixed` to `position: absolute`.
- Mobile background now uses `forest-page-bg-mobile.webp`.
- Mobile navbar backgrounds now use `mobile-navbar-bg-mobile.webp`.

## Test checklist
- `/`
- `/trending`
- `/search`
- `/shop`
- `/login`
- `/register`

Check scrolling on Trending/Search specifically.
