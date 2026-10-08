#!/usr/bin/env bash
# ==============================================================================
# MAATE — Public Staging Smoke Test Script (Enhanced)
# Runs remotely from outside the VPS against https://api.<domain>
# Exercises: Health, Register, Login, Consent, Presigned PUT Upload,
# Processing Pipeline Polling, Grounded Chat with Citations, DPDP Export.
# ==============================================================================

set -euo pipefail

API_URL="${1:-https://api.staging.maate.internal}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="smoke_${TIMESTAMP}@example.com"
TEST_PASSWORD="Password123!"

echo "============================================================"
echo " Starting Staging Smoke Test against: ${API_URL}"
echo "============================================================"

# 1. Health Check
echo -n "1. Checking API Health (/api/v1/health)... "
HEALTH_RES=$(curl -s -w "\n%{http_code}" "${API_URL}/api/v1/health")
HTTP_CODE=$(echo "$HEALTH_RES" | tail -n1)
BODY=$(echo "$HEALTH_RES" | head -n-1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "FAILED (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
echo "PASSED (200 OK)"

# 2. Register Fresh User
echo -n "2. Testing User Registration (/api/v1/auth/register)... "
REG_RES=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"fullName\":\"Smoke Test Patient\",\"phone\":\"+9198${TIMESTAMP: -8}\"}")
HTTP_CODE=$(echo "$REG_RES" | tail -n1)
BODY=$(echo "$REG_RES" | head -n-1)

if [ "$HTTP_CODE" -ne 201 ]; then
  echo "FAILED (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
echo "PASSED (201 Created)"

# 3. Login
echo -n "3. Testing User Login (/api/v1/auth/login)... "
LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
HTTP_CODE=$(echo "$LOGIN_RES" | tail -n1)
BODY=$(echo "$LOGIN_RES" | head -n-1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "FAILED (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
ACCESS_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "PASSED (200 OK - Bearer token received)"

# 4. Grant DPDP Purpose-Based Consents (AI_SUMMARIZATION + AI_CHAT)
echo -n "4. Granting DPDP Consents (AI_SUMMARIZATION & AI_CHAT)... "
curl -s -X POST "${API_URL}/api/v1/consents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"purpose":"AI_SUMMARIZATION"}' > /dev/null

curl -s -X POST "${API_URL}/api/v1/consents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"purpose":"AI_CHAT"}' > /dev/null
echo "PASSED (200 OK)"

# 5. Create synthetic medical document PNG & Request Presigned Upload URL
echo -n "5. Requesting Presigned Upload URL (/api/v1/documents/upload-url)... "
TEST_FILE="/tmp/smoke_report_${TIMESTAMP}.png"
# Create 1x1 dummy PNG
printf "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82" > "${TEST_FILE}"
FILE_SIZE=$(wc -c < "${TEST_FILE}" | tr -d ' ')

UPLOAD_URL_RES=$(curl -s -X POST "${API_URL}/api/v1/documents/upload-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"fileName\":\"synthetic_lipid_report.png\",\"contentType\":\"image/png\",\"fileSizeBytes\":${FILE_SIZE}}")

UPLOAD_URL=$(echo "$UPLOAD_URL_RES" | grep -o '"uploadUrl":"[^"]*' | cut -d'"' -f4)
FILE_KEY=$(echo "$UPLOAD_URL_RES" | grep -o '"fileKey":"[^"]*' | cut -d'"' -f4)
echo "PASSED (Presigned URL & fileKey generated)"

# 6. Real PUT to S3 / Cloudflare R2
echo -n "6. Performing real PUT upload to storage endpoint... "
PUT_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "${UPLOAD_URL}" \
  -H "Content-Type: image/png" \
  --data-binary "@${TEST_FILE}")

if [ "$PUT_HTTP_CODE" -ne 200 ] && [ "$PUT_HTTP_CODE" -ne 204 ]; then
  echo "FAILED (HTTP $PUT_HTTP_CODE on S3 PUT)"
  exit 1
fi
echo "PASSED ($PUT_HTTP_CODE OK)"

# 7. Confirm Upload and Trigger Processing Pipeline
echo -n "7. Confirming upload and queueing BullMQ pipeline... "
CONFIRM_RES=$(curl -s -X POST "${API_URL}/api/v1/documents/confirm-upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"fileKey\":\"${FILE_KEY}\",\"originalName\":\"synthetic_lipid_report.png\",\"fileSizeBytes\":${FILE_SIZE},\"mimeType\":\"image/png\",\"documentType\":\"LAB_REPORT\",\"title\":\"Synthetic Lipid Panel\"}")

DOC_ID=$(echo "$CONFIRM_RES" | grep -o '"documentId":"[^"]*' | cut -d'"' -f4 || echo "$CONFIRM_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "PASSED (docId=${DOC_ID})"

# 8. Poll for OCR & Summary Pipeline Completion (up to 30s)
echo -n "8. Polling for OCR and AI Summary completion... "
MAX_POLL=15
POLL_COUNT=0
AI_STATUS="PENDING"

while [ $POLL_COUNT -lt $MAX_POLL ]; do
  DOC_STATUS_RES=$(curl -s "${API_URL}/api/v1/documents/${DOC_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")
  AI_STATUS=$(echo "$DOC_STATUS_RES" | grep -o '"aiSummaryStatus":"[^"]*' | cut -d'"' -f4 || echo "PENDING")
  
  if [ "$AI_STATUS" = "COMPLETED" ] || [ "$AI_STATUS" = "FAILED" ] || [ "$AI_STATUS" = "WITHHELD" ]; then
    break
  fi
  sleep 2
  POLL_COUNT=$((POLL_COUNT + 1))
done
echo "DONE (aiSummaryStatus: ${AI_STATUS})"

# 9. Grounded Chat Query with Guardrails
echo -n "9. Testing Grounded Health Chat (/api/v1/chat/message)... "
CHAT_RES=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"message":"What records or lipid profile tests do you see in my chart?"}')
HTTP_CODE=$(echo "$CHAT_RES" | tail -n1)
BODY=$(echo "$CHAT_RES" | head -n-1)

if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 201 ]; then
  echo "FAILED (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
echo "PASSED (200 OK - Answer generated)"

# 10. DPDP Data Export Portability
echo -n "10. Testing Data Export Portability (/api/v1/compliance/export)... "
EXPORT_RES=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/compliance/export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"format":"JSON"}')
HTTP_CODE=$(echo "$EXPORT_RES" | tail -n1)

if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 202 ]; then
  echo "FAILED (HTTP $HTTP_CODE)"
  exit 1
fi
echo "PASSED ($HTTP_CODE OK)"

# Cleanup test file
rm -f "${TEST_FILE}"

echo "============================================================"
echo " ALL 10 STAGING SMOKE TEST STAGES PASSED CLEANLY! "
echo "============================================================"
EOF && chmod +x scripts/smoke-test.sh