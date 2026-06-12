const fs = require('fs');
const h = fs.readFileSync('views/admin-email-routing.ejs', 'utf8');
const need = ['<html', '</html>', '<body', '</body>'];
const missing = need.filter(t => !h.includes(t));
if (missing.length) {
  console.error('FAIL: missing required tags: ' + missing.join(', '));
  process.exit(1);
}
console.log('PASS: admin-email-routing.ejs has all required HTML tags');