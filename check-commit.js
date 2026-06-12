const https = require('https');
const url = 'https://api.github.com/repos/Polsia-Inc/yieldswarm/commits/d7dec36b5c4bc37185999d7437d778204bc38915';
https.get(url, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'yieldswarm-check' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('Commit exists:', j.sha ? 'YES' : 'NO');
      if (j.sha) console.log('Message:', j.commit.message.split('\n')[0]);
    } catch(e) {
      console.log('Parse error:', data.slice(0, 200));
    }
  });
}).on('error', e => console.error('Network error:', e.message));