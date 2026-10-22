# MAATE — Beginner's Production Staging Deployment Guide (Option B)

This runbook guides you through deploying the **Maate Backend Stack** to a single Linux VPS (Hetzner CX22 / 4GB RAM or equivalent) using Docker Compose and Caddy, with **Frontend Web on Vercel** and **Storage on Cloudflare R2**.

---

## 1. Architecture Overview (Why Each Piece Exists)

- **Vercel (Web Frontend)**: Hosts Next.js at the edge. Scales automatically to zero, serves SSR pages, and communicates with your API over HTTPS.
- **VPS with Docker Compose (Backend Core)**: Runs PostgreSQL (with `pgvector`), Redis (cache/queues), NestJS API, FastAPI OCR (Tesseract), and FastAPI AI (PyTorch embeddings + Groq).
- **Caddy (Reverse Proxy & Automatic SSL)**: The only service listening on ports 80/443. Automatically requests, renews, and configures Let's Encrypt TLS certificates. Proxies API traffic to your internal NestJS container.
- **Cloudflare R2 (Object Storage)**: S3-compatible cloud storage with $0 egress fees. Stores user-uploaded medical PDFs, scans, and nightly database backups.

---

## 2. Server Preparation & Security Hardening

Before launching containers, secure your server:

### Step 2.1: SSH Keys Only (Disable Password Login)
1. Generate an SSH key on your local computer (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "admin@maate"
   ```
2. Copy the key to your server:
   ```bash
   ssh-copy-id root@<YOUR_SERVER_IP>
   ```
3. On the VPS, edit `/etc/ssh/sshd_config`:
   ```bash
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   ```
4. Restart SSH: `systemctl restart sshd`

### Step 2.2: Firewall (UFW)
Open only required ports (SSH, HTTP, HTTPS) and block all database/internal ports from the public internet:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Step 2.3: Fail2ban (Brute-Force Protection)
```bash
apt-get update && apt-get install -y fail2ban
systemctl enable fail2ban && systemctl start fail2ban
```

### Step 2.4: Configure 4GB Swap Space (Crucial for 4GB RAM VPS)
PyTorch, Tesseract, and Node.js compilers require burst memory headroom. Configuring 4GB of swap prevents Linux Out-Of-Memory (OOM) kills:
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Step 2.5: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Step 2.6: Image Building Guidance (Pre-building or Local Build)
### Step 2.6: Image Building & Registry Strategy (GitHub Packages / GHCR)
> [!IMPORTANT]
> To save memory and prevent high CPU usage on the 4GB VPS, all microservices (`api`, `ai-service`, `ocr-service`) are automatically built in GitHub Actions on every push to `main` and published to **GitHub Container Registry (GHCR)**:
> - `ghcr.io/haus-nous/maate-api:latest`
> - `ghcr.io/haus-nous/maate-ai-service:latest`
> - `ghcr.io/haus-nous/maate-ocr-service:latest`
> 
> On your VPS, `docker-compose.staging.yml` automatically pulls these pre-built images. If GHCR packages are private, log in on the VPS once:
> ```bash
> echo "<GITHUB_PAT>" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin
> ```

---

## 3. Mandatory Placeholders Checklist (Before First Deploy)

Before launching staging, you must replace the following placeholders across your configuration files:

| Config Location | Placeholder Variable | Description & Required Real Value |
| :--- | :--- | :--- |
| **`apps/web/vercel.json`** | `connect-src ... https://api.staging.yourdomain.com` | Replace with your exact public API domain (e.g. `https://api.staging.example.com`). |
| **Cloudflare R2 Bucket Settings** | `AllowedOrigins` in CORS JSON | Must be your exact Vercel staging URL (e.g. `https://maate-staging.vercel.app` or custom staging domain). **No wildcards allowed (`https://*.vercel.app` is removed)**. |
| **`Caddyfile`** | `api.staging.yourdomain.com` | Replace with the exact domain pointing to your VPS IP in DNS. |
| **`Caddyfile`** | `admin@yourdomain.com` | Replace with your email for Let's Encrypt TLS renewal notifications. |
| **`.env.staging`** | `CORS_ORIGINS` | Set to your exact Vercel web staging origin (e.g. `https://maate-staging.vercel.app`). |
| **`.env.staging`** | `STAGING_API_DOMAIN` | Set to your API domain (e.g. `api.staging.example.com`). |
| **`.env.staging`** | `R2_S3_ENDPOINT` | Set to `https://<account_id>.r2.cloudflarestorage.com`. |
| **`.env.staging`** | `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY` | Set to Cloudflare R2 API Token credentials. |
| **`.env.staging`** | `GROQ_API_KEY` | Real Groq API key from console.groq.com. |
| **`apps/web` (Vercel)** | `NEXT_PUBLIC_API_URL` | Set to `https://api.staging.yourdomain.com/api/v1`. |

---

## 4. DNS Configuration

In your DNS provider (Cloudflare, Namecheap, etc.):
1. Create an **A record**:
   - **Name**: `api.staging` (or `api`)
   - **Target**: `<YOUR_SERVER_IP>`
   - **Proxy**: DNS Only (grey cloud if using Cloudflare initially, so Caddy can perform ACME HTTP-01 challenge).

---

## 5. First Staging Deployment

1. On your VPS, clone the repository:
   ```bash
   git clone https://github.com/Haus-Nous/Maate.git /opt/maate
   cd /opt/maate
   ```
2. Create your staging environment file:
   ```bash
   cp .env.staging.example .env.staging
   nano .env.staging
   ```
3. Fill in all generated secrets:
   ```bash
   # Quick secret generator commands to paste into .env.staging:
   openssl rand -base64 32 # for JWT_SECRET
   openssl rand -base64 32 # for JWT_REFRESH_SECRET
   openssl rand -base64 32 # for MFA_ENCRYPTION_KEY
   openssl rand -base64 24 # for POSTGRES_PASSWORD
   openssl rand -base64 24 # for REDIS_PASSWORD
   ```
### Step 5.2: Cloudflare R2 Bucket CORS Configuration
In the Cloudflare Dashboard, navigate to **R2 > your bucket (`maate-staging-documents`) > Settings > CORS Policy**, and paste this JSON policy (permits browser `PUT` uploads exclusively from your Vercel staging domain):
```json
[
  {
    "AllowedOrigins": [
      "https://your-staging-web.vercel.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 5.3: Start Staging Stack & Run Migrations
```bash
# 1. Pull pre-built images from GHCR and start containers
docker compose -f docker-compose.staging.yml pull
docker compose -f docker-compose.staging.yml up -d

# 2. Run migrations against the empty database (creates vector extension, schema, and tables)
docker compose -f docker-compose.staging.yml exec api pnpm prisma:migrate:deploy

# NOTE: Do NOT run db:seed in staging. Staging starts with an empty database.
# Synthetic test users are created via standard registration (/auth/register).

# 3. Check health
docker compose -f docker-compose.staging.yml ps
curl https://api.staging.yourdomain.com/api/v1/health
```

---

## 5. Web Frontend Deployment on Vercel

1. In Vercel Dashboard, import the `Maate` repository.
2. Set **Root Directory** to `apps/web`.
3. Framework Preset: `Next.js`.
4. Build Command: `pnpm run build`.
5. Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://api.staging.yourdomain.com/api/v1`
6. Deploy!

### Authentication & Cookies Note:
- All API requests use the standard **`Authorization: Bearer <accessToken>`** HTTP header.
- The web app sets a client-side document cookie (`maate_token`) exclusively for Next.js edge route middleware hydration (`middleware.ts`). All backend NestJS endpoints authenticate strictly via the `Authorization` header.

---

## 6. Nightly Backups & Disaster Recovery

### Automated Cron Job
On your VPS, install the backup script to run nightly at 2:00 AM UTC:
```bash
crontab -e
# Add this line:
0 2 * * * cd /opt/maate && ./scripts/backup-postgres.sh >> /var/log/maate-backup.log 2>&1
```

### Restore Procedure & Verification
To restore from an R2 backup:
```bash
# 1. Download backup file
aws s3 cp s3://<BUCKET>/backups/maate_staging_<TIMESTAMP>.sql.gz /tmp/restore.sql.gz \
  --endpoint-url <R2_ENDPOINT> --region auto

# 2. Decompress and restore into Postgres container
gunzip -c /tmp/restore.sql.gz | docker compose -f docker-compose.staging.yml exec -T postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## 7. Updates & Rollback Plan

### Updating Staging:
```bash
cd /opt/maate
git pull origin main
docker compose -f docker-compose.staging.yml build api ocr-service ai-service
docker compose -f docker-compose.staging.yml up -d --remove-orphans
docker compose -f docker-compose.staging.yml exec -T api pnpm prisma:migrate:deploy
```

### Rollback Plan:
If a deployment fails:
1. Revert to the previous git commit:
   ```bash
   git checkout HEAD~1
   ```
2. Rebuild and restart the previous stable containers:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   ```
3. If database schema was changed, restore the latest pre-deploy backup using the restore procedure above.

---

## 8. Outside-VPS Smoke Test

From your local machine (outside the server), run the smoke test against the public domain:
```bash
./scripts/smoke-test.sh https://api.staging.yourdomain.com
```
This script tests:
1. System Health endpoint (`/api/v1/health`)
2. User Registration (`/api/v1/auth/register`)
3. User Login & Token Issuance (`/api/v1/auth/login`)
4. DPDP Purpose Consent Grant (`/api/v1/consents`)
5. S3/R2 Presigned Upload URL generation (`/api/v1/documents/upload-url`)
6. RAG Health Assistant Query (`/api/v1/chat/message`)
7. Data Portability Export Request (`/api/v1/compliance/export`)
