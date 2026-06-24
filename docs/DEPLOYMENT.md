# CORTEX Deployment Guide

This guide documents the real deployment process for CORTEX v0.1.x.

Hosting architecture:

- **Backend**: [Railway](https://railway.com) (Docker-based)
- **Frontend**: [Netlify](https://netlify.com) (static site)
- **Data & Auth**: [Supabase Cloud](https://supabase.com)

---

## 1. Prerequisites

Before deploying, make sure you have:

- A Railway account and project.
- A Netlify account and site.
- A Supabase project with Auth enabled and the operational schema already applied.
- The repository pushed to a Git provider connected to both Railway and Netlify.

---

## 2. Required environment variables

### Backend (Railway)

| Variable | Purpose | Example |
| --- | --- | --- |
| `APP_ENV` | Runtime environment flag | `production` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://cortex-app.netlify.app` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key for DB access | `eyJ...` |
| `SUPABASE_JWT_SECRET` | JWT secret used to validate Supabase Auth tokens | `your-jwt-secret` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_INVITE_REDIRECT_URL` | Frontend URL where Supabase redirects after an invite email | `https://cortex-app.netlify.app/auth/invite` |
| `ENCRYPTION_KEY` | Base64-encoded Fernet key for provider API keys | `base64...` |
| `PORT` | Injected by Railway automatically | `8000` |

Set these in the Railway service **Variables** tab. The `PORT` variable is normally injected by the platform.

For local development, the same backend variables live in `cortex-backend/.env`.

Example local backend invite redirect:

```env
SUPABASE_INVITE_REDIRECT_URL=http://localhost:5173/auth/invite
```

Example production backend invite redirect:

```env
SUPABASE_INVITE_REDIRECT_URL=https://cortex-app.netlify.app/auth/invite
```

> **Important**: `SUPABASE_INVITE_REDIRECT_URL` is a backend variable, not a frontend one. The backend passes it to Supabase when the `super_admin` sends an invite.

### Frontend (Netlify)

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the Railway backend | `https://cortex-api.up.railway.app` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |

Set these in the Netlify site **Site configuration > Environment variables** panel. They are captured at build time by Vite.

> **Important**: Always use `https://` for `VITE_API_BASE_URL` in production. Using `http://` causes mixed-content errors in the browser.

---

## 3. Railway backend deploy

### 3.1 Monorepo root configuration

Because this repository is a monorepo, Railway needs an explicit root-level configuration file to know where the backend lives.

`railway.json` (already in repo root):

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "cortex-backend/Dockerfile.railway"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Without this file, Railway scans the repo root and fails to detect the backend automatically.

### 3.2 Production Dockerfile

`cortex-backend/Dockerfile.railway` builds the backend from the monorepo root:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY cortex-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY cortex-backend/app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE ${PORT:-8000}

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Key points:

- It uses `${PORT}` so Railway can inject the platform port.
- It does **not** use `--reload`; that is reserved for local development.

### 3.3 Service settings

In the Railway service panel:

1. **Root directory**: leave empty. The `railway.json` file controls the build context.
2. **Custom domain** (optional): generate a Railway domain or attach your own.
3. **Healthcheck**: Railway uses `/health` as configured in `railway.json`.

### 3.4 Deploy flow

1. Push changes to the connected branch.
2. Railway triggers a new deploy automatically.
3. Wait for the healthcheck to pass (`/health` returns `200 OK`).
4. Copy the generated backend domain for the Netlify environment variable.

---

## 4. Netlify frontend deploy

### 4.1 Build configuration

`cortex-frontend/netlify.toml`:

```toml
[build]
  base = "cortex-frontend"
  command = "pnpm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

# SPA fallback: React Router handles all client-side routes.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Cache hashed assets indefinitely.
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Key points:

- `base` points to the frontend package directory in the monorepo.
- `command` runs the Vite production build.
- `publish` uses the `dist` folder generated by Vite.
- The `redirects` rule enables React Router client-side routing.

### 4.2 Site settings

In the Netlify site panel:

1. **Base directory**: `cortex-frontend`.
2. **Build command**: `pnpm run build` (or leave it to `netlify.toml`).
3. **Publish directory**: `dist` (or leave it to `netlify.toml`).
4. Add the environment variables listed in section 2.

If the Netlify UI does not let you clear the package directory field cleanly, use the repository root as the base and set:

- **Package directory**: `cortex-frontend`
- **Publish directory**: `cortex-frontend/dist`

### 4.3 Deploy flow

1. Push changes to the connected branch.
2. Netlify installs dependencies and runs `pnpm run build`.
3. Verify the deploy log shows the build completed and assets were published.
4. Open the generated Netlify URL.

---

## 5. External integrations

### 5.1 Backend CORS

The backend allows cross-origin requests from the origins listed in `CORS_ORIGINS`. After deploying the frontend, update the backend variable with the exact Netlify domain:

```
CORS_ORIGINS=https://cortex-app.netlify.app
```

Then trigger a Railway redeploy so the change is picked up.

### 5.2 Supabase Auth redirect URLs

The invite/activation flow requires the production redirect URL to be allow-listed in Supabase:

1. Go to **Authentication > URL Configuration**.
2. Set **Site URL** to the Netlify site URL, for example:
   - `https://cortex-app.netlify.app`
3. Add the invite callback path as an additional redirect URL:
   - `https://cortex-app.netlify.app/auth/invite`

Make sure `SUPABASE_INVITE_REDIRECT_URL` in Railway matches this exact URL.

If this value is missing or still points to `localhost` in production, Supabase can send valid invite emails with a broken redirect target. That means the email arrives, but the invited user lands on the wrong URL and cannot complete activation.

If you use magic links or OAuth through Supabase Auth, the same redirect URL allow-list applies; the `**` wildcard can cover React Router paths when needed.

---

## 6. Troubleshooting

### Railway: "No app detected" at monorepo root

**Symptom**: Railway fails to build because it cannot detect the application from the repository root.

**Fix**: Ensure `railway.json` exists in the repo root and points to `cortex-backend/Dockerfile.railway`. Do not rely on auto-detection in a monorepo.

### Railway: 502 / domain does not reach the app

**Symptom**: Requests to the Railway domain return 502, or the healthcheck never passes.

**Fix**:

- Check that the backend container is listening on `$PORT`.
- The Dockerfile uses `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
- Confirm `railway.json` has `"deploy.healthcheckPath": "/health"`.
- Verify the backend actually starts and `/health` returns `200` in the deploy logs.

### Netlify: deploy finishes but shows the repository root

**Symptom**: Netlify serves the repo files instead of the built frontend.

**Fix**: Set the **Base directory** to `cortex-frontend` and the **Publish directory** to `dist`. Alternatively, let `netlify.toml` handle both values.

### Browser: mixed content errors

**Symptom**: API calls fail with `Mixed Content` errors.

**Fix**: Set `VITE_API_BASE_URL` to `https://...`, never `http://...`.

### `/breweries` fails while other entity lists work

**Symptom**: The breweries list loads locally but fails in production with a redirect or mixed-content error.

**Root cause**: The breweries router originally exposed list/create at `/breweries/` (with trailing slash). FastAPI issued a 307 redirect to the slash version, and in some hosted setups the redirect was downgraded to `http`, triggering mixed-content failures.

**Fix**: The breweries router now accepts both `/breweries` and `/breweries/` directly, avoiding the redirect. If you still see this issue, make sure your deployed backend includes the fix (commit `8e69a5a` or later).

---

## 7. Post-deploy checklist

Use this list after both Railway and Netlify report a successful deploy.

- [ ] Railway `/health` returns `200 OK`.
- [ ] Backend environment variables are set and the container started without errors.
- [ ] `CORS_ORIGINS` includes the exact Netlify production URL.
- [ ] `SUPABASE_INVITE_REDIRECT_URL` matches the production frontend invite page exactly.
- [ ] Netlify build log shows `pnpm run build` completed and published `dist/`.
- [ ] Frontend environment variables use `https://` for `VITE_API_BASE_URL`.
- [ ] Supabase Auth allow-list includes the same `/auth/invite` production URL.
- [ ] Login works from the Netlify URL.
- [ ] Chat returns a streamed response.
- [ ] All four entity lists load: breweries, coffee farms, wine producers, animal feed producers.
- [ ] Entity create/update/delete flows work for at least one table.
- [ ] Supabase Auth redirect URLs include the Netlify production domain and `/auth/invite` path.
- [ ] `SUPABASE_INVITE_REDIRECT_URL` matches the production invite callback URL.
- [ ] A super_admin can invite a new user and the activation email arrives.
- [ ] The invited user can set a password at `/auth/invite` and log in.

Once every item passes, the deployment is complete.
