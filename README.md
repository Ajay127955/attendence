<div align="center">

# 🗓️ Attendance Management System

**A production-ready, full-stack attendance platform for schools and colleges.**
Mark attendance in seconds, watch analytics update live, and give every student a personal attendance portal.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-18181b?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node-%E2%89%A518.18-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-18181b)

</div>

---

## 📖 Overview

The Attendance Management System (AMS) is a complete, deployable application with three roles —
**Admin**, **Teacher**, and **Student** — built on a modern monochrome UI with light/dark themes.

- **Teachers** mark a whole class in one tap, edit within a configurable window, and see live summaries.
- **Admins** manage people and courses, import students from CSV, run reports (CSV / Excel / PDF / print),
  and audit every change.
- **Students** get a personal portal: overall and subject-wise percentage, a monthly calendar, full history,
  and downloadable reports.

Everything is real: JWT auth with refresh rotation, role-based access control enforced on the API *and* the UI,
input validation on every endpoint, rate limiting, audit logging, and optional Google Sheets mirroring.

---

## ✨ Features

### 🔐 Authentication & security
- Login with **email or roll number**, logout, change password.
- Forgot / reset password flow (SMTP email, or console link in development).
- Short-lived **access token** + rotating **refresh token** stored as a hashed value and an httpOnly cookie.
- `helmet`, CORS allow-list, rate limiting (global + auth + email), HPP protection, and request sanitisation.
- Role-based access control on every route, mirrored by route guards in the UI.

### 🧑‍🏫 Teacher
- Pick class → date → subject and mark **Present / Absent / Late / Excused** with one-tap toggles.
- **Mark all present**, search and filter the roster, add remarks, and save the whole sheet in one request.
- Edit within a configurable window (`editWindowDays`, default 7 days); older records are locked.
- Real-time class summaries via Socket.IO.

### 🛠️ Admin
- Dashboard KPIs, attendance trends, class comparison, and low-attendance alerts.
- Full CRUD for **Students, Teachers, Classes, Subjects** with search, sort, filter, and pagination.
- **CSV bulk import** for students, with a per-row error report and a downloadable template.
- Reports: summary, detailed, and below-threshold lists — export to **CSV, Excel, PDF**, or print.
- System **Settings** (institution, academic year, working days, late policy, threshold, edit window).
- **Audit log** viewer recording who changed what, when, and from where.

### 🎓 Student
- Personal dashboard with overall attendance percentage and per-subject breakdown.
- Monthly calendar view, complete attendance history, and one-click report download.
- Clearly flagged when attendance drops below the required threshold.

### 🎨 UI / UX
- Modern **black-and-white** design system with a light/dark toggle.
- Responsive: desktop sidebar + topbar, mobile bottom navigation.
- Accessible: visible focus rings, keyboard-operable dialogs, ARIA labels, reduced-motion support.
- Loading skeletons, toasts, empty states, error boundaries, and inline form validation.

---

## 🖼️ Screenshots

> Add your own captures to `docs/screenshots/` and link them here. Suggested shots:

| Dashboard | Mark Attendance | Student Portal |
| --- | --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Mark Attendance](docs/screenshots/mark-attendance.png) | ![Student](docs/screenshots/student-portal.png) |

| Reports | Audit Log | Dark Mode |
| --- | --- | --- |
| ![Reports](docs/screenshots/reports.png) | ![Audit](docs/screenshots/audit-logs.png) | ![Dark](docs/screenshots/dark-mode.png) |

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, Recharts, Socket.IO client, lucide-react, react-hot-toast |
| **Backend** | Node.js, Express 4, Mongoose 8, Socket.IO, Zod, JWT, bcryptjs, Helmet, express-rate-limit |
| **Database** | MongoDB (Atlas in production, local or Atlas in development) |
| **Docs** | OpenAPI 3 / Swagger UI at `/api/docs` |
| **Reports** | ExcelJS (XLSX), PDFKit (PDF), custom CSV writer |
| **Integrations** | Nodemailer (email), Google Sheets API (optional mirror) |
| **Testing** | Jest + Supertest + mongodb-memory-server |
| **Tooling** | ESLint, Docker, Docker Compose, GitHub Actions |

---

## 🏗️ Architecture

```
┌────────────────────────┐        HTTPS / WSS        ┌────────────────────────┐
│        Browser         │  ───────────────────────▶ │      Nginx (SPA)       │
│  React + Vite + TW     │  ◀─────────────────────── │   static + /api proxy  │
└────────────────────────┘                           └───────────┬────────────┘
                                                                 │
                                                     /api/v1  ·  /socket.io
                                                                 │
                                                     ┌───────────▼────────────┐
                                                     │   Express REST API     │
                                                     │  routes → controllers  │
                                                     │   → services → models  │
                                                     └───────────┬────────────┘
                                                                 │ Mongoose
                                                     ┌───────────▼────────────┐
                                                     │   MongoDB (Atlas)      │
                                                     └────────────────────────┘
```

**Request lifecycle:** `route` → `validate (Zod)` → `authenticate`/`authorize (RBAC)` →
`controller` → `service` → `model`. Responses use a consistent envelope; a global error handler
turns every thrown `ApiError` into `{ success: false, data: null, message, details? }`.

**Realtime:** authenticated sockets join `user:<id>`, `role:<role>`, and `class:<id>` rooms.
The server emits `attendance:updated` and `dashboard:refresh`, which dashboards subscribe to.

---

## 📁 Project Structure

```
attendance-management-system/
├── client/                     # React + Vite + Tailwind SPA
│   ├── src/
│   │   ├── components/         # ui.jsx primitives, layout shell, charts, guards
│   │   ├── context/            # Auth, Theme, Socket providers
│   │   ├── hooks/              # useApi, useLocalState
│   │   ├── lib/                # axios instance, socket, formatters, navigation
│   │   ├── pages/              # 17 route components
│   │   ├── App.jsx             # route tree (lazy-loaded)
│   │   └── main.jsx
│   ├── Dockerfile · nginx.conf · vercel.json · netlify.toml
│   └── .env.example
│
├── server/                     # Express + Mongoose API
│   ├── src/
│   │   ├── config/             # env, db, logger, swagger
│   │   ├── models/             # User, Student, Class, Subject, Attendance, Settings, AuditLog
│   │   ├── routes/ · controllers/ · services/
│   │   ├── middleware/         # auth, validate, sanitize, rateLimit, audit, errorHandler
│   │   ├── validators/         # Zod schemas
│   │   ├── utils/              # tokens, dates, csv, mailer, cookies, pagination…
│   │   ├── realtime/           # Socket.IO
│   │   ├── app.js · server.js
│   ├── scripts/                # create-admin, local dev database
│   ├── tests/                  # Jest + Supertest
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml          # mongo + server + client
├── .github/workflows/ci.yml    # lint + test + build
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js ≥ 18.18** and npm
- A **MongoDB** database — local (`mongodb://127.0.0.1:27017`), a free **MongoDB Atlas** cluster, or the zero-install option below
- *(Optional)* Docker & Docker Compose

### 1. Clone & install

```bash
git clone <your-repo-url> attendance-management-system
cd attendance-management-system
```

### 2. Configure the server

```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
npm install
```

Edit `server/.env` and set at minimum:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/attendance_ams
JWT_ACCESS_SECRET=<long random string>
JWT_REFRESH_SECRET=<another long random string>
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **No MongoDB installed?** Start a real local MongoDB with one command — no install required:
>
> ```bash
> npm run db            # mongod on 127.0.0.1:27017, data persisted in ./.mongo-data
> ```
>
> Leave it running in its own terminal. It reuses the MongoDB binary that
> `mongodb-memory-server` already caches for the test suite, and keeps your data
> between restarts.

### 3. Create an admin account

The app has **no public sign-up** — accounts are created by an admin. Bootstrap the
very first admin from the command line:

```bash
npm run create-admin -- --email admin@yourschool.edu --name "Principal" --password "Str0ng@Pass"
```

Running it again with the same email updates that admin's name/password, so it is
safe to re-run if you forget the credentials.

### 4. Start the API

```bash
npm run dev           # http://localhost:5000  · docs at /api/docs
```

### 5. Configure & start the client

```bash
cd ../client
cp .env.example .env  # leave VITE_API_URL empty to use the Vite dev proxy
npm install
npm run dev           # http://localhost:5173
```

Open <http://localhost:5173> and sign in with the admin account you created above.

> **📱 Testing on your phone?** Run the server as a single-origin host
> (`SERVE_CLIENT=true`, `CLIENT_BASE_PATH=/attendence/`), run **`share-lan.cmd`
> as administrator** to open the firewall, then open
> `http://<your-PC-IP>:5000/attendence/` on your phone (same Wi-Fi). For a public
> link that works anywhere, see the Cloudflare Tunnel section in
> [DEPLOY.md](DEPLOY.md#test-it-on-your-phone-before-deploying).

---

## 🔑 Accounts & Roles

There is **no public sign-up**. An admin creates every other account:

| Role | Created from | Sign-in identifier |
| --- | --- | --- |
| **Admin** | `npm run create-admin` (or `POST /auth/register` while signed in as an admin) | email |
| **Teacher** | Admin → **Teachers** → *Add teacher* | email |
| **Student** | Admin → **Students** → *Add student* or *Import CSV* | roll number **or** email |

> New student accounts without an explicit password receive the value of
> `SEED_STUDENT_PASSWORD` from `.env` — set a strong value there in production.

---

## ⚙️ Environment Variables

### `server/.env`
| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` · `production` · `test` |
| `PORT` | API port (default `5000`) |
| `API_PREFIX` | API base path (default `/api/v1`) |
| `CLIENT_URL` / `CORS_ORIGINS` | Front-end URL(s) allowed by CORS (comma-separated) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets (use long random values) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (default `15m` / `7d`) |
| `COOKIE_DOMAIN` / `COOKIE_SECURE` / `COOKIE_SAME_SITE` | Cookie scope (see deployment) |
| `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | Rate-limit tuning |
| `SMTP_*`, `MAIL_FROM` | Email for password resets (omit `SMTP_HOST` to log links to console) |
| `SEED_STUDENT_PASSWORD` | Default password for newly created/imported student accounts |
| `GOOGLE_SHEETS_ENABLED`, `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Optional Sheets sync |

### `client/.env`
| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Empty in dev (uses Vite proxy); set to `https://api.yourdomain.com/api/v1` in production |
| `VITE_SOCKET_URL` | Socket.IO origin (defaults to the API origin) |
| `VITE_PROXY_TARGET` | Dev proxy target (default `http://localhost:5000`) |

---

## 🔌 API Reference

- **Base URL:** `http://localhost:5000/api/v1`
- **Interactive docs:** `http://localhost:5000/api/docs` (OpenAPI JSON at `/api/docs.json`)
- **Health check:** `GET /health`
- **Auth:** send `Authorization: Bearer <accessToken>`; refresh via the httpOnly cookie on `POST /auth/refresh`.

**Success envelope**
```json
{ "success": true, "data": { }, "message": "OK", "meta": { "page": 1, "totalPages": 3 } }
```
**Error envelope**
```json
{ "success": false, "data": null, "message": "Validation failed", "details": [ ] }
```

### Endpoints

| Area | Method & path | Access |
| --- | --- | --- |
| **Auth** | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` | public / auth |
| | `GET /auth/me` · `PATCH /auth/me` · `POST /auth/change-password` | authenticated |
| | `POST /auth/forgot-password` · `POST /auth/reset-password` | public |
| | `POST /auth/register` | admin |
| **Users** | `GET /users/teachers` · `GET /users` · `POST /users` · `GET/PATCH/DELETE /users/:id` | admin |
| **Students** | `GET /students` · `GET /students/:id` | admin, teacher |
| | `POST/PATCH/DELETE /students` · `DELETE /students/:id/hard` | admin |
| | `GET /students/import/template` · `POST /students/import` | admin |
| **Classes** | `GET /classes` · `GET /classes/options` · `GET /classes/:id` | authenticated |
| | `POST/PATCH/DELETE /classes` · `PUT /classes/:id/teachers` · `PUT /classes/:id/students` | admin |
| **Subjects** | `GET /subjects` · `GET /subjects/options` · `GET /subjects/:id` | authenticated |
| | `POST/PATCH/DELETE /subjects` | admin |
| **Attendance** | `POST /attendance/mark` · `POST /attendance/bulk` | admin, teacher |
| | `GET /attendance/roster` · `GET /attendance` · `DELETE /attendance/:id` | admin, teacher |
| | `GET /attendance/student/:id` · `GET /attendance/student/:id/history` | admin, teacher |
| | `GET /attendance/me` · `GET /attendance/me/history` | student |
| **Reports** | `GET /reports/summary` · `GET /reports/detailed` · `GET /reports/low-attendance` · `GET /reports/export` | admin, teacher |
| **Dashboard** | `GET /dashboard` | admin, teacher |
| **Settings** | `GET /settings` | authenticated |
| | `PATCH /settings` · `GET /settings/google-sheets` · `GET /settings/audit-logs` · `GET /settings/audit-logs/:id` | admin |

### Socket.IO events
| Event | Payload | Emitted to |
| --- | --- | --- |
| `attendance:updated` | `{ classId, date, subjectId }` | `class:<id>` + `role:teacher` |
| `dashboard:refresh` | `{ reason }` | `role:admin`, `role:teacher` |

---

## 📊 Reports & Export

- **Summary** — per-student present/absent/late/excused counts and percentage.
- **Detailed** — every attendance record for a class/subject/date range.
- **Low attendance** — students below the configured threshold.
- **Export** — `?format=csv|excel|pdf` streams a downloadable file (and print-friendly views via the browser).

Attendance percentage follows `(present + late, if counted) / (total − excused)`, centralised in
`services/attendanceStats.service.js` and driven by the `lateCountsAsPresent` setting.

---

## 📥 CSV Import

1. Download the template: `GET /students/import/template` (also available from the Students page).
2. Fill in `rollNo, name, email, class, ...` and upload.
3. The response includes `{ imported, skipped, errors: [{ row, message }] }` for a per-row report.

---

## 📗 Google Sheets Sync (optional)

Set `GOOGLE_SHEETS_ENABLED=true` plus a service-account email and private key, and share the target
spreadsheet with that account. Marked attendance is mirrored to the sheet on a best-effort basis;
failures are logged and never block the API response.

---

## 🧪 Testing

```bash
cd server
npm test          # Jest + Supertest against an in-memory MongoDB
npm run lint      # ESLint (src + tests)
```

The suite spins up **mongodb-memory-server** (the first run downloads a MongoDB binary, ~80 MB), then
exercises the auth flow (login → refresh rotation → logout, RBAC) and attendance marking
(upsert, unique-index behaviour, edit window, teacher scoping).

Client:

```bash
cd client
npm run lint
npm run build
```

---

## 🐳 Docker

Run the entire stack (MongoDB + API + Nginx-served SPA) with one command:

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| Client | <http://localhost:8080> |
| API | <http://localhost:5000> |
| API docs | <http://localhost:5000/api/docs> |
| MongoDB | `mongodb://localhost:27017` |

The client's Nginx proxies `/api` and `/socket.io` to the API container, so the browser stays on a
single origin and cookies work without extra CORS configuration.

Create an admin inside the container:

```bash
docker compose exec server npm run create-admin -- --email admin@yourschool.edu --name "Principal" --password "Str0ng@Pass"
```

---

## ☁️ Deployment Guide

> **Want a single free link like `https://codestorm.dpdns.org/attendence/`?**
> Follow the step-by-step **[DEPLOY.md](DEPLOY.md)** — one Render web service
> serves both the app and the API (no CORS, no cross-site cookies) with a free
> MongoDB Atlas database. The two-section guide below is the general
> split-hosting approach.

### 1. Database — MongoDB Atlas
1. Create a free cluster and a database user.
2. **Network Access** → allow your host's IPs (`0.0.0.0/0` for managed platforms).
3. Copy the connection string into `MONGODB_URI`.

### 2. API — Render or Railway
- **Build:** `npm install` · **Start:** `npm start` · **Health check path:** `/health`
- Set every variable from `server/.env` (use strong JWT secrets and `NODE_ENV=production`).
- Set `CORS_ORIGINS=https://app.yourdomain.com` and `CLIENT_URL=https://app.yourdomain.com`.
- Point `api.yourdomain.com` at the service (Render/Railway both support custom domains + HTTPS).

### 3. Frontend — Vercel or Netlify
- Root directory: `client` · Build: `npm run build` · Output: `dist`
- Set `VITE_API_URL=https://api.yourdomain.com/api/v1` and `VITE_SOCKET_URL=https://api.yourdomain.com`.
- SPA rewrites are pre-configured in `client/vercel.json` / `client/netlify.toml`.
- Add `app.yourdomain.com` as a custom domain.

### 4. Cross-subdomain cookies
Because the app (`app.…`) and API (`api.…`) are different subdomains, set on the server:

```env
COOKIE_DOMAIN=.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
CORS_ORIGINS=https://app.yourdomain.com
```

Both domains must be **HTTPS** for `SameSite=None; Secure` to work.

### 5. Post-deploy
- Create your first admin: `npm run create-admin` (see [step 3](#3-create-an-admin-account)).
- Verify `GET https://api.yourdomain.com/health` returns `200`.
- Browse `https://api.yourdomain.com/api/docs` to confirm the API is live.

---

## 🔒 Security Notes

- Access tokens are short-lived; refresh tokens are stored **hashed** and rotated, capped at 5 per user.
- All request bodies/query/params are validated with Zod before reaching controllers.
- Passwords are hashed with bcrypt; the hash is never returned by the API.
- Rate limiting guards the API globally, with stricter limits on auth and email endpoints.
- Audit logs capture actor, action, entity, IP, and user agent for sensitive operations.

---

## 📜 Scripts

### `server/`
| Script | Purpose |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start in production |
| `npm run db` | Start a local MongoDB (no install needed) |
| `npm run create-admin` | Create/update an admin account |
| `npm test` | Jest + Supertest |
| `npm run lint` / `lint:fix` | ESLint |

### `client/`
| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |
| `npm run lint` / `lint:fix` | ESLint |

---

## 📄 License

Released under the **MIT License**. Use it freely for portfolios, demos, and real deployments.

<div align="center"><sub>Built with care — React · Express · MongoDB · Socket.IO</sub></div>
