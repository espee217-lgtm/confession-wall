const fs = require('fs');
const path = require('path');

const root = process.cwd();
const homePath = path.join(root, 'client', 'src', 'pages', 'Home.js');
const cssPath = path.join(root, 'client', 'src', 'components', 'GuidebookPopup.css');

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing file: ${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
  console.log(`Updated ${path.relative(root, file).replace(/\\/g, '/')}`);
}

let home = read(homePath);
let changedHome = false;

const clickGuard = `
      // Guidebook is a modal. While it is open, never let the desktop
      // Krishna/Demon spirit raycast capture clicks behind the guide.
      if (document.body.classList.contains("cw-guidebook-open")) return;
      if (e.target?.closest?.(".cw-guidebook-backdrop, .cw-guidebook, .cw-guidebook-launcher")) return;
`;

if (!home.includes('While it is open, never let the desktop')) {
  const target = '    const handleSpiritClick = (e) => {\n      if (e.target.closest(\'[data-ui="true"]\')) return;';
  if (home.includes(target)) {
    home = home.replace(target, `    const handleSpiritClick = (e) => {${clickGuard}      if (e.target.closest('[data-ui="true"]')) return;`);
    changedHome = true;
  } else {
    const fallback = '    const handleSpiritClick = (e) => {';
    if (!home.includes(fallback)) {
      throw new Error('Could not find handleSpiritClick in Home.js. No changes applied.');
    }
    home = home.replace(fallback, `    const handleSpiritClick = (e) => {${clickGuard}`);
    changedHome = true;
  }
}

const moveGuard = `
  if (document.body.classList.contains("cw-guidebook-open")) {
    setLeftHover(false);
    setRightHover(false);
    return;
  }
`;

if (!home.includes('setLeftHover(false);\n    setRightHover(false);')) {
  const target = '    const handleMouseMove = (e) => {\n  setLeftHover(isOpaqueAt(leftImgRef.current, e));';
  if (home.includes(target)) {
    home = home.replace(target, `    const handleMouseMove = (e) => {${moveGuard}  setLeftHover(isOpaqueAt(leftImgRef.current, e));`);
    changedHome = true;
  } else {
    const fallback = '    const handleMouseMove = (e) => {';
    if (home.includes(fallback)) {
      home = home.replace(fallback, `    const handleMouseMove = (e) => {${moveGuard}`);
      changedHome = true;
    }
  }
}

if (changedHome) write(homePath, home);
else console.log('Home.js already contains guidebook click shield guard.');

let css = read(cssPath);
const marker = '/* Guidebook modal click shield safety */';
const safetyCss = `

${marker}
body.cw-guidebook-open {
  overflow: hidden;
}

.cw-guidebook-backdrop {
  z-index: 2147483000 !important;
  pointer-events: auto !important;
  isolation: isolate;
}

.cw-guidebook {
  position: relative;
  z-index: 2147483001 !important;
  pointer-events: auto !important;
}

body.cw-guidebook-open .spirit-hitbox,
body.cw-guidebook-open .left-spirit,
body.cw-guidebook-open .right-spirit,
body.cw-guidebook-open .krishna-sprite,
body.cw-guidebook-open .demon-sprite {
  pointer-events: none !important;
}
`;

if (!css.includes(marker)) {
  css = css.trimEnd() + safetyCss + '\n';
  write(cssPath, css);
} else {
  console.log('GuidebookPopup.css already contains modal click shield safety CSS.');
}

console.log('Guidebook click shield patch applied successfully.');
