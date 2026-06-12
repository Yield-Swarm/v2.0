// Check ALL routes exported from routes/
const fs = require('fs');
const files = fs.readdirSync('./routes').filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
for (const f of files) {
  try {
    const r = require('./routes/' + f);
    const t = typeof r;
    if (t === 'object' && r !== null && !Array.isArray(r)) {
      const keys = Object.keys(r).join(',');
      console.log(f + ': OBJECT {' + keys + '}');
    }
  } catch(e) {
    console.log(f + ': ERROR ' + e.message.split('\n')[0]);
  }
}