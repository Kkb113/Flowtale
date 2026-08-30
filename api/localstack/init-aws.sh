#!/usr/bin/env bash
set -euo pipefail

FABLE_ASSET_BUCKET="${ASSET_BUCKET_NAME:-flowtale-local-assets}"
FABLE_PRIVATE_BUCKET="${PVT_ASSET_BUCKET_NAME:-pvt-mics}"
FABLE_QUEUE="${SQS_QUEUE_NAME:-tour_app_queue}"

awslocal s3api head-bucket --bucket "${FABLE_ASSET_BUCKET}" 2>/dev/null \
  || awslocal s3 mb "s3://${FABLE_ASSET_BUCKET}"
awslocal s3api head-bucket --bucket "${FABLE_PRIVATE_BUCKET}" 2>/dev/null \
  || awslocal s3 mb "s3://${FABLE_PRIVATE_BUCKET}"

FABLE_CORS='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","HEAD","PUT"],"AllowedOrigins":["http://localhost:3000","http://127.0.0.1:3000"],"ExposeHeaders":["ETag"]}]}'
awslocal s3api put-bucket-cors --bucket "${FABLE_ASSET_BUCKET}" --cors-configuration "${FABLE_CORS}"
awslocal s3api put-bucket-cors --bucket "${FABLE_PRIVATE_BUCKET}" --cors-configuration "${FABLE_CORS}"

FABLE_PUBLIC_READ_POLICY="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${FABLE_ASSET_BUCKET}/*\"}]}"
awslocal s3api put-bucket-policy --bucket "${FABLE_ASSET_BUCKET}" --policy "${FABLE_PUBLIC_READ_POLICY}"

awslocal sqs create-queue --queue-name "${FABLE_QUEUE}" >/dev/null
