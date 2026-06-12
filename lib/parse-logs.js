const fs = require('fs');
const f = '/opt/polsia/workspaces/company-122611/agent-30/exec-3536062/yieldswarm/projects/-opt-polsia-workspaces-company-122611-agent-30-exec-3536062-yieldswarm/2fafd084-7f07-46f0-a383-cd2dacd44bc0/tool-results/mcp-polsia_infra-get_logs-1780414339674.txt';
const outer = JSON.parse(fs.readFileSync(f));
const inner = JSON.parse(outer.text);
const logs = inner.logs || [];
console.error('Log count:', logs.length);

// Count error-like messages
const errorMsgs = [];
const seedMsgs = [];
const allMsgs = {};
for (const log of logs) {
  const m = (log.message || '').slice(0, 200);
  allMsgs[m] = (allMsgs[m] || 0) + 1;
  if (/error|fail|Error|FAIL|seeder|108|AGENTS/i.test(m)) {
    errorMsgs.push(log.timestamp + ' ' + m);
  }
  if (/seed|seeder|cron.*registry/i.test(m)) {
    seedMsgs.push(log.timestamp + ' ' + m);
  }
}
const sorted = Object.entries(allMsgs).sort((a,b) => b[1]-a[1]);
console.error('Top 20 messages:');
sorted.slice(0,20).forEach(([m,c]) => console.error(c + 'x: ' + m.slice(0,150)));
if (seedMsgs.length) {
  console.error('\n=== SEEDER MESSAGES ===');
  seedMsgs.forEach(m => console.error(m));
}
if (errorMsgs.length) {
  console.error('\n=== ERROR MESSAGES ===');
  errorMsgs.forEach(m => console.error(m));
}