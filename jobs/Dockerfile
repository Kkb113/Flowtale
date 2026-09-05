FROM node:22.23.2@sha256:8a34c4ab3ea2c5cd194f07e317b2a8f09461d3c8b05c4e34c8ccd56d56024c4d AS base

WORKDIR /usr/sqs_jobs

COPY package*.json ./
RUN npm ci
COPY . .

FROM base AS builder
WORKDIR /usr/sqs_jobs
RUN npm run tscv
RUN npm run build

FROM node:22.23.2-alpine3.23@sha256:46825fbbd4e996a78b7a2cdc08d75e38a5a505bdab95dcda55605359bf124bc6 AS runtime
RUN apk add --no-cache ffmpeg=8.0.1-r1
WORKDIR /usr/sqs_jobs
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/sqs_jobs/dist ./dist
USER node

EXPOSE 8081
ENTRYPOINT ["node","dist/src/index.js"]

# Run media and queue regressions with the same pinned FFmpeg build shipped to production.
FROM runtime AS test
USER root
RUN npm ci --include=dev
COPY . .
USER node
RUN npm test -- --runInBand

FROM runtime AS production
