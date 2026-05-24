# Confession Wall Cleanup Pass 2

This patch is a cautious cleanup for unused/duplicate cosmetic helper files.

It does not change app logic, routes, payments, backend, auth, shop purchase logic, mobile layout, desktop layout, or active cosmetic imports.

## Files overwritten by extraction

- `client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_metadata.json`
- `scripts/cleanup-pass2-cosmetic-unused.ps1`
- `README_CLEANUP_PASS2.txt`

## Files/folders removed when you run the script

- `client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-frame.css`
- `client/src/assets/avatarFrames/grove-butterfly-greenkey-frame.css`
- `client/src/assets/avatarFrames/storm-hoodie-greenkey-frame.css`
- `client/src/assets/avatarFrames/venom-screen-record-frame.css`
- `client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_horizontal.png`
- `client/src/assets/cosmetics/ice-monarch-frame/transparent_frames/`

## Why these are safe cleanup candidates

The active cosmetic runtime uses `client/src/components/CosmeticFx.js` and `client/src/styles/cosmetic-animations.css`.

The active spritesheets are still kept:

- `client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-spritesheet.png`
- `client/src/assets/avatarFrames/grove-butterfly-greenkey-spritesheet.png`
- `client/src/assets/avatarFrames/storm-hoodie-greenkey-spritesheet.png`
- `client/src/assets/avatarFrames/venom-screen-record-spritesheet.png`
- `client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_7x7.png`
- `client/src/assets/cosmetics/ice-monarch-frame/ice_monarch_avatar_frame_spritesheet_72f_8x9.png`

No npm install is needed.
