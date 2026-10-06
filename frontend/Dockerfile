# Image frontend JULABA : build Vite + nginx
# A builder avec le contexte = RACINE du repo (le build a besoin de nginx/frontend.conf) :
#   docker build -f frontend/Dockerfile --build-arg VITE_API_URL=https://xxx/api/v1 -t julaba-frontend .
# Stage 1: build Vite
FROM node:24-alpine AS builder
WORKDIR /app/frontend
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# vite.config.ts sort le build dans ../frontend/dist => /app/frontend/dist
RUN npm run build
# Stage 2: nginx
FROM nginx:alpine
# Forcer les correctifs securite systeme (c-ares, libexpat, curl)
RUN apk upgrade --no-cache c-ares libexpat curl libcurl
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
