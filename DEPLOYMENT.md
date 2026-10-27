# CatchAndWatch — Deployment Guide

## 🚀 Quick Update Command

**After pushing your changes to GitHub, SSH into the production VPS and run:**

```bash
deploy-catchwatch
```

This deployment script is installed on the production VPS at:

```text
/usr/local/bin/deploy-catchwatch
```

It pulls the latest code from the `main` branch, validates Docker Compose, rebuilds and updates the containers, and checks the production URLs.

**Important:** The deployment script must exist on the VPS before using this command. Review its contents before running it if the deployment setup has changed.

---

## 1. Production Architecture

CatchAndWatch uses Docker containers for the backend, admin panel, and public website.

| Component | Technology | Production URL | Local VPS Port |
|---|---|---|---|
| Backend API | Node.js, Express.js | https://api.catchandwatch.com | 15000 → 5000 |
| Admin Panel | React, Vite, Nginx | https://admin.catchandwatch.com | 18081 → 80 |
| Public Website | React, Nginx | https://www.catchandwatch.com | 18082 → 80 |
| Reverse Proxy | Host Nginx | HTTPS entry point | 80 / 443 |
| Database | MongoDB Atlas | Managed database | External |
| SSL | Let's Encrypt / Certbot | HTTPS certificates | Managed by host Nginx |

The apex domain `catchandwatch.com` redirects to `www.catchandwatch.com`.

### Request Flow

```text
Users / Browsers
       |
       v
   HTTPS / SSL
       |
       v
    Host Nginx
       |
       +----------------------------+
       |              |             |
       v              v             v
 API :443         Admin :443     Website :443
       |              |             |
       v              v             v
 Docker Backend   Docker Admin   Docker Website
 127.0.0.1:15000  127.0.0.1:18081 127.0.0.1:18082
       |
       +------ MongoDB Atlas
       +------ Firebase
       +------ Razorpay
```

---

## 2. Repository Structure

```text
CatchWatch/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   └── package.json
│
├── website/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   └── package.json
│
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

Additional application files and directories may exist inside each component.

### Component Responsibilities

- `backend/`: Node.js API, authentication, business logic, database connectivity, and Socket.IO.
- `frontend/`: React/Vite admin dashboard.
- `website/`: Public React website.
- `docker-compose.yml`: Defines the three application services, their ports, networks, environment configuration, and restart policies.
- `Dockerfile`: Defines how each application image is built.
- `nginx.conf`: Configures Nginx inside the frontend containers to serve the frontend and support SPA routes.
- `DEPLOYMENT.md`: Production deployment and maintenance instructions.

---

## 3. Standard Development and Deployment Workflow

### Step 1: Make Changes

Update the required application files and test the changes.

### Step 2: Commit and Push to GitHub

From your development machine:

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

If you work on another branch, merge the approved changes into `main` before deploying.

### Step 3: Connect to the Production VPS

SSH into the production server and navigate to the repository:

```bash
cd /var/www/CatchWatch
```

### Step 4: Deploy

Run:

```bash
deploy-catchwatch
```

The script performs the following operations:

1. Pulls the latest code from `origin/main`.
2. Validates the Docker Compose configuration.
3. Builds updated Docker images.
4. Recreates or updates application containers as needed.
5. Displays container status.
6. Checks the production URLs.

If deployment fails, inspect the logs before attempting another deployment.

---

## 4. Manual Deployment Commands

Use these commands if the deployment script is unavailable or manual troubleshooting is necessary.

### Check the Current Git State

```bash
cd /var/www/CatchWatch
git status
git branch --show-current
```

### Pull Latest Code

```bash
git pull --ff-only origin main
```

Do not use `git reset --hard` or discard local changes without reviewing them first.

### Validate Docker Compose

```bash
docker compose config -q
```

No output generally indicates successful validation.

### Build and Update Containers

```bash
docker compose up -d --build --remove-orphans
```

### View Running Containers

```bash
docker compose ps
```

### View Backend Logs

```bash
docker compose logs --tail=100 backend
```

### View Admin Logs

```bash
docker compose logs --tail=100 admin
```

### View Website Logs

```bash
docker compose logs --tail=100 website
```

### Follow Backend Logs Live

```bash
docker compose logs -f backend
```

Press `Ctrl+C` to stop following logs. This does not stop the container.

---

## 5. Environment Variables and Secrets

The backend uses:

```text
backend/.env
```

The production frontend API URL is configured through the Docker build argument:

```text
VITE_API_BASE_URL=https://api.catchandwatch.com/api
```

The public website API URL is configured through:

```text
REACT_APP_API_URL=https://api.catchandwatch.com
```

These frontend values are injected during image builds.

### Security Rules

- Never commit `.env` files containing production credentials.
- Never put MongoDB credentials, JWT secrets, Firebase private keys, or payment gateway secrets in GitHub.
- Do not paste production secrets into logs, issues, or documentation.
- Keep `.dockerignore` files configured to exclude `.env`, `node_modules`, and generated build directories.
- If a secret is exposed, rotate it immediately.
- Review Git changes before committing.

Changing a frontend build argument requires rebuilding the relevant image.

---

## 6. Production Health Checks

### API

```bash
curl -sS -o /dev/null -w 'API: %{http_code}\n' \
  https://api.catchandwatch.com/
```

Expected result:

```text
API: 200
```

### Admin Panel

```bash
curl -sS -o /dev/null -w 'Admin: %{http_code}\n' \
  https://admin.catchandwatch.com/
```

Expected result:

```text
Admin: 200
```

### Public Website

```bash
curl -sS -o /dev/null -w 'Website: %{http_code}\n' \
  https://www.catchandwatch.com/
```

Expected result:

```text
Website: 200
```

An HTTP 200 response confirms that the URL responds successfully, but it does not prove that every application feature works.

Also test:

- User login and registration.
- Admin login and dashboard.
- Protected API requests.
- Socket.IO connections and real-time notifications.
- Video playback.
- Payment workflows, using an appropriate test procedure.

A `401 Unauthorized` response from a protected API without an authentication token can be expected.

---

## 7. Docker Startup and Restart Policies

The application containers use:

```yaml
restart: unless-stopped
```

This allows Docker to restart containers automatically after failures and normally after a VPS reboot, provided Docker itself starts successfully and the containers have not been explicitly stopped.

Check Docker service status:

```bash
systemctl is-enabled docker
systemctl status docker --no-pager
```

Check container restart policies:

```bash
docker inspect -f \
  '{{.Name}} => {{.HostConfig.RestartPolicy.Name}}' \
  catchwatch-backend catchwatch-admin catchwatch-website
```

Expected policy:

```text
unless-stopped
```

Do not reboot a production server solely to test startup without first planning an appropriate maintenance window.

---

## 8. Nginx and SSL

Host Nginx terminates HTTPS and proxies requests to the local Docker ports.

Relevant configuration files:

```text
/etc/nginx/sites-available/backend
/etc/nginx/sites-available/admin
/etc/nginx/sites-available/website
```

Before reloading Nginx after any configuration change:

```bash
nginx -t
```

If the configuration test succeeds:

```bash
systemctl reload nginx
```

Check recent Nginx errors:

```bash
tail -n 50 /var/log/nginx/error.log
```

The Docker deployment process normally does not require Nginx or SSL changes when application code is updated.

---

## 9. Troubleshooting

### API Returns HTTP 502

Check the backend container:

```bash
docker compose ps
docker compose logs --tail=100 backend
curl -i http://127.0.0.1:15000/
```

Check Nginx upstream configuration:

```bash
grep -n "proxy_pass" /etc/nginx/sites-available/backend
```

The API and Socket.IO proxy locations should point to:

```text
http://127.0.0.1:15000
```

If Nginx configuration was changed, validate and reload it.

### Admin or Website Is Not Updating

Rebuild the appropriate service:

```bash
docker compose up -d --build admin
```

For the public website:

```bash
docker compose up -d --build website
```

If the API code changed:

```bash
docker compose up -d --build backend
```

After a frontend deployment, hard-refresh the browser and check for stale browser caches if old assets remain visible.

### Backend Does Not Start

Inspect the logs:

```bash
docker compose logs --tail=150 backend
```

Check environment configuration and database connectivity without exposing secrets.

### Git Pull Fails

Check:

```bash
git status
git branch --show-current
git log -5 --oneline
```

Resolve local changes or branch divergence deliberately. Do not force-reset the production repository without confirming which changes must be retained.

### Docker Compose Validation Fails

Run:

```bash
docker compose config
```

Review the reported YAML or environment-variable error. Do not display or publish secret values while troubleshooting.

---

## 10. Deployment Safety Checklist

Before deploying:

- [ ] Changes are pushed to the correct GitHub branch.
- [ ] Production changes have been reviewed.
- [ ] Environment variables and secrets are protected.
- [ ] Database migrations, if any, have been planned.
- [ ] Required dependencies and lockfiles are updated.
- [ ] Docker Compose configuration is valid.

After deploying:

- [ ] All three containers are running.
- [ ] API returns HTTP 200.
- [ ] Admin panel loads and login works.
- [ ] Public website loads and login works.
- [ ] Socket.IO and video playback work.
- [ ] Payment-related functionality has been tested where appropriate.
- [ ] Logs contain no new critical errors.

---

## 11. Important Production Notes

- Production repository path: `/var/www/CatchWatch`
- Production branch: `main`
- Compose file: `/var/www/CatchWatch/docker-compose.yml`
- Deployment command: `deploy-catchwatch`
- Docker Compose project uses three application services: `backend`, `admin`, and `website`.
- MongoDB Atlas is external to the Docker Compose application.
- Host Nginx and Certbot are managed separately from the application containers.
- The deployment script performs URL checks; application-level testing is still required.
- Automatic deployment on every GitHub push requires a separate CI/CD workflow, such as GitHub Actions.

**Always review changes and verify production functionality after deployment.**
