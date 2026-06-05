#!/usr/bin/env bash
# ============================================================
# run-e2e-tests.sh
# Script para ejecutar las pruebas E2E de la PWA
# Plataforma Educativa Móvil Cacique Tamanaco
#
# Este script:
#   1. Construye la imagen del contenedor de pruebas E2E
#   2. Se asegura que el ecosistema Docker esté corriendo
#   3. Ejecuta el contenedor de pruebas en la misma red
#   4. Extrae los reportes generados
#   5. Limpia los contenedores de prueba
#
# Uso:
#   chmod +x run-e2e-tests.sh
#   ./run-e2e-tests.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="e2e-reports-${TIMESTAMP}"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  PRUEBAS E2E - PWA Cacique Tamanaco${NC}"
echo -e "${CYAN}============================================${NC}"

# ----------------------------------------------------------
# 1. Verificar prerrequisitos
# ----------------------------------------------------------
echo -e "\n${YELLOW}[1/6] Verificando prerrequisitos...${NC}"

for cmd in docker docker-compose; do
    if ! command -v "$cmd" &>/dev/null; then
        echo -e "${RED}Error: '$cmd' no está instalado.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}  ✓ Prerrequisitos satisfechos${NC}"

# ----------------------------------------------------------
# 2. Verificar que los servicios principales estén arriba
# ----------------------------------------------------------
echo -e "\n${YELLOW}[2/6] Verificando ecosistema Docker...${NC}"

# Verificar si docker-compose ya está corriendo
if docker ps --format '{{.Names}}' | grep -q "cacique-frontend"; then
    echo -e "${GREEN}  ✓ Ecosistema ya está corriendo${NC}"
else
    echo -e "${YELLOW}  ⚠ El ecosistema no está corriendo. ¿Levantarlo? (s/n)${NC}"
    read -r respuesta
    if [ "$respuesta" = "s" ] || [ "$respuesta" = "S" ]; then
        echo "  Levantando servicios..."
        docker-compose up --build -d
        echo -e "${GREEN}  ✓ Servicios levantados${NC}"
    else
        echo -e "${RED}  ✗ Abortando. Los servicios deben estar corriendo.${NC}"
        echo "    Ejecute primero: docker-compose up -d"
        exit 1
    fi
fi

# ----------------------------------------------------------
# 3. Esperar que el backend esté saludable
# ----------------------------------------------------------
echo -e "\n${YELLOW}[3/6] Esperando que el backend esté saludable...${NC}"

MAX_RETRIES=20
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q '"success":true'; then
        echo -e "${GREEN}  ✓ Backend listo${NC}"
        break
    fi
    RETRY=$((RETRY + 1))
    sleep 3
done

if [ $RETRY -ge $MAX_RETRIES ]; then
    echo -e "${RED}Error: Backend no responde. Verifique logs.${NC}"
    docker-compose logs backend
    exit 1
fi

# ----------------------------------------------------------
# 4. Construir imagen de pruebas E2E
# ----------------------------------------------------------
echo -e "\n${YELLOW}[4/6] Construyendo imagen de pruebas E2E...${NC}"

docker build -t cacique-e2e-tests:latest -f e2e-tests/Dockerfile ./e2e-tests

echo -e "${GREEN}  ✓ Imagen construida: cacique-e2e-tests:latest${NC}"

# ----------------------------------------------------------
# 5. Ejecutar contenedor de pruebas E2E
# ----------------------------------------------------------
echo -e "\n${YELLOW}[5/6] Ejecutando pruebas E2E...${NC}"

# Detectar nombre de la red de Docker que usa cacique-frontend
NETWORK_NAME=$(docker inspect -f '{{range $net, $val := .NetworkSettings.Networks}}{{$net}}{{end}}' cacique-frontend 2>/dev/null || echo "proyecto0_cacique_network")
echo -e "  Red detectada: ${CYAN}${NETWORK_NAME}${NC}"

# Crear directorio local para reportes y resolver ruta absoluta
mkdir -p "${REPORT_DIR}"
REPORT_DIR_ABS=$(cd "${REPORT_DIR}" && pwd)

E2E_EXIT_CODE=0

echo -e "\n${YELLOW}Ejecutando Test 1: PWA Offline & Sync...${NC}"
docker run --rm \
    --name cacique-e2e-runner \
    --network "${NETWORK_NAME}" \
    -v "${REPORT_DIR_ABS}:/e2e/reports" \
    -e FRONTEND_URL="http://frontend:80" \
    -e API_URL="http://backend:3000" \
    cacique-e2e-tests:latest \
    node test-e2e.js || E2E_EXIT_CODE=$?

echo -e "\n${YELLOW}Ejecutando Test 2: Canvas Visual Editor...${NC}"
docker run --rm \
    --name cacique-e2e-runner \
    --network "${NETWORK_NAME}" \
    -v "${REPORT_DIR_ABS}:/e2e/reports" \
    -e FRONTEND_URL="http://frontend:80" \
    -e API_URL="http://backend:3000" \
    cacique-e2e-tests:latest \
    node test-e2e-canvas-editor.js || E2E_EXIT_CODE=$?

echo -e "\n${YELLOW}Ejecutando Test 3: Estudiante & Entrega de Tarea...${NC}"
docker run --rm \
    --name cacique-e2e-runner \
    --network "${NETWORK_NAME}" \
    -v "${REPORT_DIR_ABS}:/e2e/reports" \
    -e FRONTEND_URL="http://frontend:80" \
    -e API_URL="http://backend:3000" \
    cacique-e2e-tests:latest \
    node test-e2e-student-course.js || E2E_EXIT_CODE=$?

# ----------------------------------------------------------
# 6. Resumen final
# ----------------------------------------------------------
echo -e "\n${YELLOW}[6/6] Resultados${NC}"
echo ""
echo -e "${CYAN}============================================${NC}"
if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  TODAS LAS PRUEBAS E2E: APROBADAS${NC}"
else
    echo -e "${RED}  ALGUNAS PRUEBAS E2E: FALLIDAS (código: $E2E_EXIT_CODE)${NC}"
fi
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "Reportes disponibles en: ${REPORT_DIR}/"
echo -e "  - ${REPORT_DIR}/e2e-results.json"
echo -e "  - ${REPORT_DIR}/e2e-report.txt"
echo -e "  - ${REPORT_DIR}/*.png (screenshots)"

exit $E2E_EXIT_CODE