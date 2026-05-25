const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'client', 'src', 'App.js');
const appStylePath = path.join(root, 'client', 'src', 'AppStyle.css');
const mobileNavPath = path.join(root, 'client', 'src', 'components', 'MobileBottomNav.js');
const guideCssPath = path.join(root, 'client', 'src', 'components', 'GuidebookPopup.css');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${path.relative(root, file).replace(/\\/g, '/')}`);
}

function appendOnce(source, marker, block) {
  if (source.includes(marker)) {
    console.log(`Already present: ${marker}`);
    return source;
  }
  return `${source.trimEnd()}\n\n${block.trim()}\n`;
}

function removeFunctionBlocks(source, functionName) {
  let output = source;
  const signature = `function ${functionName}()`;
  let index = output.indexOf(signature);

  while (index !== -1) {
    const braceStart = output.indexOf('{', index);
    if (braceStart === -1) break;

    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < output.length; i += 1) {
      const ch = output[i];
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }

    if (end === -1) break;
    const before = output.slice(0, index).replace(/[ \t]*\r?\n[ \t]*\r?\n?$/, '\n\n');
    const after = output.slice(end).replace(/^\s*\r?\n/, '\n');
    output = before + after;
    index = output.indexOf(signature);
  }

  return output;
}

function replaceShopButtonsWithGuidebook(source) {
  const shopButtonRegex = /<button\s+type="button"\s+onClick=\{\(\) => navigate\("\/shop"\)\}\s+className=\{isActive\("\/shop"\) \? "active" : ""\}\s*>\s*\{SHOP_ICON\}\s*<span>Shop<\/span>\s*<\/button>/g;

  const replacement = `<button\n          type="button"\n          onClick={openGuidebook}\n          className="mobile-bottom-guidebook-btn"\n          title="Open Guidebook"\n          aria-label="Open Guidebook"\n        >\n          {GUIDEBOOK_ICON}\n          <span>Guide</span>\n        </button>`;

  let count = 0;
  const next = source.replace(shopButtonRegex, () => {
    count += 1;
    return replacement;
  });

  if (count === 0) {
    throw new Error('Could not find the MobileBottomNav Shop button block. The file may have changed.');
  }

  console.log(`Replaced ${count} mobile bottom Shop button(s) with Guidebook.`);
  return next;
}

console.log('Applying mobile bottom Guidebook nav patch...');

// 1) Remove old top-navbar mobile Guidebook launcher if it exists.
let app = read(appPath);
app = removeFunctionBlocks(app, 'MobileGuidebookButton');
app = app.replace(/\s*<MobileGuidebookButton \/>/g, '');
write(appPath, app);

// 2) Replace bottom nav Shop with Guidebook launcher.
let mobileNav = read(mobileNavPath);

if (!mobileNav.includes('const GUIDEBOOK_ICON')) {
  if (mobileNav.includes('const SHOP_ICON')) {
    mobileNav = mobileNav.replace(/const SHOP_ICON = .*?;\r?\n/, (match) => `${match}const GUIDEBOOK_ICON = "📜";\n`);
  } else {
    mobileNav = mobileNav.replace(/const CONFESS_ICON = .*?;\r?\n/, (match) => `const GUIDEBOOK_ICON = "📜";\n${match}`);
  }
}

if (!mobileNav.includes('const openGuidebook = () =>')) {
  const goConfessBlock = /  const goConfess = \(\) => \{[\s\S]*?\n  \};\r?\n/;
  const match = mobileNav.match(goConfessBlock);
  if (!match) throw new Error('Could not find goConfess() block in MobileBottomNav.js');

  const openGuidebook = `\n  const openGuidebook = () => {\n    window.dispatchEvent(\n      new CustomEvent("cw:open-guidebook", {\n        detail: { mode: "manual", source: "mobile-bottom-nav" },\n      })\n    );\n  };\n`;
  mobileNav = mobileNav.replace(goConfessBlock, `${match[0]}${openGuidebook}`);
}

// If this patch was already run, do not duplicate.
if (!mobileNav.includes('mobile-bottom-guidebook-btn')) {
  mobileNav = replaceShopButtonsWithGuidebook(mobileNav);
} else {
  console.log('Mobile bottom Guidebook button already present.');
}

write(mobileNavPath, mobileNav);

// 3) CSS: keep top Shop visible on mobile, hide old top Guidebook launcher if old CSS remains,
// and let the bottom Guidebook button fit the existing bottom nav style.
let appStyle = read(appStylePath);
const cssPatch = `
/* === Mobile bottom Guidebook nav patch === */
@media (max-width: 720px) {
  .navbar .nav-shop-btn {
    display: inline-flex !important;
  }

  .navbar .nav-guidebook-mobile-btn {
    display: none !important;
  }

  .mobile-home-bottom-nav .mobile-bottom-guidebook-btn {
    position: relative;
  }

  .mobile-home-bottom-nav .mobile-bottom-guidebook-btn span {
    white-space: nowrap;
  }
}
`;
appStyle = appendOnce(appStyle, '=== Mobile bottom Guidebook nav patch ===', cssPatch);
write(appStylePath, appStyle);

// 4) Ensure the Guidebook has mobile compact CSS available if the earlier mobile popup patch was not kept.
if (fs.existsSync(guideCssPath)) {
  let guideCss = read(guideCssPath);
  const compactPatch = `
/* === Mobile compact Guidebook safety patch === */
@media (max-width: 720px) {
  .cw-guidebook-backdrop {
    display: flex !important;
    align-items: stretch !important;
    justify-content: center !important;
    padding: 8px !important;
    background: rgba(0, 7, 3, 0.84) !important;
  }

  .cw-guidebook {
    width: min(100%, 430px) !important;
    max-height: calc(100dvh - 16px) !important;
    border-radius: 18px !important;
  }

  .cw-guidebook-header {
    padding: 14px 14px 12px !important;
    gap: 10px !important;
    align-items: flex-start !important;
  }

  .cw-guidebook-header h2 {
    font-size: clamp(19px, 7vw, 28px) !important;
    line-height: 1.05 !important;
    letter-spacing: 0.06em !important;
  }

  .cw-guidebook-close {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 24px !important;
    line-height: 1 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .cw-guidebook-body {
    grid-template-columns: 1fr !important;
  }

  .cw-guidebook-tabs {
    display: flex !important;
    gap: 8px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    padding: 10px 12px !important;
    border-right: 0 !important;
    border-bottom: 1px solid rgba(180, 255, 120, 0.14) !important;
    scrollbar-width: thin;
  }

  .cw-guidebook-tab {
    width: auto !important;
    flex: 0 0 auto !important;
    margin: 0 !important;
    padding: 9px 11px !important;
    border-radius: 999px !important;
    font-size: 10px !important;
    letter-spacing: 0.08em !important;
    white-space: nowrap !important;
  }

  .cw-guidebook-page {
    padding: 14px !important;
  }

  .cw-guidebook-copy h3 {
    font-size: clamp(21px, 7vw, 30px) !important;
    line-height: 1.12 !important;
  }

  .cw-guidebook-summary {
    font-size: 14px !important;
    line-height: 1.48 !important;
  }

  .cw-guidebook-points,
  .cw-guidebook-media-grid,
  .cw-guidebook-step-grid {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .cw-guidebook-shot {
    min-height: 90px !important;
  }

  .cw-guidebook-shot img {
    max-height: 240px !important;
    object-fit: contain !important;
  }
}
`;
  guideCss = appendOnce(guideCss, '=== Mobile compact Guidebook safety patch ===', compactPatch);
  write(guideCssPath, guideCss);
} else {
  console.log('GuidebookPopup.css not found; skipped compact mobile guide CSS.');
}

console.log('Mobile bottom Guidebook nav patch applied successfully.');
