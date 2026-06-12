const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('./migrations').filter(function(f) { return f.endsWith('.js'); }).sort();
files.forEach(function(f) {
  const m = require(path.join(process.cwd(), 'migrations', f));
  const name = m.name || f.replace('.js', '');
  console.log(f + ' => name: ' + name + ' | has .up: ' + (typeof m.up === 'function'));
});
