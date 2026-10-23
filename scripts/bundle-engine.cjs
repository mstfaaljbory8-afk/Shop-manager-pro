const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'extracted_app', 'shop-manager');
const publicDir = path.join(__dirname, '..', 'public', 'shop-engine');
const srcDir = path.join(__dirname, '..', 'src');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Copy style.css to src/shop.css
const cssSrc = path.join(root, 'css', 'style.css');
if (fs.existsSync(cssSrc)) {
  let css = fs.readFileSync(cssSrc, 'utf8');
  css = css.replace(/font-family: Tahoma[^;]+;/, "font-family: 'Cairo', system-ui, -apple-system, sans-serif;");
  fs.writeFileSync(path.join(srcDir, 'shop.css'), css);
  console.log('shop.css generated');
}

// 2. Read index.html scripts in order
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>\n?/g)].map(m => m[1]);

console.log(`Bundling ${scripts.length} scripts in exact order...`);
const scriptContents = scripts.map(f => {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    throw new Error(`Script file missing: ${p}`);
  }
  return `/* --- File: ${f} --- */\n` + fs.readFileSync(p, 'utf8');
});

const bundled = scriptContents.join('\n\n');
const outJs = path.join(publicDir, 'shop-engine.js');
fs.writeFileSync(outJs, bundled);
console.log(`shop-engine.js written successfully: ${Math.round(bundled.length / 1024)} KB`);
