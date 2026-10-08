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
> [!IMPORTANT]
> Compiling `torch` and sentence-transformers on a 4GB VPS can consume excessive CPU/RAM during Docker builds.  
> **Recommended**: Build images on your workstation or GitHub Actions (GHCR) and push them, or ensure the 4GB Swap configured in Step 2.4 is active if building directly on the VPS (`docker compose -f docker-compose.staging.yml build`).

---

## 3. DNS Configuration

In your DNS provider (Cloudflare, Namecheap, etc.):
1. Create an **A record**:
   - **Name**: `api.staging` (or `api`)
   - **Target**: `<YOUR_SERVER_IP>`
   - **Proxy**: DNS Only (grey cloud if using Cloudflare initially, so Caddy can perform ACME HTTP-01 challenge).

---

## 4. First Staging Deployment

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
### Step 4.2: Cloudflare R2 Bucket CORS Configuration
In the Cloudflare Dashboard, navigate to **R2 > your bucket (`maate-staging-documents`) > Settings > CORS Policy**, and paste this JSON policy to permit browser `PUT` uploads from your Vercel frontend:
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

### Step 4.3: Start Staging Stack & Run Migrations
```bash
# 1. Start containers
docker compose -f docker-compose.staging.yml up -d --build

# 2. Run migrations against the empty database (creates vector extension and tables)
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
