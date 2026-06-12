function classifyNetwork(path) {
  if (path.includes('test') || path.includes('staging')) return 'testnet';
  return 'mainnet';
}

function badgeHtml(mode) {
  return mode === 'testnet' ? '🟡 TESTNET' : '🟢 MAINNET';
}

function bannerHtml(mode) {
  return '';
}

function toastScript(mode) {
  return '';
}

module.exports = { classifyNetwork, badgeHtml, bannerHtml, toastScript };
