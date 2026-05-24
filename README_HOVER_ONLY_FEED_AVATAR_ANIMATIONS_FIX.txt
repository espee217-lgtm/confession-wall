Pass 7.1 Fix - Hover-only feed avatar/frame animations

This patch replaces the earlier broken PowerShell script.
It updates:
- client/src/components/FramedAvatar.js
- client/src/components/PostCard.js
- client/src/styles/cosmetic-animations.css

Effect:
- Feed post avatar/frame animations are paused by default.
- They run when the post card/avatar is hovered, focused, or active.
- Shop/settings/profile previews stay normal unless they explicitly opt into hover mode.

No assets, backend, payments, auth, routes, database, or layout files are changed.
