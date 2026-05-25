# Mobile Bottom Guidebook Nav Patch

This patch keeps the top mobile Shop icon, removes the extra top Guidebook launcher if it exists, and replaces the bottom-nav Shop shortcut with a Guidebook scroll button.

Mobile result:
- Top navbar keeps Shop + Seed counter.
- Bottom nav becomes Guide | Daily | Confess | Activity | Profile.
- Tapping Guide opens the existing Guidebook popup.
- Desktop navbar is unchanged.

Files updated by the script:
- client/src/App.js
- client/src/components/MobileBottomNav.js
- client/src/AppStyle.css
- client/src/components/GuidebookPopup.css, only for mobile compact safety CSS if present

No npm install is needed.
