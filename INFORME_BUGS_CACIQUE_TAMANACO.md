# Informe de Bugs — Plataforma Educativa Cacique Tamanaco

**Fecha:** 2026-07-29
**Auditoría:** Backend + Frontend + Infraestructura
**Agentes:** programmer, qa, code-orchestrator (OpenCode)
**Estado:** Correcciones en progreso sobre los hallazgos más críticos.

---

## Correcciones aplicadas

| Bug | Archivos principales | Estado |
|-----|---------------------|--------|
| Backend: autorización faltante en endpoints de escritura/reportes | `backend/src/utils/authorization.ts`, `backend/src/routes/*`, `backend/src/controllers/*`, `backend/src/middleware/authMiddleware.ts` | ✅ Corregido y testeado (46 tests originales + 7 nuevos) |
| Frontend: PWA anulada | `frontend/src/index.html`, `frontend/src/app/app.config.ts`, `frontend/public/manifest.webmanifest`, `frontend/angular.json`, `frontend/nginx.conf` | ✅ Corregido y testeado |
| Frontend: guards no restauran sesión | `frontend/src/app/core/guards/auth.guard.ts`, `frontend/src/app/core/guards/role.guard.ts` | ✅ Corregido y testeado |
| Frontend: duplicación de asistencias offline | `frontend/src/app/core/services/offline-storage.service.ts` | ✅ Corregido y testeado |
| Frontend: sincronización offline sin manejo de errores | `frontend/src/app/features/attendance/attendance.component.ts` | ✅ Corregido y testeado |
| Frontend: asistencia carga todos los usuarios | `frontend/src/app/features/attendance/attendance.component.ts`, `backend/src/controllers/claseController.ts`, `backend/src/routes/claseRoutes.ts` | ✅ Corregido y testeado |
| Frontend: JWT en `sessionStorage` | `backend/src/app.ts`, `backend/src/routes/usuarioRoutes.ts`, `backend/src/middleware/authMiddleware.ts`, `frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/core/interceptors/auth.interceptor.ts`, `frontend/src/app/app.ts`, `frontend/src/app/app.html` | ✅ Migrado a cookie HttpOnly y testeado |
| Frontend: router link roto en `course-editor` | `frontend/src/app/features/course-editor/course-editor.component.html` | ✅ Corregido |
| Backend: routers revisados y protegidos | `backend/src/routes/cursoRoutes.ts`, `backend/src/routes/claseRoutes.ts`, `backend/src/utils/authorization.ts` | ✅ Endpoints `/cursos/:id/matriculados`, `/cursos/:id/document` y `/clases/:id/estudiantes` ahora requieren owner/admin o matriculación según corresponda |
| Backend: inconsistencia `activo`/`activa` en matrículas | `backend/src/controllers/cursoController.ts`, `init-scripts/01_ddl.sql` | ✅ Unificado a `activo` y testeado |
| Backend: migraciones faltantes en `docker-compose.yml` | `docker-compose.yml` | ✅ Se montan `03_migration_canvas.sql` y `04_quiz.sql` en el orden correcto para nuevos despliegues |
| Frontend: editor de cursos no cargaba (faltaba columna `version` y tablas canvas/quiz) | `docker-compose.yml`, `init-scripts/03_migration_canvas.sql`, `init-scripts/04_quiz.sql` | ✅ Aplicado manualmente en la BD corriendo y añadido al compose para futuros despliegues |
| Frontend: no había botón para crear cursos | `frontend/src/app/features/courses/courses.component.ts` | ✅ Agregado formulario "Nuevo curso" que crea el curso y redirige al editor |
| Frontend: botón hamburger sin función y botón de tema duplicado | `frontend/src/app/app.html`, `frontend/src/app/app.scss`, `frontend/src/app/app.ts` | ✅ Eliminado topbar móvil, hamburger y tema duplicado; queda un solo toggle de tema |

### Resultado de tests
- **Backend:** 54/54 tests pasan.
- **Frontend:** build + 11/11 tests pasan.
- **Integración:** 6/6 tests pasan.

---

## Resumen Ejecutivo

Se realizó una auditoría completa del proyecto con tres agentes exploradores en paralelo. Se encontraron **bugs y problemas de seguridad/configuración** distribuidos así:

| Capa | Grave | Medio | Bajo | Total |
|------|-------|-------|------|-------|
| Backend | 9 | 9 | 5 | 23 |
| Frontend | 11 | 20 | 9 | 40 |
| Infraestructura | 9 | 11 | 9 | 29 |
| **Total** | **29** | **40** | **23** | **92** |

> **Los hallazgos más críticos afectan la seguridad de autorización, la integridad de la sincronización offline y el arranque del sistema sin `.env` documentado.**

---

## Hallazgos críticos (Grave) — Top 10

1. **Backend: Autorización faltante en múltiples endpoints**  
   `POST /api/sync`, CRUD de usuarios, clases, evaluaciones, reportes y documentos personales solo requieren `authMiddleware`. Cualquier usuario autenticado (incluso un estudiante) puede crear admins, modificar notas, ver reportes de todos, etc.

2. **Backend: Inconsistencia `activo` vs `activa` en matrículas**  
   `cursoController.ts` inserta `estado = 'activo'` pero filtra `m.estado = 'activa'`. Los estudiantes matriculados nunca ven "Mis cursos".

3. **Backend: Transacciones con `ROLLBACK` sin manejo de error**  
   En `syncController`, `cursoController` y `quizController`, `await client.query('ROLLBACK')` puede fallar si la transacción ya está en estado failed, dejando el cliente del pool en estado inconsistente.

4. **Backend: `curso_estudiantes` vs `matriculas` desacopladas**  
   La matriculación solo inserta en `matriculas`, pero el FK de entregas/calificaciones apunta a `curso_estudiantes`. Esto genera violaciones de integridad referencial.

5. **Frontend: PWA completamente anulada**  
   `index.html` desregistra todos los Service Workers y limpia caches en cada carga. `app.config.ts` no registra `provideServiceWorker()`. El manifiesto no está vinculado. El sistema no es PWA a pesar de que toda la documentación lo afirma.

6. **Frontend: Guards no restauran sesión al recargar**  
   `authGuard` y `roleGuard` llaman `getUser()` sin `restoreSession()`. Tras recargar una página protegida, el usuario es redirigido al login aunque tenga token válido.

7. **Frontend: Duplicación de asistencias offline**  
   `saveAsistencia()` usa `put()` sin `id` definido, insertando un nuevo registro cada vez. Al sincronizar se envían múltiples registros contradictorios para la misma clase+estudiante.

8. **Frontend: Sincronización offline sin manejo de errores**  
   `syncNow()` tiene un `error: () => {}` vacío. Si falla la sync, no hay feedback y los registros quedan en estado indefinido.

9. **Infraestructura: Contradicción de auto-generación de secrets**  
   El README y la documentación afirman que no se necesita `.env` y que los secrets se auto-generan en el volumen `cacique_secrets`. Sin embargo, `docker-compose.yml` requiere `${JWT_SECRET}`, `${ENCRYPTION_KEY}`, `${ENCRYPTION_IV}` y el archivo `backend/src/config.ts` no existe. El arranque sin `.env` fallará.

10. **Infraestructura: Secretos y credenciales hardcodeadas**  
    `.env.example`, `backend/.env.example`, `init-scripts/02_dml.sql` y los tests E2E contienen contraseñas, hashes y secrets reales.

---

## Backend — Bugs por severidad

### Grave

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| B-G1 | `routes/syncRoutes.ts` + `controllers/syncController.ts` | `/api/sync` sin autorización por rol ni ownership de curso | Estudiante puede cambiar notas/asistencias de cualquiera |
| B-G2 | `routes/usuarioRoutes.ts` | CRUD de usuarios solo con `authMiddleware` | Escalación a admin, borrado de cuentas ajenas |
| B-G3 | `routes/claseRoutes.ts` | Escritura de clases sin rol docente/admin | Estudiante crea/modifica clases |
| B-G4 | `routes/evaluacionRoutes.ts` | Escritura de evaluaciones sin rol docente/admin | Estudiante modifica evaluaciones |
| B-G5 | `controllers/documentoController.ts` | Registro de documentos personales sin validar `id_usuario` | Acceso a datos sensibles de otros usuarios |
| B-G6 | `routes/reporteRoutes.ts` + `controllers/reporteController.ts` | Reportes accesibles a cualquier autenticado | Fuga de notas/asistencias de todos |
| B-G7 | `controllers/cursoController.ts` | `estado = 'activo'` al insertar, filtro `estado = 'activa'` | Estudiantes no ven sus cursos matriculados | ✅ Corregido |
| B-G8 | `controllers/syncController.ts`, `cursoController.ts`, `quizController.ts` | `ROLLBACK` sin try/catch | Pool de BD inconsistente, rollback fallido |
| B-G9 | `controllers/cursoController.ts` | `matricularEstudiante` solo inserta en `matriculas`, no en `curso_estudiantes` | FK violadas en entregas/calificaciones |

### Medio

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| B-M1 | `controllers/cursoController.ts` | `!doc || !doc.modulos === undefined` lógica rota | Se aceptan documentos sin módulos, posible borrado masivo |
| B-M2 | `controllers/syncController.ts` | No valida valores de `estado` ni rango de notas | Datos inválidos, errores 500 |
| B-M3 | `controllers/syncController.ts` | No usa `syncPayloadSchema` de Zod | Validación inconsistente |
| B-M4 | `controllers/cursoController.ts` | Control de versiones sin `SELECT ... FOR UPDATE` | Race condition al editar curso |
| B-M5 | `utils/crypto.ts` | AES-CBC sin autenticación de integridad (MAC/AEAD) | Alteración de documentos cifrados |
| B-M6 | `utils/crypto.ts` | IV estático legacy derivado por SHA-256 | Cifrado más débil para datos antiguos |
| B-M7 | `utils/crypto.ts` | Clave derivada por SHA-256 sin validar longitud | Entropía reducida si secreto es corto |
| B-M8 | `middleware/uploadMiddleware.ts` | Filtra por extensión, no por MIME | Archivos maliciosos renombrados |
| B-M9 | `app.ts` | CORS permite `!origin` | Acepta requests sin Origin (curl, iframes, file://) |
| B-M10 | `middleware/authMiddleware.ts` | `jwt.verify` sin `algorithms: ['HS256']` | Riesgo de confusión de algoritmo |
| B-M11 | `controllers/reporteController.ts` | No verifica que docente sea dueño del curso | Docente ve reportes de cursos ajenos |

### Bajo

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| B-B1 | `app.ts` | `express.json({ limit: '1mb' })` puede ser insuficiente para sync | Rechazo de payloads legítimos |
| B-B2 | `app.ts` | `express.static('uploads')` no coincide con `UPLOADS_DIR` | Descarga de entregas rota |
| B-B3 | Varios controladores | No reutilizan schemas Zod existentes | Deuda técnica, validación duplicada |

---

## Frontend — Bugs por severidad

### Grave

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| F-G1 | `src/index.html` | Script desregistra Service Workers y limpia caches en cada carga | PWA offline-first anulada |
| F-G2 | `src/app/app.config.ts` | No registra `provideServiceWorker()` | Service Worker nunca se instala |
| F-G3 | `src/index.html` | Falta `<link rel="manifest">` | PWA no instalable, tema/iconos no aplican |
| F-G4 | `src/app/core/guards/auth.guard.ts` | No llama `restoreSession()` | Redirige a login tras recargar |
| F-G5 | `src/app/core/guards/role.guard.ts` | No llama `restoreSession()` | Pérdida de acceso a rutas por rol tras recargar |
| F-G6 | `offline-storage.service.ts` + `attendance.component.ts` | `put()` sin `id` genera duplicados | Datos contradictorios en sync |
| F-G7 | `offline-storage.service.ts` | Sin manejo de colisiones/reintentos/rollback | Pérdida silenciosa de datos offline |
| F-G8 | `course-editor-store.service.ts` | Curso no persiste en IndexedDB | Pérdida de cambios si falla red |
| F-G9 | `course-editor-store.service.ts` | Limpia stacks undo/redo ante error | Pérdida de capacidad de deshacer |
| F-G10 | `course-editor-store.service.ts` | `parseInt(doc.id.replace('c_', ''))` puede generar `NaN` | URL de guardado inválida |
| F-G11 | `quiz-player.component.ts` | POST por cada clic sin debounce ni manejo de errores | Respuestas duplicadas, manipulación |

### Medio (resumen de los más importantes)

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| F-M1 | `auth.service.ts` | JWT en `sessionStorage` | Vulnerable a XSS |
| F-M2 | `auth.service.ts` | `isAuthenticated()` no verifica expiración | Token expirado aceptado localmente |
| F-M3 | `auth.interceptor.ts` | Redirige en 401 sin mensaje | UX confusa |
| F-M4 | `app.ts` / `course-editor.component.ts` | Tema usa `cacique_theme` vs `cactam_theme` | Inconsistencia de tema |
| F-M5 | `course-editor.component.html` | Botón reintentar usa ID hardcodeado 1 | Carga curso incorrecto |
| F-M6 | `course-editor.component.html` | `routerLink` a `/cursos/:id` inexistente | Ruta 404 |
| F-M7 | `dashboard.component.ts` | Chart.js no destruye instancia | Memory leak |
| F-M8 | `dashboard.component.ts` | Errores de red solo vacían arrays | Sin feedback al usuario |
| F-M9 | `attendance.component.ts` | Carga todos los usuarios y filtra localmente | Datos incorrectos, carga excesiva |
| F-M10 | `attendance.component.ts` | `loadAsistenciaActual()` vacío | No muestra estado previo |
| F-M11 | `reports.component.ts` | CSV no escapa saltos de línea/comillas robustamente | CSVs corruptos |
| F-M12 | `reports.component.ts` | Datos sin sanitizar | Riesgo futuro de XSS |
| F-M13 | `quiz-player.component.ts` | Timer en cliente manipulable | Tiempo de quiz no seguro |
| F-M14 | `user-management.component.ts` | Validación débil de formularios | Datos inválidos |
| F-M15 | Varios | Uso de `alert()` nativo | UX pobre, accesibilidad |
| F-M16 | `course-editor.component.ts` | Quiz guarda sin validar opciones correctas | Quizzes inconsistentes |
| F-M17 | `app.ts` | Suscripción a router events sin desuscribir | Memory leak |
| F-M18 | `course-editor.component.ts` | Drag & drop no reordena correctamente | Funcionalidad clave rota |
| F-M19 | `ngsw-config.json` | `api-reads` con estrategia `performance` 1h | Datos desactualizados |
| F-M20 | `course-editor.component.html` | Uso de `$any()` | Pérdida de tipos |

### Bajo (resumen)

- Uso excesivo de `any` en servicios y componentes.
- `console.log` en producción.
- Sin tests unitarios en frontend (`npm test` no ejecutaría nada).
- `environment.production` siempre `false`.
- Emojis usados como iconos principales.
- Toasts condicionados a `token` y `addToast` no usado.
- `setTimeout` para renderizar Chart.

---

## Infraestructura — Bugs por severidad

### Grave

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| I-G1 | `docker-compose.yml` + docs | Auto-generación de secrets documentada pero no implementada | Arranque sin `.env` falla |
| I-G2 | `.env.example`, `backend/.env.example` | Secretos hardcodeados | Credenciales débiles en repositorio |
| I-G3 | `init-scripts/02_dml.sql` | Hash bcrypt y email admin hardcodeados | Admin con credencial pública |
| I-G4 | `e2e-tests/test-e2e-*.js` | Credenciales admin/estudiante hardcodeadas | Exposición en tests |
| I-G5 | `docker-compose.yml` | Puerto `5432:5432` mapeado al host | BD expuesta a la red |
| I-G6 | `docker-compose.yml` | Puerto `3000:3000` mapeado al host | Backend expuesto directamente |
| I-G7 | `docker-compose.yml` | Solo postgres tiene healthcheck | Servicios pueden arrancar antes de tiempo |
| I-G8 | `db.ts` + `seedAdmin.ts` | Valores por defecto inseguros (`postgres`, `admin`) | Fallback a credenciales débiles |
| I-G9 | `test-integration.sh` | `POST /api/sync` sin autenticación | Test inválido o endpoint sin protección |

### Medio (resumen)

- `docker-compose` vs `docker compose` en scripts.
- `test-integration.sh` busca variables inexistentes (`ADMIN_EMAIL` vs `ADMIN_DEFAULT_PASSWORD`).
- `03_e2e_seed.sql` se ejecuta siempre, incluso en producción.
- `e2e-tests/Dockerfile` usa `playwright:latest` sin tag y `npm install` sin lockfile.
- Dockerfiles corren como `root`.
- Inconsistencia Node 20 documentado vs Node 22 en frontend/Dockerfile.
- `nginx.conf` sin `server_tokens off` ni `client_max_body_size`.
- `validators.ts` permite contraseñas de 4 caracteres.
- `test-integration.sh` requiere `psql` local sin usarlo.
- `run-e2e-tests.sh` interactivo, bloquea CI.
- `uploads` servido directamente como static.

### Bajo (resumen)

- Headers de seguridad faltantes en nginx.
- Sin límites de recursos en compose.
- `frontend/Dockerfile` ruta `dist/browser/browser/` frágil.
- Duplicación de prefijos `03_` en init scripts.
- `e2e-tests/Dockerfile` no usa `package-lock.json`.
- `backend/Dockerfile` no limpia caché de npm.
- `nginx.conf` `Connection: upgrade` siempre.
- `run-e2e-tests.sh` usa nombre de red fijo `proyecto0_cacique_network`.
- `frontend/package.json` declara `packageManager: npm@11.12.1` no usado.

---

## Recomendaciones priorizadas

### Prioridad 1 (Grave)
1. Implementar autorización por roles (`requireRole`) y ownership de recursos en todos los endpoints de escritura y reportes.
2. Corregir la inconsistencia de matrícula (`activo`/`activa`) y consolidar `curso_estudiantes`/`matriculas`.
3. Robustecer transacciones: `ROLLBACK` en try/catch interno, `FOR UPDATE` para control de concurrencia.
4. Restaurar la funcionalidad PWA: registrar `provideServiceWorker`, eliminar script de desregistro, vincular manifest.
5. Corregir guards para llamar `restoreSession()` antes de validar autenticación/roles.
6. Implementar sincronización offline transaccional con manejo de errores y sin duplicados.
7. Resolver la contradicción de auto-generación de secrets: implementar `backend/src/config.ts` o actualizar documentación.
8. Eliminar todos los secretos hardcodeados del repositorio y tests.

### Prioridad 2 (Medio)
9. Usar Zod en todos los controladores (sobre todo `/api/sync`).
10. Migrar cifrado AES-CBC a AES-256-GCM o agregar HMAC.
11. Validar uploads por MIME type y contenido.
12. Restringir CORS en producción y forzar `HS256` en JWT.
13. Cambiar JWT de `sessionStorage` a cookies `HttpOnly; Secure; SameSite=Strict`.
14. Agregar validaciones de formularios en Angular y reemplazar `alert()` por toasts.
15. Corregir docker-compose/scripts para usar Docker Compose V2, healthchecks y usuarios no-root.
16. Separar init scripts de E2E de producción.

### Prioridad 3 (Bajo)
17. Agregar tests unitarios en frontend (AuthService, OfflineStorage, CourseEditorStore).
18. Limpiar `any` y `$any()`, mejorar tipos.
19. Eliminar `console.log` en producción.
20. Headers de seguridad en nginx, límites de recursos en compose, builds reproducibles.

---

## Notas de la auditoría

- La auditoría original se realizó en **modo solo lectura**; posteriormente se aplicaron las correcciones listadas en la sección "Correcciones aplicadas".
- Los agentes de OpenCode (`programmer`, `qa`, `code-orchestrator`) fueron replicados en `Plataforma_Educativa_Cacique_Tamanaco/.opencode/agents/` y documentados en `AGENTS.md`.
- Para continuar con los hallazgos pendientes, se recomienda usar el agente `code-orchestrator` para iterar entre `programmer` y `qa`.

---

*Fin del informe.*
