Confession Wall - Pass 6.1 Scroll Background Smoothness Patch

This patch optimizes the main search/trending/activity background rendering without changing layout or mechanics.

Files changed/added:
- client/src/AppStyle.css
- client/src/assets/forest-page-bg.webp
- client/src/assets/forest-page-bg-mobile.webp
- client/src/assets/mobile-navbar-bg.webp
- client/src/assets/mobile-navbar-bg-mobile.webp

What changed:
- Search/Trending/Activity shells now use WebP backgrounds with PNG fallback via CSS image-set().
- Mobile uses lighter mobile-sized WebP backgrounds.
- The heavy forest page background no longer uses background-attachment: fixed on scroll-heavy shells.
- The search/activity decorative overlay was changed from fixed to absolute to reduce scroll repaint cost.
- Mobile navbar background now uses a smaller WebP version with PNG fallback.

What did NOT change:
- No backend changes.
- No auth/payment/shop logic changes.
- No routes changed.
- No page layout intentionally changed.
- No cosmetic spritesheet changes.
- No npm install required.
