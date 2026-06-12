const fs = require('fs');
const content = fs.readFileSync('services/kairos-conductor.js', 'utf8');
const lines = content.split('\n');
let found = false;
for(let i=0;i<lines.length;i++) {
  const l = lines[i];
  for(let c=0;c<l.length;c++) {
    const code = l.charCodeAt(c);
    const bad = code > 127 || (code < 32 && code \!== 9 && code \!== 10 && code \!== 13);
    if(bad) {
      console.log('Line ' + (i+1) + ' col ' + (c+1) + ' code ' + code + ' char ' + JSON.stringify(l[c]));
      found = true;
    }
  }
}
if(\!found) console.log('NO NON-ASCII FOUND - all clean');
