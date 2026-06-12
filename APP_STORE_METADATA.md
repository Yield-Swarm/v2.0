# YieldSwarm — App Store / TestFlight Metadata

> Status: PWA live at https://yieldswarm.polsia.app/ios
> Native Swift app: roadmap Q3 2026 (TestFlight first, then App Store)

---

## App Store Connect — Core Fields

**App Name:** YieldSwarm
**Subtitle:** DePIN Yield Intelligence
**Bundle ID:** `app.polsia.yieldswarm` *(reserve in App Store Connect)*
**Category:** Finance (Primary) / Productivity (Secondary)
**Content Rating:** 4+ (no objectionable content; financial/investment info)

---

## App Description (4000 chars max)

```
YieldSwarm is a DePIN-native yield intelligence platform that puts
autonomous AI agents to work on your hardware fleet.

WHAT IT DOES
─────────────
• Live ZEC Mining Dashboard — Real-time hashrate, payout history,
  and uptime from our 22 Antminer Z15 Pro units at Blue Forge
  Advisors ($0.075/kWh contract-locked, 95% uptime SLA).

• Proof of Yield — On-chain verified mining receipts from the 2miners
  ZEC pool. Not projections. Real revenue: $17,600/month, verifiable
  by anyone.

• Fleet Intelligence — Track per-unit performance, daily ZEC earnings,
  hashrate trends, and pool efficiency across your entire DePIN fleet.

• Sunset Bridge — Convert stale protocol treasury tokens into verified
  DePIN mining revenue through a 3-phase cryptographic escrow
  mechanism (FROST 2-of-3 multisig, Blockage Method valuation,
  on-chain burn receipt).

• Arena — Submit automated trading strategies, verify with STARK
  proofs, compete for prizes in live rounds.

• Push Alerts — Yield alerts, miner status changes, Arena round
  openings, and investment confirmations delivered instantly.

• Siri Shortcuts — "Check my mining yield" and "Show proof dashboard"
  open the relevant live data screens instantly from your lock screen.

WHY YIELDSWARM
──────────────
Most DePIN yield platforms show you projections. YieldSwarm shows
you proof. Every number in this app traces to a live mining operation
in a contracted colocation facility with an SLA.

The Sunset Bridge protocol is the only mechanism that converts
illiquid DAO treasury tokens into verified hardware yield using
IRS-recognized Blockage Method valuation — no speculation, no
vesting cliffs.

PRIVACY & SECURITY
──────────────────
YieldSwarm does not require account creation to view live mining
data. The proof dashboard is fully public. Investment and purchase
flows use Stripe's PCI-compliant payment processing. No mining keys
or wallet private keys are ever stored on our servers.

Requires iOS 16.4+ for push notifications. All core features
available on iOS 14+.
```

---

## Keywords (100 chars max — comma-separated, no spaces after commas)

```
Zcash,mining,DeFi,yield,DePIN,ZEC,crypto,fleet,hashrate,mining yield,depin yield,hardware mining
```

*(100 chars exact — Apple counts each keyword field separately)*

**Keyword targeting rationale:**
| Keyword | Search volume | Why |
|---------|--------------|-----|
| Zcash | Med-high | Direct product — ZEC mining |
| mining yield | High | Core use case |
| DePIN | Growing | Category keyword |
| depin yield | Low-comp | Exact niche |
| hashrate | Med | Mining-specific |
| DeFi | Very high | Cross-category users |

---

## Promotional Text (170 chars — updatable without review)

```
$17,600/month. 22 miners. Verified on-chain. Track live ZEC yield and manage your DePIN fleet from anywhere.
```

---

## Screenshots Brief

**Required sizes:**
- iPhone 6.7" (1290 × 2796) — iPhone 15 Pro Max
- iPhone 6.5" (1242 × 2688) — iPhone 11 Pro Max (legacy required)
- iPad Pro 12.9" (2048 × 2732) — if iPad supported

**Screenshot sequence (6 screens):**

| # | Screen | Caption | Page URL |
|---|--------|---------|----------|
| 1 | Proof Dashboard — live hashrate ticker | "22 miners. $17,600/month. Proof, not promises." | `/proof` |
| 2 | Fleet Dashboard — per-miner metrics | "Every miner. Every payout. Real-time." | `/dashboard` |
| 3 | Sunset Bridge landing | "Turn dead treasury tokens into verified yield." | `/sunset-bridge` |
| 4 | Mine-to-Earn game (tap mechanic) | "Tap to mine ZEC. Earn hardware discounts." | `/play` |
| 5 | Push notification alert (mock) | "Yield alert: $48.32 ZEC payout confirmed." | — |
| 6 | Install prompt + home screen icon | "Install in 4 taps. No App Store required." | `/ios` |

**Screenshot tool:** Use simulator (Xcode) for native app or browser dev tools device emulation for PWA screenshots.

---

## App Preview Video (optional, 30 sec)

Suggested flow:
1. Open app → proof dashboard (live ticker counting up)
2. Swipe to fleet view → miner cards with hashrate
3. Push notification arriving → tap → opens yield detail
4. "Add to Home Screen" flow on iOS Safari
5. Siri shortcut: "Check my mining yield" → app opens proof page

---

## TestFlight Notes (for internal testers)

```
YieldSwarm PWA — TestFlight Build Notes

This is the PWA wrapper build. The app is a WKWebView shell around
https://yieldswarm.polsia.app pointing at the PWA-optimized pages.

Test focus:
1. /proof — live mining data loads correctly
2. /dashboard — fleet stats display
3. /sunset-bridge — landing page renders
4. Push notifications — tap "Enable Push Alerts" on /ios
5. "Add to Home Screen" icon — verify YieldSwarm icon appears correctly
6. Siri: "Check my mining yield" shortcut → should open /proof
7. Offline mode — visit /proof, go offline, verify cached version loads

Known limitations (PWA vs native):
- No Dynamic Island integration (native Swift app, Q3 2026)
- Siri gives URL response only (full App Intents in native build)
- Push requires iOS 16.4+ Safari (older iOS: no push, all other features work)

Report issues: hi@yieldswarm.polsia.app
```

---

## Support & Legal URLs

- **Support URL:** https://yieldswarm.polsia.app/ios
- **Marketing URL:** https://yieldswarm.polsia.app
- **Privacy Policy:** https://yieldswarm.polsia.app/privacy
- **Terms of Service:** https://yieldswarm.polsia.app/terms

---

## VAPID Keys Setup (for Push Notifications)

Before TestFlight, generate and set VAPID keys:

```bash
# One-time key generation (store securely)
npx web-push generate-vapid-keys

# Set in Render env vars:
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:hi@yieldswarm.polsia.app
```

Also install the npm dep:
```bash
npm install web-push
```

Push endpoint: `POST /api/push/subscribe` (client-side)
Send broadcasts: `POST /api/push/send` (admin, requires ADMIN_SECRET header)

---

*Last updated: 2026-05-18*
