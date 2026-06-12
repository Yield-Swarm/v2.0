const fs = require('fs');
const path = require('path');
const dir = './migrations';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
for (const f of files) {
  try {
    const m = require(path.join(process.cwd(), dir, f));
    if (typeof m.up !== 'function') {
      console.log('BAD (no up fn):', f);
    }
  } catch(e) {
    console.log('ERROR:', f, '-', e.message);
  }
}
console.log('Total .js migrations:', files.length);
