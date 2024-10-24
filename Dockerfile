# syntax=docker/dockerfile:1.10.0

# "Build Argument"; alternativ: ENV = Umgebungsvariable im gebauten Image
ARG NODE_VERSION=23.0.0

# ---------------------------------------------------------------------------------------
# S t a g e   d i s t
# ---------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS dist
# FROM node:${NODE_VERSION}-bookworm AS dist

# ggf. Python fuer Argon2
# https://packages.debian.org/bookworm/python3.11-minimal
# https://packages.debian.org/trixie/python3.12-minimal
# "python3-dev" enthaelt "multiprocessing"
# "build-essential" enthaelt "make"
RUN <<EOF
# https://explainshell.com/explain?cmd=set+-eux
set -eux
apt-get update
apt-get upgrade --yes

# Debian Bookworm bietet nur Packages fuer Python 3.11; Ubuntu Jammy LTS nur fuer Python 3.10
# https://packages.debian.org/bookworm/python3.11-minimal
# https://packages.debian.org/bookworm/python3.11-dev
# Python 3.12: Uebersetzung des Python-Quellcodes erforderlich
# https://itnixpro.com/how-to-install-python-3-12-on-debian-12debian-11
apt-get install --no-install-recommends --yes python3.11-minimal=3.11.2-6+deb12u3 python3.11-dev=3.11.2-6+deb12u3 build-essential=12.9
ln -s /usr/bin/python3.11 /usr/bin/python3
ln -s /usr/bin/python3.11 /usr/bin/python

npm i -g --no-audit --no-fund npm
EOF

USER node

WORKDIR /home/node

COPY src ./src

# https://docs.docker.com/engine/reference/builder/#run---mounttypebind
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=bind,source=nest-cli.json,target=nest-cli.json \
    --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=tsconfig.build.json,target=tsconfig.build.json \
    --mount=type=cache,target=/root/.npm <<EOF
set -eux
# ci (= clean install) mit package-lock.json  dependencies installieren
npm ci --no-audit --no-fund
npm run build
EOF

# ------------------------------------------------------------------------------
# S t a g e   d e p e n d e n c i e s
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS dependencies

RUN <<EOF
set -eux
apt-get update
apt-get upgrade --yes
# https://packages.debian.org/bookworm/python3.11-minimal
# https://packages.debian.org/bookworm/python3.11-dev
apt-get install --no-install-recommends --yes python3.11-minimal=3.11.2-6+deb12u3 python3.11-dev=3.11.2-6+deb12u3 build-essential=12.9
ln -s /usr/bin/python3.11 /usr/bin/python3
ln -s /usr/bin/python3.11 /usr/bin/python
npm i -g --no-audit --no-fund npm
EOF

USER node

WORKDIR /home/node

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm <<EOF
set -eux
# ci (= clean install) mit package-lock.json
# --omit=dev: ohne devDependencies
npm ci --no-audit --no-fund --omit=dev --omit=peer
EOF

# ------------------------------------------------------------------------------
# S t a g e   f i n a l
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS final

# Anzeige bei "docker inspect ..."
# https://specs.opencontainers.org/image-spec/annotations
# https://spdx.org/licenses
# MAINTAINER ist deprecated https://docs.docker.com/engine/reference/builder/#maintainer-deprecated
LABEL org.opencontainers.image.title="bankkonto" \
    org.opencontainers.image.description="Appserver Bankkonto mit Basis-Image Debian Bookworm" \
    org.opencontainers.image.version="2024.10.1-bookworm" \
    org.opencontainers.image.licenses="GPL-3.0-or-later" \
    org.opencontainers.image.authors="scal1084@h-ka.de"

RUN <<EOF
set -eux
apt-get update
# https://github.com/Yelp/dumb-init
# https://packages.debian.org/bookworm/dumb-init
apt-get install --no-install-recommends --yes dumb-init=1.2.5-2

apt-get autoremove --yes
apt-get clean --yes
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*
EOF

WORKDIR /opt/app

USER node

COPY --chown=node:node package.json .env ./
COPY --from=dependencies --chown=node:node /home/node/node_modules ./node_modules
COPY --from=dist --chown=node:node /home/node/dist ./dist
COPY --chown=node:node src/config/resources ./dist/config/resources

EXPOSE 3000

# Bei CMD statt ENTRYPOINT kann das Kommando bei "docker run ..." ueberschrieben werden
# "Array Syntax" damit auch <Strg>C funktioniert
# https://github.com/Yelp/dumb-init:
# "a simple process supervisor and init system designed to run as PID 1 inside
# minimal container environments (such as Docker)""
ENTRYPOINT ["dumb-init", "/usr/local/bin/node", "dist/main.js"]
