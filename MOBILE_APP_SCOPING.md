# YieldSwarm Mobile App — MVP Scope & Architecture
**Date:** 2026-06-03
**Status:** SCOPING COMPLETE — Ready for build phase
**Owner:** Christopher (cbreezy0003)

---

## Executive Summary

**Framework: React Native** (not Flutter) — native Solana wallet ecosystem, simpler ElizaOS bridge, better 2026 DeFi tooling.
**CI/CD: Codemagic** — 2.2x faster than GitHub Actions for iOS, no Mac required, dedicated mobile focus.
**MVP: DeFi Wallet (App 1)** — highest revenue potential via $9.99/mo Pro subscriptions + vault UX stickiness.
**Dev time estimate: 80–120 hours** for MVP (feature-rich, not bare).

---

## 1. Framework Decision: React Native ✅

### Comparison Matrix

| Criteria | React Native | Flutter | Native (Swift/Kotlin) |
|----------|-------------|---------|----------------------|
| DeFi/wallet ecosystem | ✅ RainbowKit, wagmi, Solana RN | ⚠️ Stricter FFI | ✅ Full access |
| Solana mobile support | ✅ `@solana-mobile/mobile-wallet-adapter` | ❌ No mobile SDK | ✅ Native |
| Cross-platform (iOS+Android) | ✅ 95% shared | ✅ 98% shared | ❌ Separate codebases |
| ElizaOS / SwarmOS bridge | ✅ Native JS/TS | ❌ Requires custom plugin | ⚠️ Complex |
| Web3.js / Ethers compatibility | ✅ Direct | ⚠️ Additional bindings | ✅ Direct |
| Developer availability | ✅ Easier to hire RN devs | ✅ Strong Flutter market | ⚠️ Specialists only |
| Time to MVP | ✅ Fastest (shared logic) | ⚠️ Similar | ❌ 2x effort |
| PWA fallback | ✅ Easy | ⚠️ Possible | ❌ N/A |

### Verdict

**React Native wins** for YieldSwarm specifically because:
1. **Solana ecosystem**: `@solana-mobile/mobile-wallet-adapter` + `@solana/web3.js` are mature RN packages. Flutter lacks a first-class Solana mobile SDK.
2. **WalletConnect v2**: `react-native-walletconnect-modal` + `wagmi` + `@rainbow-me/rainbowkit` give you all EVM chains (ETH, BTC, TON via EVM) in one unified modal. Flutter requires manual integration.
3. **Existing stack**: `ethers@6`, `@solana/web3.js@1.98` already in `package.json`. No new SDK work needed.
4. **ElizaOS bridge**: RN shares the same JavaScript/TypeScript runtime as ElizaOS agents — bridging agent events to UI is straightforward.

### What this means practically
```
React Native repo structure:
  yieldswarm-mobile/
  ├── src/
  │   ├── screens/        # VaultList, AgentMonitor, Referral, etc.
  │   ├── components/     # Shared UI components
  │   ├── services/       # API calls, wallet connections
  │   ├── hooks/          # useVaultPositions, useAgentHeartbeat, etc.
  │   └── navigation/      # React Navigation (tab + stack)
  ├── App.tsx
  └── codemagic.yaml      # CI/CD config
```

---

## 2. CI/CD: Codemagic (No Mac Required)

### Why Not GitHub Actions?

| Metric | Codemagic M2 Mac mini | GitHub Actions (macos-15) |
|--------|----------------------|---------------------------|
| iOS build time | **7 min 28 sec** | 16 min 10 sec |
| Speed | **2.2x faster** | baseline |
| Cost per build | **~$0.71** | ~$1.00 |
| Mac required | ❌ No | ✅ Yes (macOS runner) |
| Auto code signing | ✅ Native | ⚠️ Manual setup |
| Mobile-native | ✅ Yes | ❌ General purpose |
| Free tier | 500 min/month | 2000 min/month (but slower) |

GitHub Actions is fine for web apps. For iOS builds from a Linux machine? **Codemagic is purpose-built for this.**

### Codemagic Setup (No Mac Needed)

```yaml
# codemagic.yaml — root of yieldswarm-mobile repo
workflows:
  ios-workflow:
    name: iOS Build
    max_build_duration: 60
    environment:
      groups:
        - appstore_credentials   # Encrypted env vars in Codemagic UI
        - keystore_credentials
      vars:
        BUNDLE_ID: "app.polsia.yieldswarm"
        XCODE_WORKSPACE: "ios/YieldSwarm.xcworkspace"
        XCODE_SCHEME: "YieldSwarm"
    triggering:
      events:
        - push
        - tag
        - pull_request
      branch_patterns:
        - pattern: "main"
    scripts:
      - name: Install dependencies
        script: |
          npm install
          cd ios && pod install
      - name: Build iOS
        script: |
          xcodebuild build -workspace "$XCODE_WORKSPACE" -scheme "$XCODE_SCHEME" -configuration Release CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
    artifacts:
      - build/Logs/*.log
      - ios/*.ipa
    publishing:
      app_store_connect:
        auth: APP_STORE_CONNECT_API_KEY

  android-workflow:
    name: Android Build
    max_build_duration: 30
    environment:
      groups:
        - keystore_credentials
    scripts:
      - name: Build Android
        script: |
          cd android && ./gradlew assembleRelease
    artifacts:
      - android/app/build/outputs/**/*.apk
    publishing:
      google_play:
        credentials: $GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
```

### Steps to Get Started (No Mac)

1. Create Apple Developer Account ($99/yr) → App Store Connect
2. Generate **App Store Connect API Key** (Admin role) → upload to Codemagic
3. Create **iOS Distribution Certificate** (.p12) + **Provisioning Profile** → upload to Codemagic
4. Push `codemagic.yaml` to `yieldswarm-mobile` repo
5. Connect repo in Codemagic → builds start automatically

Android Play Store: Create service account → JSON key → Codemagic env var.

---

## 3. Which App First: DeFi Wallet (App 1) ✅

### Prioritization Rationale

| App | Revenue Potential | Dev Complexity | Strategic Value |
|-----|-----------------|---------------|----------------|
| **DeFi Wallet** | **$9.99/mo subs + vault retention** | Medium | **HIGHEST** |
| Agent Spawn Console Mobile | Governance value, low direct revenue | Medium | Medium |
| KIMI50 Tracker | Community engagement only | Low | Low |

**Why DeFi Wallet first:**
- Subscription revenue ($9.99/mo Pro) is the only direct monetization path for the mobile app
- Vault users already exist — mobile UX improvement = immediate retention + conversion lift
- Referral tracking in-app drives viral acquisition with zero extra work
- Push notifications on yield harvest = daily engagement loop → churn reduction

Agent Spawn Console is v2 — governance value is real but doesn't pay the bills. KIMI50 tracker is v3.

---

## 4. MVP Scope

### v1 Features (MVP — 80–120 hrs)

#### Screen 1: Vault Dashboard (Home)
- [ ] **Vault positions list**: 6 vaults (SOL, TON, ETH, BTC, EXL, TAO) — current balance, APY, 24h yield earned
- [ ] **Real-time APY ticker**: from existing `/api/vaults` endpoint
- [ ] **Yield history chart**: 7-day/30-day toggle, sparkline per vault
- [ ] **Pull-to-refresh**: 60s auto-refresh via polling

#### Screen 2: Wallet Connect
- [ ] **Multi-chain wallet modal**: MetaMask (EVM), Phantom (Solana), Solflare (Solana)
- [ ] **RainbowKit** integration: one modal, all chains
- [ ] **EVM balance display**: ETH, USDC, any ERC-20 (read-only from public RPC)
- [ ] **SIWE sign-in**: optional auth layer for personalized vault data
- [ ] **TON wallet**: support EVM-equivalent TON addresses via TonConnect

#### Screen 3: Agent Monitor
- [ ] **Agent list view**: from `/api/agents/list` — name, tier, heartbeat status, last activity
- [ ] **Deity performance cards**: 128+ arena deities with APY and rank
- [ ] **Lindell ranking display**: 10-dimension composite score per agent
- [ ] **Heartbeat pulse indicator**: green/yellow/red based on last 5 min activity

#### Screen 4: Referral Hub
- [ ] **Unique referral link**: `https://yieldswarm.polsia.app/ref/{code}` — copy to share
- [ ] **Referral stats**: clicks, signups, deposits from `/api/affiliates`
- [ ] **Earnings tracker**: cumulative referral income, current tier
- [ ] **Share buttons**: Twitter/X, Telegram, WhatsApp, SMS

#### Screen 5: Pro Subscription
- [ ] **Pro tier upgrade prompt**: $9.99/mo — Square Checkout Link flow
- [ ] **Pro features preview**: advanced analytics, unlimited agents, priority alerts
- [ ] **Current tier display**: free vs Pro vs Diamond
- [ ] **Manage subscription**: link to `/admin/subscriptions` (Stripe portal)

#### Push Notifications (Cross-cutting)
- [ ] **Firebase Cloud Messaging** setup: `react-native-firebase`
- [ ] **Yield harvest alerts**: "Your SOL vault earned $12.47 — compounded!"
- [ ] **Vault APY change alerts**: "SOL vault APY jumped to 8.2%!"
- [ ] **Agent status alerts**: "AEGIS agent requires attention"
- [ ] **Proposal voting reminder**: "Council vote ends in 2 hours"

### v2 Features (Post-MVP — 40–60 hrs)

- Council governance voting (Agent Spawn Console)
- KIMI50 price tracker + agent activity feed
- In-app Square payment for vault deposits
- Aave/JitoSOL/Kamino integration for mobile yield management
- Deep linking: `yieldswarm://vault/sol`
- Biometric auth (Face ID / fingerprint)

### NOT in v1
- Hardware miner config (Z15 Pro) — web-only
- Sunset Bridge mobile (too complex, requires escrow flow)
- Full trading/Arena mobile — web-only for now

---

## 5. Backend/API Changes Needed

### Existing Endpoints to Reuse

```
GET /api/vaults                    → vault positions + APY
GET /api/agents/list               → agent registry
GET /api/affiliates                → referral data (requires auth)
POST /api/webhooks/square/earnings  → subscription webhooks
GET /api/transparency/data         → public revenue data
POST /api/push/send                 → send push notifications
```

### New Endpoints to Add

Create `routes/mobile-api.js`:

```
GET  /api/mobile/vaults           → enriched vault data (positions + yield history)
GET  /api/mobile/agents           → agent heartbeat + Lindell scores (lightweight)
GET  /api/mobile/agent/:id        → single agent detail
POST /api/mobile/auth/siwe        → SIWE nonce + verification
POST /api/mobile/subscribe        → Square checkout link for Pro tier
GET  /api/mobile/user/tier        → current subscription tier + features
POST /api/mobile/push/register    → FCM token registration
GET  /api/mobile/referral/stats   → referral dashboard data
```

### API Design Notes

- All mobile endpoints return `{ success, data, meta }` envelope
- Auth via SIWE (EIP-4361) for wallet-gated endpoints
- Rate limit: 60 req/min per user (same as web)
- Cache vault/agent data: 60s TTL (same as existing pool-cache.js pattern)
- No new database tables required for v1

### Mobile Auth Flow (SIWE)

```
1. User clicks "Connect Wallet" → RainbowKit modal opens
2. User signs EIP-4361 message with wallet
3. App sends signed message to POST /api/mobile/auth/siwe
4. Server verifies signature → issues JWT (24hr expiry)
5. All subsequent requests use JWT Bearer token
6. JWT links wallet address to existing user record (or creates new)
```

---

## 6. Wallet Integration Architecture

### EVM Chains (ETH, BTC via bridged, EXL)
```
Package: @rainbow-me/rainbowkit + wagmi + viem
Chains: mainnet, base, arbitrum, optimism
Modal: <RainbowKitProvider> + <ConnectButton>
```

### Solana
```
Package: @solana/wallet-adapter + @solana/mobile-wallet-adapter
Wallets: Phantom, Solflare, Ledger, Coinbase Wallet
Flow: useWallet() hook → connect → sign transactions
```

### TON
```
Package: @ton/connect-react (TonConnect v2)
Wallets: Tonkeeper, OpenMask, TonWallet
Note: TON uses separate address format — show TON address after EVM connect
```

### WalletConnect v2 (Multi-chain)
```
Bridge: WalletConnect Cloud (project ID required)
Supported: EVM chains + Solana
Note: Get WC project ID from https://cloud.walletconnect.com (free tier)
```

### Implementation Order
1. RainbowKit first (covers ETH, BASE, ARB — highest user overlap)
2. Phantom Solflare second (Solana — KIMI50 + Raydium LP)
3. TonConnect third (TON vault users)

---

## 7. Push Notifications: Firebase Cloud Messaging

### Setup Steps

```bash
# In React Native project:
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS: Add APNs certificate to Firebase console
# Android: Add google-services.json from Firebase console
```

### Server-Side Changes

Existing `routes/push.js` at `POST /api/push/send` already handles push. Mobile needs:

1. **Register FCM token**: `POST /api/mobile/push/register` → store in `push_subscriptions` table (already has `endpoint` field — add `fcm_token` column)
2. **Send via FCM**: existing `web-push` library supports FCM — no new dependencies
3. **Notification payload**:
```json
{
  "notification": {
    "title": "Yield Alert 🐝",
    "body": "SOL vault earned $12.47 — compounded!",
    "data": { "vault": "sol", "amount": "12.47" }
  }
}
```

### FCM Setup in Codemagic

In Codemagic UI → Environment variables:
- `ANDROID_FIREBASE_KEY`: Firebase Cloud Messaging server key
- `IOS_APNS_KEY`: APNs authentication key (.p8 file)

No separate Firebase project needed — use existing `yieldswarm-firebase` if already created, or create new one.

---

## 8. App Store Listing Requirements

### Apple App Store (Finance Category)

**Required disclosures:**
- "This app is not a financial advisor. DYOR."
- "Cryptocurrency investments carry risk. Past performance does not guarantee future results."
- User must be 18+ (age rating: 4+, but finance content triggers App Review note)
- No "guaranteed returns" language anywhere in UI or metadata

**App Review specific issues for DeFi apps:**
1. **Screenshot requirements**: Must show real app functionality — no mockups
2. **Demo account**: Apple may ask for a test account to review — prepare `demo@yieldswarm.polsia.app` / `Demo1234`
3. **Prominent disclosure**: If app shows APY/returns, must include "APY estimates subject to change" fine print
4. **KYC note**: If users connect wallets without KYC, note this in App Store description

**App Store metadata** (already drafted in `APP_STORE_METADATA.md`):

| Field | Value |
|-------|-------|
| App name | YieldSwarm |
| Subtitle | DePIN Yield Intelligence |
| Bundle ID | `app.polsia.yieldswarm` |
| Category | Finance (primary) / Productivity (secondary) |
| Content rating | 4+ |
| Privacy policy URL | `https://yieldswarm.polsia.app/privacy` |
| Support URL | `https://yieldswarm.polsia.app/ios` |

### Google Play Store

- **Crypto disclosure**: Must include "Cryptocurrency transactions involve risk"
- **Financial features disclosure**: In Play Console → App content → Financial features → enable
- **Age rating**: 18+ (Content rating questionnaire)
- **One-time $25 fee** (already noted in constraints)

### Pre-Launch Checklist

- [ ] Apple Developer account ($99/yr) — Christopher purchases
- [ ] App Store Connect → Reserve Bundle ID: `app.polsia.yieldswarm`
- [ ] Firebase project + FCM credentials
- [ ] Google Play Console account + $25 fee
- [ ] App Store Connect API Key for Codemagic
- [ ] iOS Distribution certificate + Provisioning Profile (upload to Codemagic)
- [ ] TestFlight: 3 internal testers minimum before submit
- [ ] Privacy Policy page at `/privacy` — already exists at yieldswarm.polsia.app

---

## 9. Estimated Dev Time

### MVP Breakdown (80–120 hrs total)

| Phase | Tasks | Est. Hours |
|-------|-------|-----------|
| **Setup** | Repo init, CI/CD (Codemagic), Firebase, navigation | 8 hrs |
| **Screen 1** | Vault Dashboard + APY feed + yield chart | 16 hrs |
| **Screen 2** | Wallet connect (EVM + Solana + TON) | 20 hrs |
| **Screen 3** | Agent monitor + deity cards + Lindell display | 12 hrs |
| **Screen 4** | Referral hub + share links | 8 hrs |
| **Screen 5** | Pro subscription flow + Square checkout | 10 hrs |
| **Push** | FCM setup + 4 notification types | 6 hrs |
| **Polish** | Error states, loading, offline handling, Tab Bar | 10 hrs |

> **Note**: Tasks over 4 hours should be broken into subtasks. This is the initial scoping — split into executable chunks before building.

### External Dependencies (Blocking)

| Dependency | Owner | Blocker For |
|------------|-------|------------|
| Apple Developer account ($99/yr) | Christopher | App Store submit |
| Apple App Store Connect API Key | Christopher | Codemagic iOS build |
| Firebase project + FCM key | Engineering | Push notifications |
| Google Play Console + $25 | Christopher | Android publish |
| WC Project ID (WalletConnect Cloud) | Engineering | Multi-chain wallet |

---

## 10. Recommended Repo Structure

```
yieldswarm-mobile/          # New React Native repo
├── src/
│   ├── screens/
│   │   ├── VaultDashboard.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── AgentMonitor.tsx
│   │   ├── ReferralHub.tsx
│   │   └── ProSubscription.tsx
│   ├── components/
│   │   ├── VaultCard.tsx
│   │   ├── AgentCard.tsx
│   │   ├── YieldChart.tsx
│   │   └── WalletButton.tsx
│   ├── services/
│   │   ├── api.ts              # Fetch wrapper with auth headers
│   │   ├── wallet.ts           # RainbowKit + Solana adapter
│   │   └── notifications.ts    # FCM integration
│   ├── hooks/
│   │   ├── useVaultPositions.ts
│   │   ├── useAgentHeartbeat.ts
│   │   └── useSiweAuth.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx    # Bottom tab + stack nav
│   └── store/
│       └── userStore.ts        # Zustand for local state
├── App.tsx
├── codemagic.yaml
└── package.json

yieldswarm-polsia/           # Existing web app repo
├── routes/
│   └── mobile-api.js          # NEW: mobile-specific endpoints
├── db/
│   └── push-subscriptions.js  # Update: add fcm_token column
└── ...
```

### New Migration Needed

```sql
-- Migration: add FCM token support for mobile push
ALTER TABLE push_subscriptions
ADD COLUMN fcm_token TEXT,
ADD COLUMN platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android')),
ADD COLUMN wallet_address TEXT;
```

---

## 11. Architecture Summary

```
┌─────────────────────────────────────────────┐
│  YieldSwarm Mobile App (React Native)        │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ RainbowKit│  │ Solana   │  │ TonConnect│ │
│  │ (EVM)    │  │ Adapter  │  │ (TON)     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│       │             │              │        │
│  ┌────▼────────────▼──────────────▼─────┐  │
│  │         API Service Layer              │  │
│  │  (axios + auth header + retry logic)   │  │
│  └────────────────┬───────────────────────┘  │
│                   │                          │
│         ┌─────────▼──────────┐               │
│         │  yieldswarm.polsia.app  │          │
│         │  (existing Express API)│          │
│         │  + new /api/mobile/*  │          │
│         └─────────┬──────────────┘           │
│                   │                         │
│         ┌─────────▼──────────┐              │
│         │   Neon Postgres     │              │
│         │   (existing 138    │              │
│         │   tables)           │              │
│         └────────────────────┘              │
└─────────────────────────────────────────────┘

CI/CD Pipeline:
  GitHub push → Codemagic webhook → iOS build (M2 Mac mini, ~7min)
                                         → Android build (Linux, ~5min)
                                         → TestFlight / Google Play
```

---

## 12. What's Needed From Christopher Now

Before build can start, Christopher needs to:

1. **Purchase Apple Developer** ($99/yr) → [developer.apple.com](https://developer.apple.com)
2. **Reserve Bundle ID**: `app.polsia.yieldswarm` in App Store Connect
3. **Create App Store Connect API Key** → Download `.p8` file for Codemagic
4. **Create iOS Distribution Certificate** → Export `.p12` + upload to Codemagic
5. **Create Provisioning Profile** (App Store Distribution) → Upload to Codemagic
6. **Create Google Play Console account** → Pay $25 one-time fee
7. **Sign up for Codemagic** → [codemagic.io](https://codemagic.io) (free tier works to start)
8. **Create Firebase project** → [console.firebase.google.com](https://console.firebase.google.com) → Enable FCM

All of this takes ~1–2 hours of setup on Christopher's side. Once done, engineering can build in parallel.

---

## 13. Next Steps (Engineering)

Once Christopher completes account setup:

1. **Create `yieldswarm-mobile` repo** on GitHub under Polsia-Inc org
2. **Initialize React Native project**: `npx react-native@latest init YieldSwarm --version 0.76.0`
3. **Set up Codemagic** with the `codemagic.yaml` from section 2
4. **Create `routes/mobile-api.js`** with the endpoints from section 5
5. **Add migration** for FCM token support
6. **Build screens** in order: Vault Dashboard → Wallet Connect → Agent Monitor → Referral → Pro
7. **TestFlight** with 3 internal testers before App Store submit
8. **Android Beta** via Google Play internal testing track

---

*Document produced by Polsia Engineering — 2026-06-03*
*Related docs: `APP_STORE_METADATA.md`, `CLAUDE.md`, `SWARM_DEPLOYMENT_GAME_PLAN.md`*
*GitHub repos: `yieldswarm-polsia` (web app), `yieldswarm-app` (open-source), `yieldswarm-agents` (agent system)*