# syntax=docker/dockerfile:1.4

# stage: client

FROM node:20-bookworm AS client

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/

RUN npm ci

COPY packages/client ./packages/client
RUN npm -w @vapourcontainers-worker/client run build

# stage: guard

FROM node:20-bookworm AS guard

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/guard/package.json ./packages/guard/

RUN npm ci

COPY packages/guard ./packages/guard
RUN npm -w @vapourcontainers-worker/guard run build

# stage: runtime

FROM node:20-bookworm-slim

RUN <<EOF
set -eux
echo "deb http://www.deb-multimedia.org bookworm main" >> /etc/apt/sources.list
apt-get update -oAcquire::AllowInsecureRepositories=true
apt-get install -y --allow-unauthenticated --no-install-recommends \
        ca-certificates \
        curl \
        deb-multimedia-keyring \
        ffmpeg \
        unzip \
        vapoursynth
rm -rf /var/lib/apt/lists/*
curl https://gosspublic.alicdn.com/ossutil/install.sh | bash
EOF

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/guard/package.json ./packages/guard/

RUN npm ci --production

COPY --from=client /app/packages/client/dist ./packages/client/dist
COPY --from=guard /app/packages/guard/dist ./packages/guard/dist

COPY exec.sh monitor.sh /
