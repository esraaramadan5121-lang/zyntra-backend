# ZYNTRA Backend — Full Audit Report
Generated: 2026-06-02

Severity levels: 🔴 CRASH · 🟠 BUG · 🟡 SECURITY · 🔵 MISSING · ⚪ CLEANUP

---

## 🔴 CRASH-LEVEL

### 1. `src/models/AuditLog.js` — File is empty
- **File:** `src/models/AuditLog.js`
- **Problem:** The file has 0 bytes. `src/middleware/auth.js` does `require('../models/AuditLog')` and calls `AuditLog.create(...)`. When the app starts, `AuditLog` is `undefined`, so any protected route that hits the `logAction` path will throw.
- **Fix:** Define and export the Mongoose model.

```js
const mongoose = require('mongoose')
const AuditLogSchema = new mongoose.Schema({
  userId:   { type: String, default: '' },
  action:   { type: String, required: true },
  entity:   { type: String, required: true },
  entityId: { type: String, default: '' },
  details:  { type: String, default: '' },
}, { timestamps: true })
module.exports = mongoose.model('AuditLog', AuditLogSchema)
```

---

## 🟠 BUGS

### 2. `src/routes/messages.js` — Duplicate `POST /` handler
- **File:** `src/routes/messages.js` lines 6–13 and 17–22
- **Problem:** Express registers both handlers but only the **second** one runs (no email). The `sendContactNotification` call on line 9 is dead code.
- **Fix:** Remove the duplicate handler (lines 17–22). Keep only the first one.

### 3. `src/routes/blog.js` — `slug` never regenerates on update
- **File:** `src/routes/blog.js` line 46
- **Problem:** `findByIdAndUpdate` bypasses Mongoose `pre('save')` hooks entirely. If you update a blog post's title, the slug stays stale.
- **Fix:** Either manually derive the slug in the PUT handler, or use `.save()` after fetching the document.

### 4. `src/routes/messages.js` — `PUT /:id` hardcodes `status: 'read'`
- **File:** `src/routes/messages.js` line 32
- **Problem:** Status can be `'new'`, `'read'`, or `'replied'` per the model, but the update route always sets `'read'`. You can never mark a message as `'replied'` through the API.
- **Fix:** Accept `status` from `req.body` (validated against the enum).

### 5. `src/middleware/auth.js` — `logAction` is defined but never called
- **File:** `src/middleware/auth.js` lines 16–20; all route files
- **Problem:** The audit log infrastructure exists but zero routes call `logAction`, so the audit trail is always empty.
- **Fix:** Call `logAction` in every protected write route (create, update, delete).

---

## 🟡 SECURITY

### 6. `src/routes/auth.js` — Register endpoint is wide open
- **File:** `src/routes/auth.js` line 5
- **Problem:** `POST /api/auth/register` is public with no protection. Anyone on the internet can create an admin account.
- **Fix:** Either remove the register endpoint entirely (use `seed.js` to bootstrap the first admin), protect it with the `protect` middleware, or gate it behind an invite token.

### 7. `src/utils/mailer.js` — XSS in contact email HTML
- **File:** `src/utils/mailer.js` lines 17–26
- **Problem:** `message.name`, `message.email`, `message.message`, etc. are injected directly into an HTML string with no escaping. A visitor can inject arbitrary HTML/script into the admin email.
- **Fix:** Escape HTML special characters before inserting user content into the template.

### 8. `src/index.js` — `helmet` and `express-rate-limit` installed but not used
- **File:** `src/index.js`; `package.json`
- **Problem:** Both packages are installed as dependencies and appear in `package.json`, but neither is mounted in `index.js`. The app ships with no security headers and no rate limiting.
- **Fix:**
  ```js
  const helmet = require('helmet')
  const rateLimit = require('express-rate-limit')
  app.use(helmet())
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))
  ```

### 9. `src/routes/messages.js` — Public POST has no rate limiting
- **File:** `src/routes/messages.js` line 6
- **Problem:** The contact form endpoint is public and unthrottled. It can be spammed to flood the admin inbox and fill the database.
- **Fix:** Apply a stricter rate limiter specifically to `POST /api/messages`.

### 10. `src/routes/*` — No input validation anywhere
- **Files:** All route files
- **Problem:** `req.body` is passed directly into `.create()` and `.findByIdAndUpdate()` with no validation or sanitization. Callers can inject unexpected fields (e.g., setting `role` on a user via a services route body if Mongoose strict mode is ever relaxed).
- **Fix:** Add validation (manually or with a library like `express-validator` or `joi`) before hitting the DB.

---

## 🔵 MISSING / INCOMPLETE

### 11. `.env` — Missing Cloudinary and email variables
- **File:** `.env`
- **Problem:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, and `ADMIN_EMAIL` are all referenced in code but absent from `.env`. Upload and email features silently fail.
- **Fix:** Add the missing variables to `.env`.

### 12. `src/index.js` — No 404 handler
- **File:** `src/index.js`
- **Problem:** Requests to unknown routes fall through with no response (or an Express default). A proper 404 JSON response is expected by the frontend.
- **Fix:**
  ```js
  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
  ```

### 13. `src/index.js` — No global error handler
- **File:** `src/index.js`
- **Problem:** Unhandled errors in middleware or routes will either crash the process or return an empty response.
- **Fix:**
  ```js
  app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }))
  ```

### 14. All list routes — No pagination
- **Files:** `src/routes/services.js`, `src/routes/projects.js`, `src/routes/blog.js`, `src/routes/messages.js`, `src/routes/auditLogs.js`
- **Problem:** Every list endpoint returns all documents. As data grows this will slow down and eventually time out.
- **Fix:** Add `?page` / `?limit` query params with `skip()` / `limit()`.

### 15. `src/routes/projects.js` — No endpoint to fetch a single project by ID
- **File:** `src/routes/projects.js`
- **Problem:** There is `GET /` for listing but no `GET /:id`. The frontend can't deep-link to a project detail page through this API.
- **Fix:** Add `router.get('/:id', ...)`.

### 16. `src/routes/blog.js` — No endpoint to get a draft post by ID for admin preview
- **File:** `src/routes/blog.js`
- **Problem:** `GET /admin/all` returns drafts but there is no `GET /admin/:id` to fetch one specific draft. Admin preview of a draft requires fetching by ID.
- **Fix:** Add `router.get('/admin/:id', protect, ...)`.

---

## ⚪ CLEANUP

### 17. `src/config/node_modules.code-workspace` — Wrong location
- **File:** `src/config/node_modules.code-workspace`
- **Problem:** A VS Code workspace file ended up inside `src/config/`. It serves no runtime purpose and is noise in the source tree.
- **Fix:** Delete it or move it to the project root.

### 18. `tsconfig.json` — Orphaned TypeScript config
- **File:** `tsconfig.json`
- **Problem:** The project is plain JavaScript with no TypeScript source, compiler, or `@types` packages. The file does nothing.
- **Fix:** Delete it unless TypeScript migration is planned.

### 19. `seed.js` — Hardcoded default password
- **File:** `seed.js` line 28
- **Problem:** The default admin password `admin123456` is hardcoded in the seed script. It is readable to anyone with repo access.
- **Fix:** Accept the password from an env var or CLI arg, or at least document that it must be changed immediately after seeding.

### 20. `src/routes/auditLogs.js` — Admin can manually POST audit logs
- **File:** `src/routes/auditLogs.js` lines 15–21
- **Problem:** The `POST /api/audit-logs` endpoint lets any authenticated admin inject arbitrary audit log entries. Audit logs should only be written by the server internally via `logAction`, not by API callers.
- **Fix:** Remove the `POST` route; call `logAction` from within routes instead.

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Crash | 1 |
| 🟠 Bug | 4 |
| 🟡 Security | 5 |
| 🔵 Missing | 6 |
| ⚪ Cleanup | 4 |
| **Total** | **20** |

### Priority order to fix
1. 🔴 AuditLog model (app won't start)
2. 🟠 Duplicate POST handler in messages (email broken)
3. 🟡 Open register endpoint (security hole)
4. 🔵 Missing .env vars (upload + email broken)
5. 🟡 Mount helmet + rate limiter (bare minimum hardening)
6. 🟠 messages PUT status fix
7. 🟡 XSS in mailer
8. 🟠 logAction wiring
9. Everything else
