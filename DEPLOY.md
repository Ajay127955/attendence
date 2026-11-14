# Deploying to `https://codestorm.dpdns.org/attendence/`

A free, single-origin deployment: **one public link** that serves both the app
and its API, so there is no CORS setup and no cross-site cookie problems.

```
https://codestorm.dpdns.org/attendence/        →  the React app
https://codestorm.dpdns.org/api/v1             →  the REST API
https://codestorm.dpdns.org/api/docs           →  Swagger docs
```

| Piece | Free service | What it does |
| --- | --- | --- |
| App + API | **Render** (free Web Service) | Express serves the built SPA at `/attendence/` and the API at `/api/v1` |
| Database | **MongoDB Atlas** (M0, free) | Stores users, students, classes, attendance |
| Domain | **DigitalPlat FreeDomain** (`dpdns.org`) | Your `codestorm.dpdns.org` subdomain |
| TLS | Render (automatic) | HTTPS certificate for the custom domain |

> **Free-tier note:** Render's free Web Service sleeps after ~15 minutes idle and
> takes ~50 seconds to wake. For a portfolio link you can keep it warm for free
> with [UptimeRobot](https://uptimerobot.com) pinging `https://codestorm.dpdns.org/health`
> every 10 minutes. *(Prefer a site that never sleeps? See [Alternative A](#alternative-a-static-spa--api).)*

---

## Step 0 — Push the project to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Attendance Management System"
git branch -M main
git remote add origin https://github.com/<your-username>/attendence.git
git push -u origin main
```

`.env` files and `dist/` are already git-ignored, so no secrets are committed.

> Name the repo **`attendence`** if you plan to also use GitHub Pages
> (Alternative A), because that becomes the URL path.

---

## Step 1 — Create the database (MongoDB Atlas, free)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Build a Database** → choose the **M0 Free** tier → pick a region close to you.
3. **Database Access** → *Add New Database User* → set a username + password
   (save them). Give it **Read and write to any database**.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`). Render's IPs are dynamic on the free tier, so this is required.
5. **Connect** → *Drivers* → copy the connection string and replace `<password>`:

   ```
   mongodb+srv://ams_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/attendance_ams?retryWrites=true&w=majority
   ```

---

## Step 2 — Deploy the server + app on Render (free)

1. Sign up at <https://render.com> with your GitHub account.
2. **New** → **Web Service** → connect your `attendence` repository.
3. Configure:

   | Field | Value |
   | --- | --- |
   | **Name** | `ams` (anything) |
   | **Region** | closest to you |
   | **Branch** | `main` |
   | **Root Directory** | *(leave empty — repo root)* |
   | **Runtime** | Node |
   | **Build Command** | `cd client && npm ci && npm run build && cd ../server && npm ci` |
   | **Start Command** | `node server/src/server.js` |
   | **Health Check Path** | `/health` |
   | **Instance Type** | **Free** |

4. **Environment → Add Environment Variable** — add every row below
   (generate the two secrets with
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`):

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | *(the Atlas string from Step 1)* |
   | `JWT_ACCESS_SECRET` | *(48-byte random hex)* |
   | `JWT_REFRESH_SECRET` | *(a different 48-byte random hex)* |
   | `CLIENT_URL` | `https://codestorm.dpdns.org` |
   | `CORS_ORIGINS` | `https://codestorm.dpdns.org` |
   | `SERVE_CLIENT` | `true` |
   | `CLIENT_BASE_PATH` | `/attendence/` |
   | `VITE_BASE_PATH` | `/attendence/` |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAME_SITE` | `lax` |
   | `COOKIE_DOMAIN` | *(leave empty)* |
   | `SEED_ADMIN_EMAIL` | `admin@ams.dev` |
   | `SEED_ADMIN_PASSWORD` | *(choose a strong password)* |
   | `SEED_TEACHER_PASSWORD` | *(choose a strong password)* |
   | `SEED_STUDENT_PASSWORD` | *(choose a strong password)* |

   > `VITE_BASE_PATH` is read at **build time**, so it must be set before the
   > first deploy. `VITE_API_URL` must stay **unset** — the API is same-origin.
   > Leave `SMTP_*` and `GOOGLE_*` blank unless you want those features.

5. **Create Web Service**. Wait for the build to finish, then open the
   `*.onrender.com` URL — you should see the app at `/attendence/`.

6. **Seed the demo data**: in Render, open your service → **Shell** tab and run:

   ```bash
   cd server && npm run seed
   ```

   It prints the demo credentials. (Run it only once — it clears collections.)

---

## Step 3 — Point your domain at Render

1. In Render → your service → **Settings** → **Custom Domains** → **Add**:
   enter `codestorm.dpdns.org`. Render shows a target hostname like
   `ams-xxxx.onrender.com`.
2. Add the DNS record at your DNS provider:

   | Type | Name | Value | TTL |
   | --- | --- | --- | --- |
   | `CNAME` | `codestorm` | `ams-xxxx.onrender.com` | Auto / 300 |

   - **If DigitalPlat gives you a DNS panel**, add the CNAME there directly.
   - **If DigitalPlat delegates nameservers**, point the NS records at your DNS
     provider (e.g. Cloudflare) first, then add the CNAME there. On Cloudflare,
     set the record to **DNS only** (grey cloud) so Render can issue the TLS
     certificate.

3. Wait for DNS to propagate (a few minutes). Render then provisions HTTPS
   automatically — the domain shows **Certificate: Issued**.

4. Open **<https://codestorm.dpdns.org/attendence/>** 🎉

---

## Step 4 — Verify

```bash
curl https://codestorm.dpdns.org/health            # {"success":true,...}
curl https://codestorm.dpdns.org/api/v1/           # {"success":true,...}
```

Then in a browser:

- `https://codestorm.dpdns.org/attendence/` → the login screen
- Log in with the seeded admin, then **reload** — you should stay logged in
- Open `https://codestorm.dpdns.org/attendence/students` directly — deep links work
- The top-right badge should read **Live** (real-time socket connected)

---

## Test it on your phone (before deploying)

You can run the app locally and open it on your phone two ways.

### Same Wi-Fi (LAN)

1. Start the stack: `npm run db` and `npm run dev` in `server/` (with
   `SERVE_CLIENT=true`, `CLIENT_BASE_PATH=/attendence/`), after building the
   client with `VITE_BASE_PATH=/attendence/`.
2. Open the firewall so your phone can reach port 5000 — run **`share-lan.cmd`
   as administrator** (it adds the inbound rules and prints your URL), or:
   ```powershell
   New-NetFirewallRule -DisplayName "AMS dev (TCP 5000)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000 -Profile Any
   ```
3. On your phone (same Wi-Fi): `http://<your-PC-IP>:5000/attendence/`.
   Find your IP with `ipconfig` (IPv4 Address). `scripts/lan-qr.html` renders a
   scannable QR code for the link.

### Anywhere (public HTTPS link, free)

A [Cloudflare quick tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
exposes your local server on a random `https://*.trycloudflare.com` URL — no
account needed. Download `cloudflared` once and run:

```powershell
cloudflared tunnel --url http://localhost:5000 --no-autoupdate
```

It prints the public URL; your app is at
`https://<random>.trycloudflare.com/attendence/`. Because the app and API share
that one origin, login, cookies and the real-time socket all work as-is.
The URL is temporary and changes each run.

> **CORS note:** the SPA's own scripts/styles carry an `Origin` header (Vite adds
> `crossorigin`), so a misconfigured allow-list must never reject same-origin
> assets with a 500. `server/src/app.js` simply omits the CORS headers for
> unknown origins instead of throwing — cross-origin reads are still blocked by
> the browser.

---

## Alternative A — Static SPA + API

If you'd rather have the front end on an always-on static host (no cold start)
and accept a cross-origin API:

- **App**: GitHub Pages, served at `https://codestorm.dpdns.org/attendence/`.
  The repo already contains `.github/workflows/deploy-pages.yml` and
  `client/public/404.html` (SPA deep-link fallback) and `client/public/CNAME`.
  Enable **Settings → Pages → Source: GitHub Actions**, and set repository
  variables `VITE_BASE_PATH=/attendence/` and
  `VITE_API_URL=https://<api-host>/api/v1`.
- **API**: Render/Railway/Fly, with `SERVE_CLIENT=false` and
  `CORS_ORIGINS=https://codestorm.dpdns.org`. Because the cookie is then
  cross-site, also set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`.
  Some browsers block third-party cookies, which can drop the session on reload
  — that is why the single-origin option above is recommended.

## Alternative B — Your own VPS (Docker + Nginx)

`docker-compose.yml` and both Dockerfiles are included. Put Nginx in front with
`/attendence/` → the client container and `/api/` → the server container, then
issue a certificate with `certbot`. Set `SERVE_CLIENT=false` and let Nginx serve
the static build.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank page, assets 404 | `VITE_BASE_PATH` was not `/attendence/` at build time — set it and **redeploy**. |
| `/attendence/` returns JSON 404 | `SERVE_CLIENT` is not `true`, or the client build is missing. |
| Health check failing | `MONGODB_URI` wrong, or Atlas IP allow-list doesn't include `0.0.0.0/0`. |
| Logged out on every reload | Cookies blocked — ensure `COOKIE_SECURE=true` and the site is served over HTTPS on one origin. |
| CORS error in console | `CORS_ORIGINS` must exactly match the browser origin, including `https://`. |
| First load very slow | Render free tier waking up — expected; keep it warm with a pinger. |
