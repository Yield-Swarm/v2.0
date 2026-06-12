#!/usr/bin/env node
/**
 * Clickthrough Audit Script — Task #2069534
 * Verifies every page, link, button, and CTA on yieldswarm.polsia.app
 * Output: Markdown table for Christopher's verification
 */

const { chromium } = require('playwright');

const BASE = 'https://yieldswarm.polsia.app';
const results = [];

async function audit(page, path, label, checks) {
  const url = BASE + path;
  const row = { page: label, path, url, status: '---', notes: '' };
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const status = response?.status() || 0;
    row.status = status;
    if (status >= 400) {
      row.notes = `HTTP ${status}`;
      results.push(row);
      return;
    }

    // Check nav links
    const navLinks = await page.$$eval('nav a, header a, .nav a', els =>
      els.map(el => ({ href: el.href, text: el.textContent?.trim()?.substring(0, 40) }))
        .filter(l => l.href && !l.href.startsWith('javascript:'))
    );

    // Check buttons with handlers
    const buttons = await page.$$eval('button, [role="button"], a.btn, a.button, .cta button, .cta a', els =>
      els.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim()?.substring(0, 40),
        onclick: el.getAttribute('onclick') || el.getAttribute('href') || ''
      }))
    );

    // Check wallet connect buttons
    const walletBtns = await page.$$('[id*="wallet"], [class*="wallet"], [id*="connect"]');

    // Check for console errors (Error level only)
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text().substring(0, 100));
    });

    row.notes = `${navLinks.length} nav links, ${buttons.length} buttons, ${walletBtns.length} wallet btns, ${errors.length} errors`;
    if (errors.length > 0) row.notes += ` | ERRORS: ${errors.join('; ')}`;

    // Check specific CTA buttons
    const ctaChecks = checks || [];
    for (const check of ctaChecks) {
      const el = await page.$(check.selector);
      if (!el) {
        row.notes += ` | MISSING: ${check.label}`;
      } else if (check.type === 'click') {
        const onclick = await el.getAttribute('onclick');
        const href = await el.getAttribute('href');
        row.notes += ` | ${check.label}: ${onclick ? 'onclick=' + onclick.substring(0, 50) : href ? 'href=' + href : 'NO HANDLER'}`;
      }
    }

  } catch (err) {
    row.status = 'ERROR';
    row.notes = err.message.substring(0, 200);
  }
  results.push(row);
}

// Check specific buttons on vault pages
async function auditVaultPage(page, path) {
  const url = BASE + path;
  const row = { page: path, path, url, status: '---', notes: '' };
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    row.status = response?.status() || 0;

    // Check deposit buttons
    const depositBtns = await page.$$('[id*="deposit"], [class*="deposit"], button[class*="deposit"], .deposit-btn');
    const withdrawBtns = await page.$$('[id*="withdraw"], [class*="withdraw"], button[class*="withdraw"], .withdraw-btn');
    const connectBtns = await page.$$('[id*="wallet"], [class*="connect"]');
    const subscribeBtns = await page.$$('[id*="subscribe"], button:has-text("Subscribe"), button:has-text("Deposit")');

    row.notes = `deposit=${depositBtns.length}, withdraw=${withdrawBtns.length}, connect=${connectBtns.length}, subscribe=${subscribeBtns.length}`;

    // Check if deposit buttons have onclick/handlers
    if (depositBtns.length > 0) {
      const first = depositBtns[0];
      const onclick = await first.getAttribute('onclick');
      const href = await first.getAttribute('href');
      row.notes += ` | firstDeposit: onclick=${onclick ? 'YES' : 'NO'}, href=${href || 'none'}`;
    }
  } catch (err) {
    row.status = 'ERROR';
    row.notes = err.message.substring(0, 200);
  }
  results.push(row);
}

// Check public pages
async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting clickthrough audit...');
  console.log('Base URL:', BASE);

  // === PRIMARY PUBLIC PAGES (5-tab nav) ===
  await audit(page, '/', 'Homepage');
  await audit(page, '/earn', 'Earn Hub');
  await audit(page, '/governance', 'Governance');
  await audit(page, '/team', 'Team');
  await audit(page, '/corporate', 'Corporate DUNA');

  // === VAULT PAGES ===
  await auditVaultPage(page, '/vaults');
  await auditVaultPage(page, '/vault/usdc');
  await auditVaultPage(page, '/vault/sol');
  await auditVaultPage(page, '/vault/ton');
  await auditVaultPage(page, '/vault/tao');

  // === AGENTS PAGES ===
  await audit(page, '/agents', 'Agent Directory');
  await audit(page, '/agents/invest', 'Agent Invest');
  await audit(page, '/admin/agent-marketplace', 'Agent Marketplace Admin');

  // === ARENA ===
  await audit(page, '/arena', 'Arena');
  await audit(page, '/admin/arena', 'Arena Admin');

  // === KEY PAGES ===
  await audit(page, '/bridge', 'Bridge');
  await audit(page, '/referrals', 'Referrals');
  await audit(page, '/membership', 'Membership');
  await audit(page, '/leaderboard', 'Leaderboard');
  await audit(page, '/swarm', 'Swarm');
  await audit(page, '/council', 'Council Hub');
  await audit(page, '/coin/ysm', 'YSM Coin Page');
  await audit(page, '/raffle', 'Raffle');
  await audit(page, '/blog', 'Blog');
  await audit(page, '/play', 'Play Game');
  await audit(page, '/pool', 'Mining Pool');
  await audit(page, '/defi', 'DeFi Dashboard');
  await audit(page, '/transparency', 'Transparency');
  await audit(page, '/invest', 'Invest');

  // === SECONDARY PAGES ===
  await audit(page, '/press', 'Press');
  await audit(page, '/security', 'Security');
  await audit(page, '/privacy', 'Privacy');
  await audit(page, '/terms', 'Terms');
  await audit(page, '/docs', 'Docs');
  await audit(page, '/tools', 'Tools');
  await audit(page, '/shop', 'Shop');
  await audit(page, '/token', 'Token');
  await audit(page, '/app', 'App');

  // === STATS PAGE ===
  await audit(page, '/stats', 'Stats');
  await audit(page, '/admin/master-dashboard', 'Master Dashboard Admin');

  // === EXTERNAL LINKS CHECK ===
  console.log('\nChecking footer external links...');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const twitterLink = await page.$('a[href*="twitter"], a[href*="x.com"]');
  const footerTwitter = twitterLink ? await twitterLink.getAttribute('href') : 'NOT FOUND';
  results.push({ page: '/ (footer)', path: '/', url: BASE + '/', status: 'CHECK', notes: 'Twitter footer link: ' + footerTwitter });

  await browser.close();

  // Print matrix
  console.log('\n\n=== CLICKTHROUGH MATRIX ===');
  console.log('| Page | Path | Status | Notes |');
  console.log('|------|------|--------|-------|');
  for (const r of results) {
    const statusStr = typeof r.status === 'number' ? String(r.status) : r.status;
    const noteStr = (r.notes || '').substring(0, 120);
    console.log(`| ${r.page} | ${r.path} | ${statusStr} | ${noteStr} |`);
  }

  console.log('\n\nTotal pages audited:', results.length);
  const ok = results.filter(r => r.status === 200).length;
  const errors = results.filter(r => typeof r.status === 'number' && r.status >= 400).length;
  console.log('200 OK:', ok, '| Errors:', errors);
}

runAudit().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});