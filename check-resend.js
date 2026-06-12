const fs = require('fs');
const routes = ['invest.js', 'chain-manifest.js', 'user-dashboard.js', 'divine-product-forge.js', 'master-files.js'];
for (const f of routes) {
  const lines = fs.readFileSync('routes/' + f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('const') && l.includes('require') && l.includes('resend')) {
      // Check context: is it inside a function?
      // Find previous non-empty, non-comment line
      let inFunc = false;
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j].trim();
        if (prev.startsWith('//')) continue;
        if (prev.endsWith('{')) { inFunc = true; break; }
        if (prev === '}' || prev === ');') break;
      }
      console.log(f + ':' + (i+1) + ' ' + (inFunc ? '(IN FN)' : '(TOP-LEVEL)') + ': ' + l);
    }
  }
}