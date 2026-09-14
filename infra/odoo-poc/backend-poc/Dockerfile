# Image de TEST du backend JULABA pour le POC Odoo 19 — jamais un artefact de
# production. Le Dockerfile de production (backend/Dockerfile) n'est PAS touche.
#
# Pourquoi une image separee et non celle de prod :
#
# 1. CONTEXTE. backend/Dockerfile copie `backend/package-lock.json`, qui
#    n'existe pas : le depot est en npm workspaces (frontend_src + backend) et
#    le lock unique vit a la RACINE. Cette image se construit donc depuis la
#    racine, avec le vrai lock.
# 2. LIBC. L'image de prod est Alpine (musl) et installe python3/make/g++ pour
#    recompiler ce qui n'a pas de binaire musl. Ici on part de Debian (glibc) :
#    `@sentry/node-cpu-profiler` (dependance native de @sentry/profiling-node,
#    chargee a l'import dans main.ts) y trouve un binaire pre-compile. Aucune
#    chaine de compilation a installer.
#
# `.dockerignore` de la racine EXCLUT `backend/` (il sert au build de l'image
# frontend). Le fichier `Dockerfile.dockerignore` pose a cote de ce Dockerfile
# le remplace — mecanisme BuildKit, d'ou DOCKER_BUILDKIT=1 dans
# scripts/backend-poc-test.sh.
FROM node:22-bookworm-slim

WORKDIR /app

# Les package.json des DEUX workspaces sont requis : npm refuse d'installer un
# lock de workspaces si l'un des membres declares est absent.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend_src/package.json frontend_src/

# `npm ci` complet (workspaces compris) : plus long qu'un `-w backend`, mais
# strictement conforme au lock, ce qui est le seul point qui compte pour un
# test dont le role est de dire la verite. Les scripts d'installation sont
# laisses actifs : aucun package du depot n'en declare (verifie), mais
# `@sentry/node-cpu-profiler` en a un, qui valide son binaire pre-compile.
RUN npm ci

COPY backend ./backend
RUN npm run build --workspace backend

WORKDIR /app/backend
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/main"]
