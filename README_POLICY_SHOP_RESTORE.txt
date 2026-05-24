Confession Wall patch: restore hidden legal/policy links and add Shop access from auth screens.

This zip contains only changed files, not the full project.

Files overwritten:
- client/src/App.js
- client/src/pages/AuthFlowerPortal.js
- client/src/pages/BuySeeds.js
- client/src/pages/BuySeeds.css

What changed:
- Reconnected existing policy pages in App.js:
  - /refund-cancellation
  - /moderation-report-policy
  - /contact-support
- Added footer links:
  - Refunds
  - Moderation
  - Contact
- Added SEO entries for the restored pages.
- Added "Preview Shop" link on Login and Register auth panels.
- Added compact legal/payment support links to Buy Seeds page.

What was NOT changed:
- No backend files.
- No payment logic.
- No seed logic.
- No shop purchase logic.
- No admin dashboard.
- No cosmetic assets.
- No Ice Monarch files.

npm install:
- Not needed.
