const fs = require('fs');
const bad = [];
fs.readdirSync('./routes').filter(f => f.endsWith('.js')).forEach(f => {
  try {
    const m = require('./routes/' + f);
    const t = typeof m;
    if (t === 'object' && m !== null && !m.handle) {
      const keys = Object.keys(m).join(',');
      // Objects with router key are fine if destructured
      if (!m.router) bad.push(f + ' keys=[' + keys + ']');
    }
  } catch (e) {
    bad.push(f + ' ERROR: ' + e.message.split('\n')[0]);
  }
});
if (bad.length) console.log('BAD:', bad.join('\n'));
else console.log('All routes OK');