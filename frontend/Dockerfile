# ============================================================
# Dockerfile - Frontend Angular 21 (PWA)
# Plataforma Educativa Móvil Cacique Tamanaco
#
# Multi-stage build:
#   Stage 1: Compilación Angular (node:22-alpine)
#   Stage 2: Servidor nginx (nginx:alpine) con proxy reverso
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias (caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente y configuraciones
COPY angular.json ngsw-config.json tsconfig.json tsconfig.app.json ./
COPY src/ ./src/
COPY public/ ./public/

# Compilar Angular en modo producción
RUN npm run build -- --output-path=dist/browser

# ---------- Stage 2: Servidor nginx ----------
FROM nginx:stable-alpine AS runner

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar el build de Angular desde el builder
# Angular 21 genera dist/browser/browser/ con --output-path=dist/browser
COPY --from=builder /app/dist/browser/browser/ /usr/share/nginx/html/

# Exponer puerto 80 (nginx sirve en este puerto)
EXPOSE 80

# Iniciar nginx en foreground
CMD ["nginx", "-g", "daemon off;"]