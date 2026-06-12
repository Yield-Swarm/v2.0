const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('wss://connect.anchorbrowser.io/?sessionId=907b4d7b-36b7-46d9-b1ce-7b4c2bba3d42');
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('https://yieldswarm.polsia.app/vaults', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  const btns = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button'));
    return els.slice(0, 10).map(e => ({
      text: e.textContent.trim().slice(0, 50),
      disabled: e.disabled
    }));
  });
  console.log('Buttons found:', JSON.stringify(btns));

  const cspErrors = errors.filter(e => e.includes('Refused') || e.includes('CSP'));
  console.log('CSP violations:', cspErrors.length);
  if (cspErrors.length) cspErrors.forEach(e => console.log(' -', e.slice(0, 200)));

  await browser.close();
})();