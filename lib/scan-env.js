var fs = require('fs');
var path = require('path');
var vars = new Set();
['services','routes'].forEach(function(dir){
  if(fs.existsSync(dir)){
    fs.readdirSync(dir).filter(function(f){return f.endsWith('.js');}).forEach(function(fname){
      try {
        var c = fs.readFileSync(path.join(dir,fname),'utf8');
        var re = /process[.]env[.]([A-Z][A-Z0-9_]{2,30})/g;
        var m;
        while((m = re.exec(c)) !== null) vars.add(m[1]);
      } catch(e){}
    });
  }
});
var inr = ['TREASURY_HYPE','TREASURY_POLYGON','TREASURY_SUI','TREASURY_BASE','TREASURY_MONAD',
  'TREASURY_BTC','TREASURY_ETH','TREASURY_SOL','CLOUDFLARE_TUNNEL_ID','CLOUDFLARE_TUNNEL_TOKEN',
  'ADMIN_SECRET','PERPLEXITY_ACTIVATED','PERPLEXITY_API_KEY','SCRAPER_API_KEY',
  'KIMI50_TOKEN_MINT','KIMI50_ROLL_PRICE_SOL','KIMI50_ROLLS_PER_POOL','KIMI50_POOL_OPEN_SOL',
  'KIMI50_TRADING_CAPITAL_SOL','KIMI50_MAX_TRADE_SOL'];
var miss = [...vars].filter(function(v){return inr.indexOf(v) === -1;});
console.log('=== ALL ENVVARS IN CODEBASE ===');
[...vars].sort().forEach(function(v){console.log(v);});
console.log('\n=== MISSING FROM RENDER ===');
miss.sort().forEach(function(v){console.log('MISSING:',v);});
console.log('\nTotal:', vars.size, '| Missing:', miss.length);