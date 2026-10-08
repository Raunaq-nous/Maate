#!/usr/bin/env bash
# ==============================================================================
# Nightly Automated Database Backup to Cloudflare R2
# Dumps PostgreSQL database and streams directly or uploads via AWS CLI (S3 API)
# ==============================================================================

set -euo pipefail

# Load environment variables
if [ -f .env.staging ]; then
    export $(grep -v '^#' .env.staging | xargs)
fi

BACKUP_DIR="/tmp/maate_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="maate_staging_${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Starting PostgreSQL backup for database: ${POSTGRES_DB}..."

# 1. Dump database from container using pg_dump with compression
docker compose -f docker-compose.staging.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${LOCAL_PATH}"

BACKUP_SIZE=$(du -h "${LOCAL_PATH}" | cut -f1)
echo "[$(date -u)] Database dump created successfully: ${LOCAL_PATH} (${BACKUP_SIZE})"

# 2. Upload to Cloudflare R2 using AWS CLI (S3-compatible endpoint)
if command -v aws >/dev/null 2>&1; then
    echo "[$(date -u)] Uploading backup to Cloudflare R2..."
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp "${LOCAL_PATH}" "s3://${R2_BUCKET_NAME}/backups/${FILENAME}" \
      --endpoint-url "${R2_S3_ENDPOINT}" \
      --region auto

    echo "[$(date -u)] Upload to R2 completed: s3://${R2_BUCKET_NAME}/backups/${FILENAME}"
else
    echo "[$(date -u)] WARNING: aws-cli not installed. Backup retained locally at ${LOCAL_PATH}"
fi

# 3. Clean up local backup older than 3 days
find "${BACKUP_DIR}" -name "maate_staging_*.sql.gz" -mtime +3 -delete
echo "[$(date -u)] Backup routine completed successfully."
EOF && chmod +x scripts/backup-postgres.sh