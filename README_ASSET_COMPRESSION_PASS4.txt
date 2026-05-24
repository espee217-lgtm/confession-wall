# Asset Compression Pass 4

This patch replaces large image/video assets in-place with compressed versions.

It contains only changed asset files, not the full project.

No code files are changed.
No imports/routes/CSS/JS logic are changed.
No npm install is required.

Important safety rule used:
- PNG filenames and paths are unchanged.
- PNG dimensions are unchanged.
- Active spritesheet dimensions are unchanged, so animation grid mechanics should remain intact.
- The MP4 keeps the same path/name and 1280x720 resolution, but is re-encoded smaller.

After applying, test:
- /
- /shop
- /settings
- /login
- /register
- /buy-seeds
- Reena pages, if used

Then run:
cd client
npm run build
