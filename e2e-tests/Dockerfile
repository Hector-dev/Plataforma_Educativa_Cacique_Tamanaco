# ============================================================
# Dockerfile - Contenedor de Pruebas E2E (Playwright)
# Plataforma Educativa Móvil Cacique Tamanaco
#
# Este contenedor ejecuta pruebas automatizadas con Playwright
# en modo headless contra la PWA desplegada en Docker.
# ============================================================

FROM mcr.microsoft.com/playwright:latest

WORKDIR /e2e

# Instalar dependencias adicionales para manipulación de red
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar dependencias
COPY package.json .
RUN npm install --omit=dev

# Copiar scripts de pruebas
COPY test-e2e.js .
COPY test-e2e-canvas-editor.js .
COPY test-e2e-student-course.js .
COPY test-e2e-utils.js .

# Crear directorio para reportes
RUN mkdir -p /e2e/reports

# Instalar navegador Chromium para Playwright
RUN npx playwright install chromium

# Comando por defecto: ejecutar las pruebas
CMD ["node", "test-e2e.js"]