Guidebook Events & Safety tab refinement patch

This patch refines only the desktop Guidebook / Notice Board Events & Safety tab.

Changed files:
- client/src/data/guidebookContent.js
- client/src/components/GuidebookPopup.js
- client/src/components/GuidebookPopup.css

What changed:
- Events & Safety is now step-by-step instead of clumped screenshots.
- Daily Quests, Home event card, full Event page, Report button, and safety note are explained separately.
- Report image gets a compact display variant so the tiny button is not stretched/blurry inside the popup.

Not touched:
- backend
- auth
- payments
- shop logic
- routes
- mobile nav
- guide images
- tutorial trigger logic
- cosmetics

No npm install needed.
