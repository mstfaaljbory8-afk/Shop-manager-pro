// يدمج المجلد كله في ملف HTML واحد: node build.js
// الناتج: dist/shop-manager.html
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => {
  return '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8').trim() + '\n</style>';
});

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>\n?/g)].map((m) => m[1]);
const code = scripts.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
if (code.includes('</script>')) throw new Error('الكود يحتوي </script> ولا يمكن تضمينه');

html = html.replace(/<script src="[^"]+"><\/script>\n?/g, '');
html = html.replace('</body>', '<script>\n' + code + '</script>\n</body>');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'shop-manager.html');
fs.writeFileSync(out, html);
console.log('تم البناء:', out, '(' + Math.round(html.length / 1024) + ' KB، ' + scripts.length + ' ملف JS)');
