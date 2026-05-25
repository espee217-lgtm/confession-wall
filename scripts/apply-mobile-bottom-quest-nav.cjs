const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mobileNavPath = path.join(root, 'client', 'src', 'components', 'MobileBottomNav.js');
const cssPath = path.join(root, 'client', 'src', 'AppStyle.css');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(mobileNavPath)) fail(`Missing ${mobileNavPath}`);
if (!fs.existsSync(cssPath)) fail(`Missing ${cssPath}`);

let nav = fs.readFileSync(mobileNavPath, 'utf8');

if (!nav.includes('DailyQuestDropdown')) {
  const importLine = 'import { useAuth } from "../context/AuthContext";';
  if (!nav.includes(importLine)) fail('Could not find useAuth import in MobileBottomNav.js');
  nav = nav.replace(importLine, `${importLine}\nimport DailyQuestDropdown from "./DailyQuestDropdown";`);
}

if (!nav.includes('mobile-bottom-quest-slot')) {
  const confessButtonStart = '      <button type="button" onClick={goConfess} className="confess">';
  if (!nav.includes(confessButtonStart)) fail('Could not find auth Confess button insertion point in MobileBottomNav.js');
  nav = nav.replace(
    confessButtonStart,
    `      <div className="mobile-bottom-quest-slot">\n        <DailyQuestDropdown variant="bottom" />\n        <span className="mobile-bottom-quest-label">Daily</span>\n      </div>\n\n${confessButtonStart}`
  );
}

fs.writeFileSync(mobileNavPath, nav, 'utf8');
console.log('Updated client/src/components/MobileBottomNav.js');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* === Mobile bottom quest nav cleanup patch === */';
const cssBlock = `

${marker}
@media (max-width: 720px) {
  /* Keep Shop only in the bottom nav on mobile. Desktop navbar is unchanged. */
  .navbar .nav-shop-btn {
    display: none !important;
  }

  /* The Daily Quest notebook/dropdown was moved into the bottom nav on mobile. */
  body.mobile-home-page .mobile-home-top-tools {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .mobile-home-bottom-nav.mobile-home-bottom-nav--auth {
    grid-template-columns: 1fr 1fr 1.16fr 1fr 1fr !important;
    gap: 4px !important;
    padding: 9px 8px !important;
  }

  .mobile-bottom-quest-slot {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 44px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: rgba(244, 255, 230, 0.74);
    font-family: Georgia, serif;
    line-height: 1.1;
  }

  .mobile-bottom-quest-label {
    display: block;
    margin-top: 0;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.1;
    color: inherit;
    white-space: nowrap;
  }

  .mobile-bottom-quest-slot .quest-drop-wrap,
  .mobile-bottom-quest-slot .quest-drop-wrap--bottom {
    position: static !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
  }

  .mobile-bottom-quest-slot .quest-drop-button,
  .mobile-bottom-quest-slot .quest-drop-button--bottom {
    width: 28px !important;
    min-width: 28px !important;
    height: 28px !important;
    min-height: 28px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: inherit !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transform: none !important;
  }

  .mobile-bottom-quest-slot .quest-drop-button:hover,
  .mobile-bottom-quest-slot .quest-drop-button:focus-visible,
  .mobile-bottom-quest-slot .quest-drop-button.is-done {
    background: rgba(190, 255, 120, 0.08) !important;
    color: #bfff76 !important;
    box-shadow: 0 0 12px rgba(180, 255, 100, 0.18) !important;
  }

  .mobile-bottom-quest-slot .quest-drop-button-icon {
    width: 24px !important;
    height: 24px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .mobile-bottom-quest-slot .quest-drop-button-icon svg,
  .mobile-bottom-quest-slot .quest-drop-button svg {
    width: 22px !important;
    height: 22px !important;
  }

  .mobile-bottom-quest-slot .quest-drop-button-text,
  .mobile-bottom-quest-slot .quest-drop-badge {
    display: none !important;
  }

  .quest-drop-panel--bottom {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    bottom: 88px !important;
    top: auto !important;
    width: auto !important;
    max-height: min(430px, calc(100vh - 122px)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    border-radius: 20px !important;
    z-index: 5200 !important;
  }
}

@media (max-width: 360px) {
  .mobile-home-bottom-nav.mobile-home-bottom-nav--auth {
    left: 8px;
    right: 8px;
    gap: 2px !important;
    padding-inline: 6px !important;
  }

  .mobile-bottom-quest-label,
  .mobile-home-bottom-nav button span {
    font-size: 8px !important;
  }
}
`;

if (!css.includes(marker)) {
  css = css.trimEnd() + cssBlock;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Updated client/src/AppStyle.css');
} else {
  console.log('client/src/AppStyle.css already contains mobile bottom quest nav cleanup patch');
}

console.log('Mobile bottom nav quest/shop cleanup applied successfully.');
