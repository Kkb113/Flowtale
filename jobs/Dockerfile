FROM node:22.23.2 AS base

WORKDIR /usr/sqs_jobs

COPY package*.json ./
RUN npm ci
COPY . .

FROM base AS builder
WORKDIR /usr/sqs_jobs
RUN npm run tscv
RUN npm run build

FROM node:22.23.2-alpine3.23
RUN apk add graphicsmagick
WORKDIR /usr/sqs_jobs
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/sqs_jobs/dist ./dist

EXPOSE 8081
ENTRYPOINT ["npm","start"]
