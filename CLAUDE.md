# ZYNTRA Backend

REST API backend for the ZYNTRA agency website (zyntra.ltd). Built with Node.js + Express, MongoDB Atlas, JWT auth, Cloudinary for file uploads, and Nodemailer for email notifications.

## Stack

- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: MongoDB Atlas via Mongoose 8
- **Auth**: JWT (jsonwebtoken), bcryptjs for password hashing
- **File uploads**: Cloudinary + multer-storage-cloudinary
- **Email**: Nodemailer (Gmail SMTP)
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit
- **Dev**: nodemon

## Running the project

```bash
npm run dev    # development with auto-reload
npm start      # production
node seed.js   # seed the default admin user (admin@zyntra.com / admin123456)
```

## Environment variables (.env)

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin for CORS |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary config |
| `CLOUDINARY_API_KEY` | Cloudinary config |
| `CLOUDINARY_API_SECRET` | Cloudinary config |
| `EMAIL_USER` | Gmail address for sending notifications |
| `EMAIL_PASS` | Gmail app password |
| `ADMIN_EMAIL` | Recipient for contact/application notifications (e.g. info@zyntra.ltd) |

## Project structure

```
src/
  index.js                    # Entry point — helmet, 100req/15min rate-limit, CORS, routes, 404/error handlers
  config/
    db.js                     # Mongoose connection
    cloudinary.js             # Cloudinary + multer setup
  middleware/
    auth.js                   # protect (JWT) + logAction
    validate.js               # handleValidation helper for express-validator
    paginate.js               # paginate(req, defaultLimit) — returns { page, limit, skip }
    requestLogger.js          # Logs method, path, status, ms, IP per request
  models/
    User.js                   # Admin user (name, email, password, role)
    Service.js                # Services (title, description, icon, status, order, features[])
    Project.js                # Projects (title, description, category, image, status, featured, client, results[])
    Blog.js                   # Blog posts (SEO fields, auto-slug)
    Message.js                # Contact form submissions (name, email, phone, subject, message, status)
    AuditLog.js               # Admin activity log (userId, action, entity, entityId, details)
    Contact.js                # CRM contacts (name, email, phone, company, source, status, pipelineStage, notes, assignedTo)
    Deal.js                   # CRM deals (title, contact ref, value, stage, probability, expectedClose, notes)
    Pipeline.js               # Pipeline stage config (key, label, order, color, probability) with defaults
    Career.js                 # Job openings (title, type, location, description, requirements[], status, category)
    Application.js            # Job applications (name, email, phone, position, cvLink, career ref, status, notes)
  routes/
    auth.js                   # POST /login (public), POST /register (protected — admin only)
    services.js               # GET/GET:id/admin/all public; POST/PUT/DELETE protected
    projects.js               # GET/GET:id/admin/all public; POST/PUT/DELETE protected
    blog.js                   # GET/slug/admin/all public+protected; POST/PUT/DELETE protected
    messages.js               # POST public (5/hr rate limit, auto-creates Contact); GET/PUT/DELETE protected
    careers.js                # GET/GET:id/apply public; admin/all/applications/CRUD protected
    auditLogs.js              # GET/POST protected
    upload.js                 # POST /upload (protected) — Cloudinary single image
    search.js                 # GET /search?q= public — searches services, projects, blog
    contacts.js               # Full CRUD — all protected
    deals.js                  # Full CRUD — all protected
    pipeline.js               # GET — stage config + live deal counts/values (protected)
    crm.js                    # Mounts contacts, deals, pipeline under /api/crm/*
  utils/
    mailer.js                 # sendContactNotification, sendApplicationNotification (XSS-safe HTML)
seed.js                       # One-time admin seed script
```

## API reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | public | Login → JWT |
| POST | /api/auth/register | protected | Create new admin (existing admin only) |

### Content (public GET, protected write)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/services | public | Active services, paginated |
| GET | /api/services/admin/all | protected | All incl. inactive |
| GET | /api/services/:id | public | Single active service |
| POST/PUT/DELETE | /api/services | protected | — |
| GET | /api/projects | public | Published, paginated; `?category=` `?featured=true` |
| GET | /api/projects/admin/all | protected | All incl. drafts |
| GET | /api/projects/:id | public | Single published project |
| POST/PUT/DELETE | /api/projects | protected | — |
| GET | /api/blog | public | Published, paginated (9/page); `?category=` `?tag=` `?search=` |
| GET | /api/blog/slug/:slug | public | Full post by slug |
| GET | /api/blog/admin/all | protected | All incl. drafts, paginated |
| POST/PUT/DELETE | /api/blog | protected | — |

### Contact & Careers
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/messages | public (5/hr) | Saves submission + email + auto-creates Contact |
| GET | /api/messages | protected | Paginated; `?status=` |
| PUT | /api/messages/:id | protected | Update status (new/read/replied) |
| DELETE | /api/messages/:id | protected | — |
| GET | /api/careers | public | Active jobs, paginated; `?category=` `?type=` |
| GET | /api/careers/:id | public | Single active job |
| POST | /api/careers/apply | public (3/hr) | Submit application → email notification |
| GET | /api/careers/admin/all | protected | All jobs |
| GET | /api/careers/applications | protected | All applications; `?status=` `?career=` |
| PUT | /api/careers/applications/:id | protected | Update application status/notes |
| POST/PUT/DELETE | /api/careers | protected | Manage job listings |

### CRM (all protected, under /api/crm)
| Method | Path | Notes |
|---|---|---|
| GET/POST/PUT/DELETE | /api/crm/contacts | Paginated; `?status=` `?pipelineStage=` `?search=` |
| GET/POST/PUT/DELETE | /api/crm/deals | Paginated; `?stage=`; populates contact |
| GET | /api/crm/pipeline | Stage config + live deal counts and total values per stage |

### Utilities
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/search?q= | public | Case-insensitive search across services, projects, blog |
| GET/POST | /api/audit-logs | protected | Activity log |
| POST | /api/upload | protected | Upload image to Cloudinary |

## Pagination

All list endpoints support `?page=1&limit=10`. Response shape:
```json
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 } }
```

## Auth pattern

Protected routes require: `Authorization: Bearer <jwt_token>`

`protect` decodes the token and attaches `req.user = { id, role }`. `logAction` writes to AuditLog.

## Security

- `helmet` — security headers on all responses
- Global rate limit: 100 req / 15 min / IP
- Contact form: 5 submissions / hr / IP
- Career applications: 3 submissions / hr / IP
- `express-validator` on every write endpoint
- CORS restricted to zyntra.ltd and localhost:3000
- `express.json({ limit: '10kb' })` — body size cap
- XSS-safe HTML in all email templates (`escapeHtml`)

## Known issues

- `EMAIL_USER`, `EMAIL_PASS`, `ADMIN_EMAIL` must be set in `.env` for email notifications to work
