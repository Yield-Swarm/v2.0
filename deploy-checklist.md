# YieldSwarm Deploy Checklist

---

## 🚨 Owner Action Required — Disable Auto-Deploy

**To fully activate these guardrails, the owner must disable auto-deploy on Render:**

1. Go to: https://dashboard.render.com/web/srv-d835vgsvikkc73ctt280
2. Click **Settings** → **Build & Deploy**
3. Set **Auto-Deploy** to **Disabled**
4. Save

**Why this matters:** Without this step, every Polsia push still auto-deploys to production. The checklist and branch strategy are in place — this one toggle completes the guardrail.

Once disabled, Polsia pushes go to staging for review. Owner merges to main and triggers deploy manually from the Render dashboard.

---

## Branch Strategy

| Branch | Purpose | Auto-Deploy | Who Pushes |
|--------|---------|-------------|------------|
| `staging` | Pre-production testing | **ON** — all Polsia commits land here | Polsia Engineering agent |
| `main` | Production | **OFF** — requires manual approval | Owner only |

## Before Every Production Deploy

### Step 1: Verify staging is healthy
- [ ] Staging site loads at https://yieldswarm.polsia.app (from staging branch)
- [ ] No 502 / crash loop in staging logs
- [ ] Key flows work: signup, login, payments

### Step 2: Review the staging commit
- [ ] Check the commit message in Render dashboard
- [ ] Confirm expected changes only
- [ ] Check staging logs for startup errors

### Step 3: Manual approval gate
- [ ] Owner reviews and approves
- [ ] Merge staging → main (via GitHub PR or Render manual deploy)
- [ ] Trigger deploy to production from main

---

## Kill Switch — Instantly Stop Auto-Deploy

If production is crashing or a bad commit is live:

### Option A: Render Dashboard (fastest)
1. Go to https://dashboard.render.com/web/srv-d835vgsvikkc73ctt280
2. Click **Settings** → **Build & Deploy**
3. Set **Auto-Deploy** to **Disabled**
4. Done — Render stops deploying on any push

### Option B: Disable via branch push
1. Push an empty commit to the auto-deploy branch:
   ```
   git checkout staging
   git commit --allow-empty -m "chore: pausing auto-deploy"
   git push origin staging
   ```
2. Then disable via Option A in Render dashboard.

### Option C: Disable staging auto-deploy only
If staging itself is misbehaving and triggering production:
1. Go to Render dashboard
2. Find the staging service (or disable staging branch in production settings)
3. Toggle auto-deploy off for staging

### Re-enable after fix
1. Render dashboard → Settings → Build & Deploy → **Auto-Deploy: Enabled**
2. Push a clean commit to trigger fresh deploy

---

## Polsia Agent Branch Policy

**Rule: Never push directly to `main`.**

Polsia Engineering agent should:
- Develop on feature branches or `staging`
- All commits land on `staging` branch
- Owner reviews staging before merging to `main`

---

## Emergency Rollback

If production is broken after a deploy:

1. **Render Dashboard**: Go to Deploys → find last known-good deploy → click **Rollback**
2. **GitHub**: Revert the bad commit with `git revert <sha>` and push to staging

---

## Contact

Owner: check Render dashboard or Polsia inbox for deploy notifications.

Last updated: 2026-05-22