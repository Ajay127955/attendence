# Deploying to `https://codestorm.dpdns.org/attendence/`

A free deployment that puts the app on the same domain as your portfolio, with the
API reached through a **same-origin rewrite** — so login cookies work, there is no
CORS setup, and no subdomain or extra DNS record is needed.

```
https://codestorm.dpdns.org/                 →  portfolio (homepage)
https://codestorm.dpdns.org/attendence/      →  the React app
https://codestorm.dpdns.org/ams/api/v1       →  the REST API   (rewritten to Render)
https://codestorm.dpdns.org/socket.io        →  realtime       (rewritten to Render)
```

| Piece | Free service | What it does |
| --- | --- | --- |
| Portfolio | **Vercel** | Homepage at `/`; `vercel.json` rewrites `/ams/*` and `/socket.io` to the API |
| App SPA | **Vercel** | Serves the built React app from `/attendence/` |
| API + realtime | **Render** (free Web Service) | Express API + Socket.IO |
| Database | **MongoDB Atlas** (M0, free) | Users, students, classes, attendance |
| Domain | **DigitalPlat FreeDomain** (`dpdns.org`) | `codestorm.dpdns.org` (points at Vercel) |
| TLS | Vercel / Render (automatic) | HTTPS on both ends |

> **Free-tier note:** Render's free Web Service sleeps after ~15 minutes idle and
> takes ~50 seconds to wake. Keep it warm for free with
> [UptimeRobot](https://uptimerobot.com) pinging
> `https://codestorm.dpdns.org/ams/api/health` every 10 minutes.
>
> **Why the `/ams` prefix, not `/api`?** The portfolio project contains an `api/`
> serverless-functions folder, so Vercel reserves the whole `/api` prefix and
> refuses to rewrite it to an external host (requests there return a Vercel 404).
> `/ams/*` is free to use.
>
> **Why polling for the socket?** Vercel does not forward WebSocket upgrades for
> external rewrites, so the client is configured with `transports: ['polling']`.
> Real-time updates still work.

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

## Step 2 — Deploy the API on Render (free)

> **Fastest path (Blueprint):** the repo already contains **`render.yaml`**.
> In Render choose **New → Blueprint**, pick your `attendence` repo, and Render
> creates the service and pre-fills everything below. You only type the value
> marked `sync: false` (`MONGODB_URI`). Skip to
> [Step 3](#step-3--create-your-first-admin-account) once it finishes building.
> The manual steps below are the equivalent if you'd rather do it by hand.

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
   | **Build Command** | `cd client && npm ci --include=dev && npm run build && cd ../server && npm ci --omit=dev` |
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
   | `CLIENT_URL` | `https://codestorm.dpdns.org/attendence` |
   | `CORS_ORIGINS` | `https://codestorm.dpdns.org` |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAME_SITE` | `lax` |
   | `COOKIE_DOMAIN` | *(leave empty)* |
   | `SEED_STUDENT_PASSWORD` | *(default password for new/imported students)* |

   > `VITE_BASE_PATH` is read at **build time** by Vite. The Render build above is
   > only a fallback copy of the SPA — the real app is served by Vercel
   > (Step 4) — so you can leave it at the default. `VITE_API_URL` must stay
   > **unset**: the API is same-origin through the portfolio rewrite.
   > Leave `SMTP_*` and `GOOGLE_*` blank unless you want those features.
   >
   > **Why `--include=dev` in the build command?** Render injects your
   > environment variables during the build too, so `NODE_ENV=production` is
   > already set — and plain `npm ci` would then skip `devDependencies`, which
   > is where Vite and Tailwind live, failing the client build. `--include=dev`
   > forces them in for the build only; `--omit=dev` keeps the server install lean.

5. **Create Web Service**. Wait for the build to finish, then confirm the API is
   up at `https://<your-service>.onrender.com/health`.

> **No custom domain on Render.** The portfolio proxies `/ams/*` to this
> service's `*.onrender.com` hostname, so Render never needs a domain or TLS
> certificate of its own.

---

## Step 3 — Create your first admin account

There is no public sign-up — accounts are created by an admin. Bootstrap the very
first admin by pointing the script at your Atlas database from your machine:

```powershell
cd server
$env:MONGODB_URI="mongodb+srv://ams_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/attendance_ams?retryWrites=true&w=majority"
npm run create-admin -- --email admin@yourschool.edu --name "Principal" --password "Str0ng@Pass"
```

(Render's **Shell** tab works too, if it is available on your plan:
`cd server && npm run create-admin -- --email … --password …`.)

Running it again with the same email updates that admin's name/password, so it is
safe to re-run if you forget the credentials. Log in to the app and add teachers
and students from there.

---

## Step 4 — Build the app and publish it with the portfolio (Vercel)

The app is a static build that lives inside your portfolio site at
`/attendence/`, and reaches the API through the portfolio's `/ams/*` rewrite.

1. Build the client with the subfolder base path and the proxied API URL:

   ```powershell
   cd client
   $env:VITE_BASE_PATH="/attendence/"
   $env:VITE_API_URL="/ams/api/v1"
   npm ci
   npm run build
   ```

2. Copy the build into your portfolio's public folder, replacing the old copy:

   ```powershell
   Remove-Item -Recurse -Force "<portfolio>\public\attendence" -ErrorAction SilentlyContinue
   Copy-Item -Recurse client\dist "<portfolio>\public\attendence"
   # GitHub Pages helpers are not used here:
   Remove-Item "<portfolio>\public\attendence\CNAME","<portfolio>\public\attendence\404.html" -ErrorAction SilentlyContinue
   ```

3. Make sure the portfolio's `vercel.json` contains the rewrites (already the
   case for this project):

   ```json
   {
     "rewrites": [
       { "source": "/attendence", "destination": "/attendence/" },
       { "source": "/attendence/:path*", "destination": "/attendence/" },
       { "source": "/ams/:path*", "destination": "https://<your-service>.onrender.com/:path*" },
       { "source": "/socket.io", "destination": "https://<your-service>.onrender.com/socket.io" },
       { "source": "/socket.io/(.*)", "destination": "https://<your-service>.onrender.com/socket.io/$1" }
     ]
   }
   ```

4. Deploy the portfolio to production:

   ```powershell
   cd "<portfolio>"
   npx --yes vercel@latest --prod --yes
   ```

---

## Step 5 — Point your domain at Vercel

`codestorm.dpdns.org` points at **Vercel** (which serves both the portfolio and
the app), not at Render.

1. In Vercel → your portfolio project → **Settings → Domains**, add
   `codestorm.dpdns.org`.
2. Add the DNS record at your DNS provider (DigitalPlat / Cloudflare):

   | Type | Name | Value | TTL |
   | --- | --- | --- | --- |
   | `A` | `@` (or `codestorm`) | `76.76.21.21` | Auto / 300 |

   On Cloudflare, set the record to **DNS only** (grey cloud) so Vercel can issue
   the TLS certificate.
3. Wait for DNS to propagate (a few minutes). Vercel provisions HTTPS
   automatically.

---

## Step 6 — Verify

```bash
curl https://codestorm.dpdns.org/ams/api/health      # {"success":true,...}
curl https://codestorm.dpdns.org/attendence/         # the app HTML
```

Then in a browser:

- `https://codestorm.dpdns.org/` → the portfolio; the project card links to the app
- `https://codestorm.dpdns.org/attendence/` → the login screen (no demo panel)
- Sign in with the admin from Step 3, then **reload** — you should stay logged in
- Open `https://codestorm.dpdns.org/attendence/students` directly — deep links work
- The top-right badge should read **Live** (real-time socket connected)
- The browser console should be free of errors

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

## Alternative A — App + API on one Render origin

If you'd rather not involve Vercel for the app at all, Render can serve both the
SPA and the API from a single origin:

- Set `SERVE_CLIENT=true`, `CLIENT_BASE_PATH=/attendence/` and
  `VITE_BASE_PATH=/attendence/` on the service, and leave `VITE_API_URL` unset.
- Add `codestorm.dpdns.org` as a **Custom Domain** in Render and point the DNS
  record at the Render hostname instead of Vercel.
- Then the app is at `https://codestorm.dpdns.org/attendence/` and the API at
  `https://codestorm.dpdns.org/api/v1` on the same origin — no rewrite needed.

The trade-off is that the app then sleeps with the free Render instance, whereas
hosting the SPA on Vercel keeps the page itself always-on.

## Alternative B — Your own VPS (Docker + Nginx)

`docker-compose.yml` and both Dockerfiles are included. Put Nginx in front with
`/attendence/` → the client container and `/api/` → the server container, then
issue a certificate with `certbot`. Set `SERVE_CLIENT=false` and let Nginx serve
the static build.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank page, assets 404 | `VITE_BASE_PATH` was not `/attendence/` at build time — rebuild and redeploy the portfolio. |
| `/attendence/` returns JSON 404 | The portfolio rewrite is missing, or `public/attendence/index.html` was not copied. |
| `/ams/...` returns a Vercel 404 | The rewrite destination host is wrong, or you used `/api/*` (reserved by Vercel). |
| Health check failing | `MONGODB_URI` wrong, or Atlas IP allow-list doesn't include `0.0.0.0/0`. |
| Logged out on every reload | Cookies blocked — ensure the site is served over HTTPS on one origin and `COOKIE_SECURE=true`. |
| "Live" badge never turns on | Vercel does not forward WebSocket upgrades; the client must use `transports: ['polling']`. |
| First load very slow | Render free tier waking up — expected; keep it warm with a pinger. |
