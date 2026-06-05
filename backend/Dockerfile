# ============================================================
# Dockerfile - Backend Plataforma Educativa Móvil
# Cacique Tamanaco
#
# Multi-stage build:
#   Stage 1: Compilación TypeScript
#   Stage 2: Imagen final de producción (solo runtime)
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (caching)
COPY package.json package-lock.json ./

# Instalar TODAS las dependencias (incluyendo dev para compilar)
RUN npm ci

# Copiar código fuente
COPY tsconfig.json ./
COPY src/ ./src/

# Compilar TypeScript -> JavaScript en ./dist
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Crear directorio de uploads (persistente vía volumen)
RUN mkdir -p ./uploads/entregas

# Copiar package.json y lock para instalar solo producción
COPY package.json package-lock.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev

# Copiar el compilado desde el builder
COPY --from=builder /app/dist ./dist

# Exponer el puerto definido en .env / 3000 por defecto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/app.js"]