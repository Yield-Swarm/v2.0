// YC Readiness Audit Script
const { chromium } = require('playwright');

const BASE = 'https://yieldswarm.polsia.app';

const PUBLIC_ROUTES = [
  '/',
  '/vault',
  '/vault/usdc',
  '/vault/sol',
  '/vault/ton',
  '/vault/tao',
  '/buy-miner',
  '/pre-order',
  '/pre-order/deposit-success',
  '/invest',
  '/shop',
  '/coins',
  '/coins/ysm',
  '/deploy/usa',
  '/deploy/europe',
  '/deploy/asia',
  '/deploy/south-america',
  '/deploy/global',
  '/dashboard',
  '/agents',
  '/testnet',
  '/arena',
  '/blog',
  '/learn',
  '/docs',
  '/mine',
  '/mine/dual',
  '/ab-preview/a',
  '/ab-preview/b',
  '/transparency',
  '/defi',
  '/pay',
  '/pay-zec',
];

const ADMIN_ROUTES = [
  '/admin/analytics',
  '/admin/pre-orders',
  '/admin/kalediscope-sop',
  '/admin/ab-homepage',
  '/admin/helix-chain-explorer',
  '/admin/settings',
  '/admin/warranty',
  '/admin/swarm',
];

const PLACEHOLDER_PATTERNS = [
  /Lorem ipsum/gi,
  /TODO/gi,
  /PLACEHOLDER/gi,
  /undefined/gi,
  /null/gi,
  /Coming soon/gi,
  /<INSERT>/gi,
];

function checkPlaceholders(text) {
  const found = [];
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      found.push({ pattern: pattern.toString(), count: matches.length });
    }
  }
  return found;
}

async function checkMetaTags(page) {
  const title = await page.title();
  const desc = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
  const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null);
  const ogDesc = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => null);
  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);
  return { title, desc, ogTitle, ogDesc, ogImage };
}

async function checkBrokenImages(page) {
  const images = await page.$$eval('img', imgs => imgs.map(img => ({
    src: img.src,
    alt: img.alt,
    naturalWidth: img.naturalWidth,
    loaded: img.complete && img.naturalWidth > 0,
  })));
  return images.filter(img => img.src && !img.src.startsWith('data:') && !img.loaded);
}

async function checkBrokenLinks(page) {
  const links = await page.$$eval('a[href]', anchors =>
    anchors.map(a => ({ href: a.href, text: a.textContent?.trim().substring(0, 50) }))
      .filter(l => l.href && !l.href.startsWith('mailto:') && !l.href.startsWith('javascript:'))
  );

  const broken = [];
  for (const link of links) {
    if (!link.href.startsWith(BASE) && !link.href.startsWith('/')) continue;
    try {
      const target = link.href.startsWith(BASE) ? link.href : BASE + link.href;
      const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null);
      if (!resp || resp.status() >= 400) {
        broken.push({ href: link.href, status: resp ? resp.status() : 'timeout' });
      }
    } catch(e) {
      broken.push({ href: link.href, status: 'error' });
    }
  }
  return broken.slice(0, 20); // cap
}

async function checkMobile(viewport, route) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().substring(0, 200));
  });

  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
    const body = await page.content();
    const placeholders = checkPlaceholders(body);
    return { status: resp?.status() || 'unknown', errors, placeholders, bodyLength: body.length };
  } catch(e) {
    return { status: 'error', error: e.message.substring(0, 100), errors, placeholders: [] };
  } finally {
    await browser.close();
  }
}

async function runAudit() {
  const results = [];
  const browser = await chromium.launch({ headless: true });

  // Desktop browser
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200));
  });

  for (const route of PUBLIC_ROUTES) {
    const start = Date.now();
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(500);

      const body = await page.content();
      const placeholders = checkPlaceholders(body);
      const meta = await checkMetaTags(page);
      const brokenImgs = await checkBrokenImages(page);
      const loadTime = Date.now() - start;

      results.push({
        route,
        status: resp?.status() || 'unknown',
        loadTime,
        placeholders,
        meta,
        brokenImages: brokenImgs.length,
        issues: [],
      });

      if (placeholders.length > 0) {
        results[results.length-1].issues.push(`PLACEHOLDERS: ${JSON.stringify(placeholders)}`);
      }
      if (brokenImgs.length > 0) {
        results[results.length-1].issues.push(`BROKEN_IMAGES: ${brokenImgs.length} broken`);
      }
      if (resp?.status() !== 200) {
        results[results.length-1].issues.push(`HTTP ${resp?.status()}`);
      }
      if (loadTime > 3000) {
        results[results.length-1].issues.push(`SLOW_LOAD: ${loadTime}ms`);
      }

      console.log(`[${resp?.status() || 'ERR'}] ${route} (${loadTime}ms) ${placeholders.length > 0 ? '⚠️ PLACEHOLDERS' : ''} ${brokenImgs.length > 0 ? '⚠️ BROKEN_IMGS' : ''}`);
    } catch(e) {
      results.push({ route, status: 'ERROR', error: e.message.substring(0, 100), issues: ['ERROR'] });
      console.log(`[ERR] ${route} — ${e.message.substring(0, 80)}`);
    }
  }

  await page.close();

  // Mobile check for homepage only
  console.log('\n--- MOBILE CHECKS ---');
  for (const [width, height, label] of [[375, 812, 'mobile'], [768, 1024, 'tablet']]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text().substring(0, 200));
    });
    try {
      const resp = await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
      const body = await page.content();
      const placeholders = checkPlaceholders(body);
      console.log(`[${label}/${resp?.status()}] Homepage — placeholders: ${placeholders.length}, errors: ${errors.length}`);
      results.push({ route: `/ (${label})`, status: resp?.status(), placeholders, errors, issues: [] });
      if (placeholders.length > 0) results[results.length-1].issues.push('PLACEHOLDERS');
      if (errors.length > 0) results[results.length-1].issues.push('CONSOLE_ERRORS');
    } catch(e) {
      console.log(`[${label}/ERR] Homepage — ${e.message.substring(0, 80)}`);
    }
    await page.close();
  }

  await browser.close();

  // Write results
  const fs = require('fs');
  fs.writeFileSync('/tmp/audit-results.json', JSON.stringify(results, null, 2));

  // Summary
  const passed = results.filter(r => r.status === 200 && r.issues.length === 0).length;
  const failed = results.filter(r => r.status !== 200 || r.issues.length > 0).length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`Total checked: ${results.length}`);

  const issues = results.filter(r => r.issues.length > 0);
  console.log('\n=== ISSUES ===');
  for (const r of issues) {
    console.log(`${r.route}: ${r.issues.join(', ')}`);
  }

  return results;
}

runAudit().catch(console.error);