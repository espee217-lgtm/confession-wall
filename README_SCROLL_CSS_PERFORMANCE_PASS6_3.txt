Pass 6.3 - Mobile CSS scroll performance safeguards

This patch is CSS-only. It does not change layout structure, React logic, backend, auth, payments, shop logic, routes, or assets.

Main idea:
- On small screens, reduce expensive scroll repaint work caused by backdrop-filter, heavy shadows, fixed/animated decoration layers, and hover transforms.
- Keep the visual theme and layout intact.
- Desktop styling remains mostly untouched.

Files changed:
- client/src/AppStyle.css
- client/src/pages/Shop.css
- client/src/pages/ChoicePage.css
- client/src/pages/ReenaPage.css
- client/src/pages/ReenaKundaliPage.css
- client/src/pages/ReenaTriviaPage.css
- client/src/pages/ReenaApologyPage.css

Test pages:
- /
- /trending
- /search
- /shop
- /choose
- /reena
- /reena-kundali
- /reena-trivia
- /reena-apology

No npm install is required.
