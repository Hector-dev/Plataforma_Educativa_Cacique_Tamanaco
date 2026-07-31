# AGENTS.md — Plataforma Educativa Cacique Tamanaco

## Descripción

Plataforma educativa móvil **Offline-First / PWA** para la U.E.N. Cacique Tamanaco.
Permite gestionar usuarios, cursos, clases, asistencias, evaluaciones, entregas,
quizzes y reportes, con sincronización masiva al reconectar en red local.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 21 (standalone), TypeScript 5.9, Angular Material, Chart.js, Dexie.js (IndexedDB), Angular Service Worker |
| Backend | Node.js 20, Express 4, TypeScript 5.9, PostgreSQL 16 (`pg`) |
| Seguridad | JWT (`jsonwebtoken`), bcrypt, AES-256-CBC (`crypto`) |
| Infraestructura | Docker Compose, nginx, init-scripts SQL |
| Tests | Jest 30 + ts-jest + Supertest (backend); Karma/Jasmine por defecto en Angular CLI (frontend); Playwright (E2E) |

## Estructura de carpetas

```
Plataforma_Educativa_Cacique_Tamanaco/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Entry point, middlewares, rutas
│   │   ├── db.ts                  # Pool de PostgreSQL
│   │   ├── controllers/           # Lógica de negocio
│   │   ├── routes/                # Definición de endpoints
│   │   ├── middleware/            # authMiddleware.ts, uploadMiddleware.ts
│   │   ├── utils/                 # crypto.ts, logger.ts, validators.ts
│   │   └── __tests__/             # Tests Jest
│   ├── scripts/seedAdmin.ts
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── core/                  # Servicios, interceptors, modelos
│   │   └── features/              # Course editor, Quiz player, Setup Wizard, etc.
│   ├── public/icons/              # PWA icons
│   └── Dockerfile
├── init-scripts/                  # DDL + DML + migraciones SQL autoejecutables
├── e2e-tests/                     # Tests E2E con Playwright
├── docker-compose.yml
└── README.md
```

## Convenciones de código

- **Backend**: clases/interfaces en PascalCase, funciones/variables en camelCase,
  rutas REST en kebab-case, nombres de archivos en camelCase.
- **Frontend**: Angular standalone components, servicios con `providedIn: 'root'`,
  nombres de archivos con sufijo `.component.ts`, `.service.ts`, `.guard.ts`.
- **Commits**: en español, descriptivos, pequeños.
- **Idioma del proyecto**: español (UI, nombres de campos, mensajes de error).

## Cómo ejecutar tests

```bash
# Backend
cd backend
npm test                           # Jest

# Frontend
cd frontend
npm test                           # Karma/Jasmine

# Integración completa (Docker)
./test-integration.sh

# E2E con Playwright
./e2e-tests/run-e2e-tests.sh
```

## Consideraciones críticas de seguridad

- **Cifrado AES**: los documentos personales se cifran con AES-256-CBC. Las claves
  (`ENCRYPTION_KEY`, `ENCRYPTION_IV`) se auto-generan en el primer arranque y se
  persisten en el volumen `cacique_secrets`.
- **JWT**: validar siempre el token en endpoints protegidos mediante `authMiddleware`.
- **Autorización por roles**: asegurar que un usuario no pueda ver/modificar datos
  de otro rol (por ejemplo, un estudiante no puede crear cursos).
- **SQL injection**: aunque se usa `pg` con queries parametrizadas, revisar
  cualquier concatenación de strings en SQL.
- **Uploads**: `multer` limita archivos a entregas. Validar tipos MIME y tamaños.

## Riesgos y áreas de especial atención

1. **Sincronización offline (`/api/sync`)**: debe mantener atomicidad transaccional
   (COMMIT/ROLLBACK completo). Un bug aquí puede causar datos inconsistentes.
2. **Offline-first en frontend**: IndexedDB + Service Worker. Revisar manejo de
   conflictos, datos obsoletos y recuperación de errores de red.
3. **Editor Canvas**: lógica de drag & drop y estado del curso. Riesgo de pérdida
   de progreso o inconsistencias en la estructura del curso.
4. **Quizzes con tiempo límite**: asegurar que el tiempo se maneje en el servidor
   para evitar manipulación en cliente.

## Instrucciones para los agentes

- **`programmer`**: implementa cambios, escribe/actualiza pruebas, ejecuta `npm test`
  en el backend antes de considerar terminada una tarea.
- **`qa`**: revisa calidad, busca bugs, edge cases y problemas de seguridad. Puede
  ejecutar tests existentes y proponer nuevos.
- **`code-orchestrator`**: coordina iteraciones entre `programmer` y `qa` hasta que
  el cambio esté aprobado.

Antes de modificar archivos, leer el contexto necesario. Después de modificar,
ejecutar tests relevantes y reportar resultados.
