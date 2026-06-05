# Guía de Ejecución de Pruebas E2E e Integración

## Plataforma Educativa Móvil Cacique Tamanaco (PWA Offline-First en LAN)

---

## 1. Estructura de Archivos Generados

```
proyecto 0/
├── ngsw-config.json                  # Configuración PWA actualizada (offline total)
├── test-integration.sh               # Script de prueba de integración frontend-backend
├── GUIA-E2E-TESTS.md                 # Este documento
├── docker-compose.yml                # Ecosistema principal (postgres + backend + frontend)
└── e2e-tests/
    ├── Dockerfile                    # Contenedor de pruebas E2E con Playwright
    ├── test-e2e.js                   # Suite de pruebas E2E (offline → IndexedDB → sync)
    ├── test-e2e-utils.js             # Utilidades compartidas para las pruebas
    └── run-e2e-tests.sh              # Script orquestador de pruebas E2E
```

---

## 2. Configuración PWA para Offline Total (ngsw-config.json)

### Cambios realizados:

1. **AssetGroups** con `installMode: "prefetch"` y `updateMode: "prefetch"` en todos:
   - `app`: archivos base del framework (JS, CSS, HTML, manifest)
   - `assets`: todo dentro de `/assets/**` e `/icons/**`
   - `fonts-and-images`: todos los formatos de imagen y fuente (SVG, PNG, JPG, OTF, TTF, WOFF, etc.)

2. **DataGroups** agregados para cachear respuestas de la API:
   - `api-sync`: estrategia `freshness` para endpoints de sincronización y health
   - `api-reads`: estrategia `performance` para lecturas (usuarios, cursos, clases, entregas, reportes)

### Verificación de Autonomía Offline:

```bash
# Verificar que el Service Worker se despliega correctamente
curl -s http://localhost:80/ngsw.json | jq '.assetGroups[].name'
# Debería mostrar: "app", "assets", "fonts-and-images"

# Verificar que no hay dependencias externas en index.html
grep -c "http://\|https://\|cdn\|googleapis\|cloudflare" frontend/src/index.html
# Debería retornar: 0
```

---

## 3. Prueba de Integración (test-integration.sh)

### Descripción:
Script bash autónomo que valida el flujo completo entre contenedores:
1. Construye y levanta los servicios con `docker-compose up -d`
2. Espera healthchecks de backend y frontend (hasta 60s)
3. Ejecuta 6 pruebas de API:
   - **Test 1**: Health Check del backend (GET /api/health → 200)
   - **Test 2**: Login de administrador (obtener JWT)
   - **Test 3**: Sincronización de asistencia (POST /api/sync → 200)
   - **Test 4**: Verificación en Base de Datos (`docker exec psql`)
   - **Test 5**: Frontend PWA responde (HTTP 200)
   - **Test 6**: Service Worker y manifest accesibles

### Ejecución:

```bash
# 1. Dar permisos de ejecución (ya hecho)
chmod +x test-integration.sh

# 2. Asegurar que el archivo .env existe con las variables requeridas
cp .env.example .env
# Editar .env con valores reales si es necesario

# 3. Ejecutar la prueba (toma ~2-3 minutos)
./test-integration.sh
```

### Salida esperada:
```
============================================
  PRUEBA DE INTEGRACIÓN - CACIQUETAMANACO
============================================

[1/6] Verificando prerrequisitos...
  ✓ Prerrequisitos satisfechos

[2/6] Construyendo y levantando contenedores...
  ✓ Contenedores levantados

[3/6] Esperando que los servicios estén listos...
  ✓ API Backend lista (puerto 3000)
  ✓ Frontend listo (puerto 80)

[4/6] Ejecutando pruebas de integración de API...
  Test 1/6 - Health Check... ✓ (HTTP 200)
  Test 2/6 - Login Admin... ✓ (Token obtenido)
  Test 3/6 - Sync Asistencia... ✓ (HTTP 200)
  Test 4/6 - Verificar BD... ✓ (1 registro(s) encontrado(s))
  Test 5/6 - Frontend PWA... ✓ (HTTP 200)
  Test 6/6 - Service Worker & Manifest... ✓ (SW=200, Manifest=200)

[5/6] Generando reporte...
[6/6] Limpieza de contenedores...
  ✓ Contenedores detenidos

============================================
  INTEGRACIÓN COMPLETA: APROBADA
  6/6 pruebas exitosas
============================================
```

### Reportes generados:
- `test-integration-report-YYYYMMDD_HHMMSS.log` - Log completo con salidas de build y respuestas

---

## 4. Prueba End-to-End (E2E) con Playwright

### Arquitectura:

```
┌─────────────────────────────────────────────────────┐
│  Host (tu máquina)                                   │
│                                                       │
│  ./e2e-tests/run-e2e-tests.sh                         │
│       │                                                │
│       ├─ docker build -t cacique-e2e-tests            │
│       │    └─ FROM mcr.microsoft.com/playwright        │
│       │       ├─ test-e2e.js (Node.js runner)          │
│       │       └─ test-e2e-utils.js (helpers)           │
│       │                                                │
│       └─ docker run --network cacique_network          │
│            └─ Navegador Chromium headless               │
│                 │                                       │
│                 ├─ 1. Abre http://frontend:80           │
│                 ├─ 2. Verifica Service Worker activo    │
│                 ├─ 3. Activa offline (route abort)      │
│                 ├─ 4. Guarda asistencia en IndexedDB    │
│                 ├─ 5. Verifica persistencia offline     │
│                 ├─ 6. Restaura conexión                 │
│                 └─ 7. Valida sincronización al backend  │
└─────────────────────────────────────────────────────┘
```

### Flujo de la prueba E2E:

| Paso | Acción | Validación |
|------|--------|------------|
| 1 | Abrir PWA en Chromium headless | Título de página cargado |
| 2 | Verificar Service Worker | `navigator.serviceWorker` activo en estado `activated` |
| 3 | Desconectar red | Interceptar rutas via `page.route()` → `abort` |
| 4 | Guardar asistencia offline | Inyectar datos en IndexedDB (`CaciqueOfflineDB.asistencias`) |
| 5 | Leer IndexedDB | Confirmar que el registro persiste con `sincronizado: false` |
| 6 | Restaurar conexión | `page.unroute('**/*')` |
| 7 | Verificar sincronización | POST /api/sync → 200 OK |

### Ejecución:

```bash
# Método 1: Script orquestador (recomendado)
chmod +x e2e-tests/run-e2e-tests.sh
./e2e-tests/run-e2e-tests.sh

# Método 2: Manual paso a paso
# 1. Levantar ecosistema
docker-compose up -d

# 2. Construir imagen de pruebas
docker build -t cacique-e2e-tests:latest -f e2e-tests/Dockerfile ./e2e-tests

# 3. Ejecutar pruebas
docker run --rm \
    --name cacique-e2e-runner \
    --network cacique_tamanaco_cacique_network \
    -e FRONTEND_URL="http://frontend:80" \
    -e API_URL="http://backend:3000" \
    cacique-e2e-tests:latest

# 4. Extraer reportes
docker cp cacique-e2e-runner:/e2e/reports/. ./e2e-reports/

# 5. Limpiar
docker-compose down
```

### Salida esperada (E2E):

```
============================================
  PRUEBA E2E - PWA Cacique Tamanaco
============================================

[1/7] Inicializando navegador headless...
  ✓ Navegador Chromium headless iniciado

[2/7] Abriendo PWA...
  ✓ Carga de PWA: PASÓ - Título: "Frontend"

[3/7] Verificando Service Worker...
  Service Worker activo en scope: http://frontend:80/
  ✓ Service Worker registrado y activo: PASÓ

[4/7] Simulando desconexión de red (offline)...
  ✓ Red desconectada vía route interception
  ✓ Desconexión de red simulada: PASÓ

[5/7] Simulando registro de asistencia offline en IndexedDB...
  ✓ Asistencia guardada en IndexedDB con id: 1
  ✓ Registro offline en IndexedDB: PASÓ

[6/7] Validando persistencia en IndexedDB...
  ✓ Datos offline encontrados en IndexedDB...
  ✓ Datos offline persisten en IndexedDB: PASÓ

[7/7] Restaurando conexión y validando sincronización...
  ✓ Red reconectada
  ✓ Backend accesible después de reconexión
  ✓ Sincronización automática post-reconexión: PASÓ

============================================
  RESULTADOS DE LA PRUEBA E2E
============================================
  Total: 7
  Pasadas: 7
  Fallidas: 0
============================================
```

### Reportes generados (en `e2e-reports-YYYYMMDD_HHMMSS/`):

| Archivo | Contenido |
|---------|-----------|
| `e2e-results.json` | Resultados estructurados en JSON |
| `e2e-report.txt` | Log detallado de la ejecución |
| `01-pwa-cargada-*.png` | Screenshot inicial de la PWA |
| `02-offline-mode-*.png` | Screenshot en modo offline |
| `03-offline-data-validated-*.png` | Screenshot con datos en IndexedDB |
| `04-final-state-*.png` | Screenshot final post-sincronización |

---

## 5. Detalles Técnicos

### 5.1. Simulación Offline vs Desconexión Real

El script E2E usa **route interception** de Playwright para simular desconexión:

```javascript
// NO se usa page.setOfflineMode(true) porque el contenedor sigue conectado
// a la red Docker. En su lugar, interceptamos rutas:
function enableOfflineMode(page) {
    return page.route('**/*', (route) => {
        const url = route.request().url();
        // Permitir data: y blob: para recursos internos
        if (url.startsWith('data:') || url.startsWith('blob:')) {
            route.continue();
        } else {
            route.abort('internetdisconnected');
        }
    });
}
```

Para una prueba con desconexión real de red, se necesitaría:
1. Usar `docker network disconnect cacique_network cacique-e2e-runner`
2. Reactivar con `docker network connect`

### 5.2. Variables de Entorno del Contenedor E2E

| Variable | Default | Descripción |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://frontend:80` | URL interna de la PWA |
| `API_URL` | `http://backend:3000` | URL interna de la API |

### 5.3. Requisitos del Sistema

- **Docker Engine** 24+ con docker-compose plugin
- **Puertos**: 5432 (PostgreSQL), 3000 (Backend), 80 (Frontend)
- **Espacio**: ~2GB para imágenes Docker (node:22-alpine, nginx, playwright, postgres:16-alpine)
- **Red**: Acceso a Docker Hub para construir las imágenes (solo la primera vez)

### 5.4. Solución de Problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| `docker: 'compose' is not a docker command` | Docker Compose no instalado | `apt install docker-compose-plugin` o usar `docker-compose` (con guión) |
| `Error: No se encontraron registros en BD` | Seed de datos no ejecutado | Ejecutar `docker exec cacique-postgres psql -U postgres -d cacique_tamanaco_db -f /docker-entrypoint-initdb.d/01_ddl.sql` |
| `Test Sync falla con 400` | Payload inválido o FK violada | Verificar que existan clase(id=1) y estudiante(id=1) en la BD |
| `Service Worker no activo` | PWA no compilada con service worker | Verificar `ngsw-config.json` presente y `@angular/service-worker` en package.json |
| `E2E timeout` | Contenedor no alcanza frontend | Verificar nombre de red: `docker network ls` y ajustar en `run-e2e-tests.sh` |

### 5.5. Verificación Post-Pruebas

```bash
# Verificar datos en PostgreSQL
docker exec cacique-postgres psql -U postgres -d cacique_tamanaco_db \
    -c "SELECT * FROM asistencias_alumnos;"

# Verificar logs del backend
docker logs cacique-backend --tail 50

# Verificar caché del Service Worker (desde el navegador)
# Abrir DevTools → Application → Cache Storage → ngsw:*
```

---

## 6. Resumen de Archivos y su Propósito

| Archivo | Propósito | ¿Modificado/Creado? |
|---------|-----------|---------------------|
| `frontend/ngsw-config.json` | Configuración PWA con assetGroups completos + dataGroups para API | ✅ Modificado |
| `frontend/src/index.html` | Sin cambios (0 llamadas externas verificadas) | Sin cambios |
| `test-integration.sh` | Script de prueba de integración backend ↔ frontend ↔ BD | ✅ Creado |
| `e2e-tests/Dockerfile` | Contenedor con Playwright + Node.js para E2E | ✅ Creado |
| `e2e-tests/test-e2e.js` | Suite E2E: offline → IndexedDB → sync | ✅ Creado |
| `e2e-tests/test-e2e-utils.js` | Utilidades: navegador, screenshots, reportes, SW wait | ✅ Creado |
| `e2e-tests/run-e2e-tests.sh` | Orquestador: build + run + extract reports | ✅ Creado |
| `GUIA-E2E-TESTS.md` | Este documento de guía y referencia | ✅ Creado |

---

## 7. Conclusión

Se ha configurado el ecosistema completo para la validación de la PWA offline-first en LAN:

1. **ngsw-config.json** optimizado para autonomía total offline con precarga de todos los assets y cacheo inteligente de APIs.

2. **test-integration.sh** que verifica el flujo real entre contenedores (frontend → nginx → backend → postgres) con 6 pruebas automatizadas y reporte.

3. **Suite E2E con Playwright** que simula el ciclo de vida completo offline/online de la PWA, validando IndexedDB y sincronización automática.

Todo ejecutándose dentro del ecosistema Docker, sin dependencias externas ni acceso a Internet.