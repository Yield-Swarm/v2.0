const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('wss://connect.anchorbrowser.io/?sessionId=da4d79a9-45a3-465d-b670-07a746107dba');
  const page = await browser.newPage();

  // Test API endpoint
  const apiResp = await page.goto('https://yieldswarm.polsia.app/api/fleet/live');
  const apiStatus = apiResp.status();
  const apiBody = await page.evaluate(() => document.body.innerText);

  // Test fleet page
  const pageResp = await page.goto('https://yieldswarm.polsia.app/fleet');
  const pageStatus = pageResp.status();

  // Get page title and check key elements
  const title = await page.title();
  const hashrate = await page.locator('#hashrate-current').textContent().catch(() => 'NOT FOUND');
  const staleBadge = await page.locator('#stale-badge').evaluate(el => el.style.display).catch(() => 'NOT FOUND');
  const workersOnline = await page.locator('#workers-online').textContent().catch(() => 'NOT FOUND');
  const lastUpdated = await page.locator('#last-updated').textContent().catch(() => 'NOT FOUND');

  console.log('API /api/fleet/live:', apiStatus, apiBody.slice(0, 300));
  console.log('Fleet page status:', pageStatus, 'title:', title);
  console.log('Hashrate:', hashrate, '| Stale badge display:', staleBadge, '| Workers online:', workersOnline, '| Last updated:', lastUpdated);

  await browser.close();
})().catch(e => console.error('ERROR:', e.message));