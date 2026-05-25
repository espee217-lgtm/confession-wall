const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'client', 'src', 'App.js');
const appStylePath = path.join(root, 'client', 'src', 'AppStyle.css');
const guideCssPath = path.join(root, 'client', 'src', 'components', 'GuidebookPopup.css');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${path.relative(root, file).replace(/\\/g, '/')}`);
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

    // Remove surrounding blank lines cleanly.
    const before = output.slice(0, index).replace(/[ \t]*\r?\n[ \t]*\r?\n?$/, '\n\n');
    const after = output.slice(end).replace(/^\s*\r?\n/, '\n');
    output = before + after;
    index = output.indexOf(signature);
  }

  return output;
}

function appendOnce(source, marker, css) {
  if (source.includes(marker)) {
    console.log(`Already present: ${marker}`);
    return source;
  }
  return `${source.trimEnd()}\n\n${css.trim()}\n`;
}

console.log('Fixing mobile Guidebook launcher patch...');

let app = read(appPath);

// Remove any broken/partial previous insertion of the mobile launcher function.
app = removeFunctionBlocks(app, 'MobileGuidebookButton');

// Remove duplicate mounts, then add one clean mount beside the normal Shop button.
app = app.replace(/\s*<MobileGuidebookButton \/>/g, '');

const mobileFunction = `
function MobileGuidebookButton() {
  const openGuidebook = () => {
    window.dispatchEvent(
      new CustomEvent("cw:open-guidebook", {
        detail: { mode: "manual", source: "mobile-navbar" },
      })
    );
  };

  return (
    <button
      type="button"
      className="nav-guidebook-mobile-btn"
      onClick={openGuidebook}
      title="Open Guidebook"
      aria-label="Open Guidebook"
    >
      <span aria-hidden="true">📜</span>
    </button>
  );
}

`;

const seedCounterIndex = app.indexOf('function SeedCounter()');
if (seedCounterIndex === -1) {
  throw new Error('Could not find function SeedCounter() in App.js');
}
app = app.slice(0, seedCounterIndex) + mobileFunction + app.slice(seedCounterIndex);

const shopButtonPattern = /<ShopButton \/>/;
if (!shopButtonPattern.test(app)) {
  throw new Error('Could not find <ShopButton /> mount in App.js');
}
app = app.replace(shopButtonPattern, '<ShopButton />\n          <MobileGuidebookButton />');

write(appPath, app);

let appStyle = read(appStylePath);
const appStylePatch = `
/* === Mobile Guidebook launcher patch === */
.nav-guidebook-mobile-btn {
  display: none;
}

@media (max-width: 720px) {
  .navbar .nav-shop-btn {
    display: none !important;
  }

  .navbar .nav-guidebook-mobile-btn {
    width: 42px;
    height: 42px;
    min-width: 42px;
    margin: 0;
    padding: 0;
    border-radius: 999px;
    border: 1px solid rgba(190, 255, 150, 0.4);
    background: radial-gradient(circle at top, rgba(220, 255, 165, 0.2), rgba(5, 25, 8, 0.9));
    color: #eaffc9;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 0 14px rgba(140, 255, 110, 0.2);
    font-size: 18px;
    line-height: 1;
    flex: 0 0 auto;
  }

  .navbar .nav-guidebook-mobile-btn:active {
    transform: scale(0.96);
  }
}
`;
appStyle = appendOnce(appStyle, '=== Mobile Guidebook launcher patch ===', appStylePatch);
write(appStylePath, appStyle);

let guideCss = read(guideCssPath);
const guideCssPatch = `
/* === Mobile compact Guidebook patch === */
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

  .cw-guidebook-kicker,
  .cw-guidebook-eyebrow {
    font-size: 9px !important;
    letter-spacing: 0.18em !important;
  }

  .cw-guidebook-header h2 {
    font-size: clamp(19px, 7vw, 28px) !important;
    line-height: 1.05 !important;
    letter-spacing: 0.06em !important;
  }

  .cw-guidebook-version {
    margin-top: 6px !important;
    padding: 4px 9px !important;
    font-size: 10px !important;
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

  .cw-guidebook-copy {
    margin-bottom: 14px !important;
  }

  .cw-guidebook-copy h3 {
    font-size: clamp(21px, 7vw, 30px) !important;
    line-height: 1.12 !important;
    letter-spacing: 0.05em !important;
  }

  .cw-guidebook-summary {
    font-size: 14px !important;
    line-height: 1.48 !important;
  }

  .cw-guidebook-points {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }

  .cw-guidebook-points li {
    padding: 10px 12px 10px 30px !important;
    border-radius: 14px !important;
    font-size: 13px !important;
  }

  .cw-guidebook-points li::before {
    left: 11px !important;
    top: 10px !important;
  }

  .cw-guidebook-media-grid {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .cw-guidebook-shot {
    min-height: 92px !important;
    border-radius: 15px !important;
  }

  .cw-guidebook-shot img,
  .cw-guidebook-shot--primary img,
  .cw-guidebook-shot--step img {
    max-height: 190px !important;
  }

  .cw-guidebook-step-list {
    gap: 12px !important;
  }

  .cw-guidebook-step {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .cw-guidebook-step h4 {
    font-size: 16px !important;
    line-height: 1.18 !important;
  }

  .cw-guidebook-step p {
    font-size: 13px !important;
    line-height: 1.44 !important;
  }

  .cw-guidebook-step-badge {
    font-size: 9px !important;
    padding: 4px 9px !important;
  }

  .cw-guidebook-step-media,
  .cw-guidebook-step-media--2 {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .cw-guidebook-shot--compact {
    max-width: 100% !important;
    min-height: 80px !important;
    padding: 12px 16px !important;
  }

  .cw-guidebook-shot--compact img {
    max-height: 74px !important;
  }

  .cw-guidebook-footer {
    padding: 10px 12px !important;
    gap: 10px !important;
    align-items: center !important;
    font-size: 11px !important;
  }

  .cw-guidebook-footer span {
    display: none !important;
  }

  .cw-guidebook-footer button {
    width: 100% !important;
    justify-content: center !important;
    padding: 10px 14px !important;
    font-size: 11px !important;
  }
}
`;
guideCss = appendOnce(guideCss, '=== Mobile compact Guidebook patch ===', guideCssPatch);
write(guideCssPath, guideCss);

console.log('Mobile Guidebook launcher fix applied successfully.');
