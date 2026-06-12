#!/usr/bin/env node
/**
 * Clickthrough Audit via Anchor Browser Session
 * Task #2069534
 */

const { chromium } = require('playwright');

const BASE = 'https://yieldswarm.polsia.app';
const CDP_URL = 'wss://connect.anchorbrowser.io/?sessionId=fd22a8b5-b4f7-4400-bd2a-467b75103651';
const results = [];

async function auditPage(browser, path, label) {
  const url = BASE + path;
  const row = { page: label, path, url, status: '---', notes: '' };
  const page = await browser.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = response?.status() || 0;
    row.status = status;

    if (status >= 400) {
      row.notes = `HTTP ${status}`;
      await page.close();
      results.push(row);
      return;
    }

    // Wait for JS to hydrate
    await page.waitForTimeout(2000);

    // Count interactive elements
    const navLinks = (await page.$$('nav a, header a, .nav a')).length;
    const buttons = (await page.$$('button, [role="button"]')).length;
    const connectWallet = (await page.$$('[id*="wallet"], [class*="connect"]')).length;
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text().substring(0, 80));
      }
    });

    row.notes = `nav=${navLinks}, btns=${buttons}, walletBtns=${connectWallet}, errors=${errors.length}`;
    if (errors.length > 0) row.notes += ' | ' + errors.slice(0, 2).join('; ');

  } catch (err) {
    row.status = 'ERROR';
    row.notes = err.message.substring(0, 150);
  }
  await page.close();
  results.push(row);
}

async function auditVaultPage(browser, path, label) {
  return auditPage(browser, path, label);
}

async function run() {
  const browser = await chromium.connectOverCDP(CDP_URL);

  // === 5-TAB NAV PAGES ===
  for (const [path, label] of [
    ['/', 'Homepage'],
    ['/earn', 'Earn Hub'],
    ['/governance', 'Governance'],
    ['/team', 'Team'],
    ['/corporate', 'Corporate'],
    ['/vaults', 'Vaults Hub'],
    ['/vault/usdc', 'Vault USDC'],
    ['/vault/sol', 'Vault SOL'],
    ['/vault/ton', 'Vault TON'],
    ['/vault/tao', 'Vault TAO'],
    ['/agents', 'Agent Directory'],
    ['/agents/invest', 'Agent Invest'],
    ['/arena', 'Arena'],
    ['/bridge', 'Bridge'],
    ['/referrals', 'Referrals'],
    ['/membership', 'Membership'],
    ['/leaderboard', 'DeFi Leaderboard'],
    ['/swarm', 'Swarm'],
    ['/council', 'Council Hub'],
    ['/coin/ysm', 'YSM Coin'],
    ['/raffle', 'Raffle'],
    ['/blog', 'Blog'],
    ['/play', 'Play'],
    ['/pool', 'Mining Pool'],
    ['/defi', 'DeFi Dashboard'],
    ['/transparency', 'Transparency'],
    ['/invest', 'Invest'],
    ['/press', 'Press'],
    ['/security', 'Security'],
    ['/privacy', 'Privacy'],
    ['/terms', 'Terms'],
    ['/docs', 'Docs'],
    ['/tools', 'Tools'],
    ['/shop', 'Shop'],
    ['/token', 'Token'],
    ['/app', 'App'],
    ['/stats', 'Stats'],
  ]) {
    await auditPage(browser, path, label);
  }

  await browser.close();

  // Print matrix
  console.log('\n=== CLICKTHROUGH MATRIX ===\n');
  console.log('| Page | Path | Status | Notes |');
  console.log('|------|------|--------|-------|');
  for (const r of results) {
    const statusStr = typeof r.status === 'number' ? String(r.status) : r.status;
    const noteStr = (r.notes || '').substring(0, 100);
    console.log(`| ${r.page} | ${r.path} | ${statusStr} | ${noteStr} |`);
  }

  const ok = results.filter(r => r.status === 200).length;
  const errs = results.filter(r => typeof r.status === 'number' && r.status >= 400).length;
  console.log(`\nTotal: ${results.length} pages | 200: ${ok} | Errors: ${errs}`);
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});