# require() Audit Guardrail

## BEFORE adding any `require()` to server.js or any route group file:

1. Read the target file: `grep -n "module.exports" routes/[filename].js`
2. Verify export names MATCH what server.js or group file destructures
3. Run the check: `node -e "const m = require('./routes/[file]'); console.log(typeof m['expectedName']);"`
4. If `undefined` → fix the export name OR delete the stale require line

## BEFORE adding route definitions to a route file:

**CRITICAL: Route paths in router files are RELATIVE to the mount point.**

If you write `app.use('/api/geod', require('./geod-crons'))` in the group file, the router file
must define routes RELATIVE to `/api/geod` — NOT including the mount path prefix.

DO NOT write:
```
router.get('/api/geod/status', ...)   // WRONG — actual path: /api/geod/api/geod/status
router.get('/admin/geod-crons', ...)   // WRONG — actual path: /admin/geod-crons/admin/geod-crons
```

DO write:
```
router.get('/status', ...)            // CORRECT — actual path: /api/geod/status
router.get('/', requireAdmin, ...)     // CORRECT — actual path: /admin/geod-crons
```

## Common mistakes that cause 404s and 502s:

### A) Duplicate route paths across TWO routers — CRITICAL (causes 502)

If two routers both define the same path (e.g. both have `router.get('/pricing')`):
1. Router A handles the request, sends response
2. Router B tries to handle the SAME request, fires a second `res.render()`
3. "Can't set headers after they are sent" → uncaught exception → worker crashes → **502**

ALWAYS check for path collisions BEFORE adding a new route:
```bash
grep -n "router.get('PATH'" routes/*.js   # check PATH not already used
grep -n "router.post('PATH'" routes/*.js   # check POST paths too
```

If PATH already exists in another router, **DELETE the duplicate from ONE router**.

### B) Wrong destructuring — causes module crash (502 on startup)

- File uses plain `module.exports = router` (exports Express.Router directly) but group file does `const { router } = require('./routes/file')` → Remove the destructuring `{}` from the group file
- File exports: `module.exports = router` but server.js expects: `const { router } = require('./routes/file')` → WRONG destructuring. Use `require('./routes/file')` directly (no `{}`)
- File exports: `module.exports = { router, something }` but group file only uses `router` → fine
- File exports: `module.exports = { adminUpdateTreasury }` but group file expects `adminUpdateTreasuryHandler` → rename or delete the stale line
- Route file defines `router.get('/api/foo/status')` but is mounted at `/api/foo` → actual path = `/api/foo/api/foo/status` → 404. Fix: change to `router.get('/status')`
- Same duplication for admin routes: `router.get('/admin/bar')` mounted at `/admin/bar` → 404. Fix: change to `router.get('/')`

## server.js hard cap: 300 lines

## Always verify after changes:

1. `node --check server.js` — no syntax errors
2. `node -e "require('./routes/index')"` — routes/index.js loads without crash
3. `node -e "require('./routes/_r1-public-core')"` — group files load without crash
4. Push and verify: `curl https://yieldswarm.polsia.app/health` → 200