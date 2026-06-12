const fs = require('fs');
const path = require('path');

function __rtr(p) {
  const m = require(path.join(__dirname, p));
  return (m && m.router) ? m.router : m;
}

const src = fs.readFileSync(path.join(__dirname, 'routes/index.js'), 'utf8');
// Match __rtr('./foo') or __rtr("./foo")
const re = /__rtr\uedc5''\uedc5''\uedc5''\\['"]([^'")]+)['"]/g;
let match;
const seen = new Set();
const results = [];

while ((match = re.exec(src)) !== null) {
  const route = match[1];
  if (seen.has(route)) continue;
  seen.add(route);
  try {
    const result = __rtr(route);
    if (!result || typeof result.use !== 'function') {
      results.push('FAIL: ' + route + ' => ' + (typeof result) + ' (not a router)');
    } else {
      results.push('OK:   ' + route);
    }
  } catch(e) {
    results.push('ERR:  ' + route + ' => ' + e.message.split('\n')[0]);
  }
}

results.sort().forEach(r => console.log(r));
console.log('---');
console.log('Checked ' + seen.size + ' routes');