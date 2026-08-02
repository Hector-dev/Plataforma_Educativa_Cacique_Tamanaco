<p align="center">
  <img src="https://raw.githubusercontent.com/Hector-dev/Plataforma_Educativa_Cacique_Tamanaco/v1.0/frontend/public/icons/logo.png" alt="Logo" width="120" />
</p>

<h1 align="center">Cacique Tamanaco</h1>
<h3 align="center">Plataforma Educativa Móvil · Offline-First · PWA</h3>

<p align="center">
  <img src="https://img.shields.io/badge/angular-21-DD0031?logo=angular" alt="Angular 21" />
  <img src="https://img.shields.io/badge/node-20-339933?logo=nodedotjs" alt="Node 20" />
  <img src="https://img.shields.io/badge/postgresql-16-4169E1?logo=postgresql" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/docker-27-2496ED?logo=docker" alt="Docker 27" />
  <img src="https://img.shields.io/badge/express-4.x-000000?logo=express" alt="Express 4.x" />
  <img src="https://img.shields.io/badge/pwa-ready-5A0FC8?logo=pwa" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/v1.0-FF6F00?logo=git" alt="v1.0" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License MIT" />
</p>

---

## 🧭 Índice

- [✨ Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [📋 Requisitos](#-requisitos)
- [🚀 Instalación](#-instalación)
  - [Opción A: Docker (recomendado)](#opción-a-docker-recomendado)
  - [Opción B: Sin Docker (desarrollo manual)](#opción-b-sin-docker-desarrollo-manual)
- [🔐 Acceso inicial](#-acceso-inicial)
- [Configuración de Secrets](#-configuración-de-secrets)
- [📂 Estructura del proyecto](#-estructura-del-proyecto)
- [🛠️ Comandos útiles](#️-comandos-útiles)
- [📱 Funcionalidades](#-funcionalidades)
- [📊 Diagramas](#-diagramas)
- [📄 Licencia](#-licencia)

---

## ✨ Características

| Categoría | Funcionalidades |
|-----------|----------------|
| 👥 **Usuarios** | CRUD completo, roles (Admin/Docente/Estudiante), JWT auth, bcrypt |
| 📖 **Cursos** | Creación, matriculación, estructura modular con clases |
| ✏️ **Editor Visual** | Canvas drag & drop, módulos, lecciones, evaluaciones, quizzes, materiales |
| 🎯 **Quizzes** | Opción múltiple, verdadero/falso, tiempo límite, calificación automática |
| 📝 **Entregas** | Subida de archivos (PDF/Word), enlaces URL, calificación docente |
| ✅ **Asistencia** | Registro presente/ausente/justificado, soporte offline |
| 📊 **Reportes** | Rendimiento por curso, asistencia general, gráficos Chart.js, exportación CSV |
| 🔒 **Documentos** | Cifrado AES-256-CBC para documentos personales sensibles |
| 📴 **Offline-First** | IndexedDB (Dexie.js), sincronización masiva al reconectar |
| 🌓 **Tema** | Claro/Oscuro persistente, toggle unificado (`theme.util.ts`) |
| 📱 **Responsive** | Sidebar colapsable, off-canvas móvil, inspector overlay, hamburger menu |
| 🐳 **Docker** | Multi-stage builds, healthchecks, init scripts automáticos |

---

## 🏗️ Arquitectura

```mermaid
graph TB
    subgraph "🌐 Navegador"
        PWA[PWA Angular 21<br/>Service Worker<br/>IndexedDB Offline]
    end

    subgraph "🐳 Docker Compose"
        NGINX[NGINX :80<br/>Proxy reverso]
        BACKEND[Express.js :3000<br/>TypeScript<br/>JWT Auth]
        DB[(PostgreSQL 16<br/>:5432)]
    end

    PWA -->|HTTP| NGINX
    NGINX -->|/api/*| BACKEND
    BACKEND -->|pg pool| DB
    PWA -.->|offline| PWA
    PWA -->|sync| BACKEND
```

---

## 📋 Requisitos

- **Docker Engine** ≥ 24.x + **Docker Compose** V2
- **Git** (para clonar)
- 2 GB RAM libre
- Puertos **80** (frontend) y **3000** (API) disponibles
- Opcional: **Node.js 20+** y **npm 10+** (solo desarrollo)

---

## 🚀 Instalación

### Opción A: Docker (recomendado) — **Sin necesidad de .env**

```bash
# 1. Clonar rama v1.0
git clone -b v1.0 https://github.com/Hector-dev/Plataforma_Educativa_Cacique_Tamanaco.git
cd Plataforma_Educativa_Cacique_Tamanaco

# 2. Construir y levantar (SIN .env — secrets se auto-generan)
docker compose up --build -d

# 3. Verificar
docker compose ps
curl http://localhost/api/health
```

**¡Listo!** Abre http://localhost en tu navegador.

> 💡 **No necesitas crear `.env`.** Si existe, sus valores tienen prioridad.
> Si no existe, Postgres usa `postgres:postgres` por defecto y los secrets
> (JWT, cifrado AES) se auto-generan con `crypto.randomBytes(32)` en el primer
> arranque y se persisten en un volumen Docker dedicado (`cacique_secrets`).

### Opción B: Sin Docker (desarrollo manual)

```bash
# Requiere Node.js 20+ y PostgreSQL 16 instalados

# 1. Clonar
git clone -b v1.0 https://github.com/Hector-dev/Plataforma_Educativa_Cacique_Tamanaco.git
cd Plataforma_Educativa_Cacique_Tamanaco

# 2. Crear .env con conexión a tu PostgreSQL local
cp .env.example .env
# Editar .env con tus datos locales
nano .env

# 3. Backend
cd backend
cp .env.example .env     # Configurar conexión a PostgreSQL
npm ci
npm run build
npm start                # API en :3000

# 4. Frontend (otra terminal)
cd frontend
npm ci
npx ng serve             # Dev server en :4200
```

---

## 🔐 Acceso inicial

| Campo | Valor |
|-------|-------|
| URL | http://localhost |
| Email (seed) | `admin@admin.com` |
| Contraseña (seed) | `admin` |
| Rol | Administrador |

> 💡 **Primer arranque sin seeds:** Si eliminas los scripts de init, la app
> muestra un **Setup Wizard** automático al entrar a http://localhost.
> Crea el admin desde la web — sin terminal, sin `.env`.

> ⚠️ Si usas los seeds, cambia la contraseña desde el panel de usuarios.

---

## � Configuración de Secrets (auto-generación)

v0.1 introduce un sistema de auto-generación de claves que elimina la dependencia de `.env`:

| Secreto | Generación | Persistencia |
|---------|-----------|--------------|
| `JWT_SECRET` | `crypto.randomBytes(32).toString('hex')` | Volumen `cacique_secrets` |
| `ENCRYPTION_KEY` | `crypto.randomBytes(32).toString('hex')` | Volumen `cacique_secrets` |
| `ENCRYPTION_IV` | `crypto.randomBytes(16).toString('hex')` | Volumen `cacique_secrets` |

**Prioridad:**
1. Variables de entorno (`.env` o `environment` en compose)
2. Archivo `/app/data/.secrets.json` persistido (re-arranques)
3. Auto-generación fresca si no existe nada

El módulo `backend/src/config.ts` centraliza toda la lógica. Los secrets se
guardan en `/app/data/.secrets.json` con permisos `0600` dentro de un volumen
Docker dedicado, aislado del host.

```
.
├── docker-compose.yml          # Orquestación de servicios + volumen cacique_secrets
├── .env.example                # Plantilla de variables de entorno (ahora opcional)
├── .gitignore
│
├── backend/                    # API REST (Express + TypeScript)
│   ├── Dockerfile
│   ├── src/
│   │   ├── app.ts              # Entry point + middlewares + rutas
│   │   ├── config.ts           # ⭐ Central de secrets (auto-generación JWT/AES)
│   │   ├── db.ts               # Pool PostgreSQL
│   │   ├── controllers/        # Lógica de negocio (12 controladores)
│   │   ├── middleware/         # Auth (JWT) + Upload (multer)
│   │   ├── routes/             # Definición de endpoints
│   │   └── utils/              # Crypto (AES-256)
│   └── __tests__/              # Tests unitarios
│
├── frontend/                   # PWA (Angular 21 standalone)
│   ├── Dockerfile
│   ├── nginx.conf              # Proxy reverso → backend
│   ├── src/app/
│   │   ├── core/               # Servicios, interceptores, modelos, utils
│   │   │   └── utils/          # theme.util.ts (tema oscuro/claro unificado)
│   │   └── features/           # Course editor, Quiz player, Setup Wizard ⭐
│   └── public/                 # favicon.ico, manifest.webmanifest, icons/
│
├── init-scripts/               # SQL auto-ejecutables (DDL + DML + migrations)
│   ├── 01_ddl.sql              # Esquema de tablas
│   ├── 02_dml.sql              # Usuario admin seed
│   ├── 03_migration_canvas.sql # Migración editor canvas
│   ├── 04_quiz.sql             # Sistema de quizzes
│   ├── 05_e2e_seed.sql         # Datos demo para pruebas E2E
│   ├── 05_migracion_fecha_asistencia.sql
│   ├── 06_sesiones_asistencia.sql # Migración asistencia por sesiones diarias
│   ├── 07_entregas_tarea.sql   # Tablas de entregas (migrada en 08)
│   └── 08_migrar_tareas_a_evaluaciones.sql # ⭐ Tareas → evaluaciones
│
├── e2e-tests/                  # Tests end-to-end (Playwright)
├── offline-package/            # Paquete para despliegue sin internet
│   ├── run-offline.sh          # Script de instalación offline
│   ├── docker-images/          # Imágenes .tar pre-construidas
│   └── README-OFFLINE.md
│
└── uploads/entregas/           # Archivos subidos (persistente)
```

---

## 🛠️ Comandos útiles

```bash
# Ver estado de servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Detener y borrar datos (⚠️ BD se pierde)
docker compose down -v

# Reconstruir después de cambios
docker compose up --build -d

# Etiquetar y publicar imágenes en Docker Hub
docker tag cacique-backend:latest <usuario>/cacique-backend:latest
docker tag cacique-frontend:latest <usuario>/cacique-frontend:latest
docker push <usuario>/cacique-backend:latest
docker push <usuario>/cacique-frontend:latest

# Backup de BD (reemplazar USER por el de tu .env, o postgres si usas defaults)
docker exec cacique-postgres pg_dump -U postgres cacique_tamanaco_db > backup.sql

# Restaurar BD
docker exec -i cacique-postgres psql -U postgres cacique_tamanaco_db < backup.sql
```

---

## 📱 Funcionalidades

### 📊 Dashboard
Panel KPI con métricas en tiempo real, gráficos interactivos (Chart.js), acceso rápido a todas las secciones.

### ⚙️ Setup Wizard (Primer Arranque)
Si no hay semillas precargadas, la app detecta la ausencia de admin y redirige
al **Setup Wizard** automático. Paso a paso: configuración del servidor, creación
del admin y confirmación. Sin terminal, sin `.env`.

### 👥 Gestión de Usuarios
CRUD completo con roles: **Administrador**, **Docente**, **Estudiante**. Filtros por rol, búsqueda, modal de creación/edición.

### 📖 Cursos y Clases
Cursos con estructura modular expansible. Cada curso contiene clases con evaluaciones, materiales y recursos. Matriculación de estudiantes.

### ✏️ Editor Visual Canvas
Editor drag-and-drop para estructurar cursos visualmente. Módulos → Lecciones → Evaluaciones/Quizzes/Materiales. Inspector lateral de propiedades. Soporte para undo/redo.

### 🎯 Sistema de Quizzes
Creación de quizzes con preguntas de opción múltiple o verdadero/falso. Tiempo límite configurable. Calificación automática. Tracking de intentos por estudiante.

### 📝 Entregas y Calificaciones
Subida de entregas de evaluaciones en PDF/Word o mediante enlace URL. Calificación con notas preliminares y definitivas. Escala 0-20 puntos.

### ✅ Control de Asistencia
Registro diario con estados: presente, ausente, justificado. Funciona sin conexión — sincroniza al reconectar.

### 📊 Reportes
- **Asistencia general**: porcentajes por curso y estudiante
- **Rendimiento por curso**: promedios, entregas completadas
- **Asistencia por género**: distribución demográfica
- **Exportación CSV** descargable

---

## 📊 Diagramas

> Diagramas Mermaid generados desde el esquema real (`init-scripts/`) y los
> componentes del frontend (`frontend/src/app/`). Versión completa en
> [`docs/DIAGRAMAS.md`](docs/DIAGRAMAS.md).

### Base de datos

```mermaid
erDiagram
    usuarios ||--o{ cursos : "docente (id_docente)"
    usuarios ||--o{ documentos_personales : "id_usuario"
    usuarios ||--o{ curso_estudiantes : "estudiante"
    cursos ||--o{ curso_estudiantes : "id_curso"
    usuarios ||--o{ matriculas : "id_estudiante"
    cursos ||--o{ matriculas : "id_curso"
    matriculas ||--o{ exposicion_motivos : "id_matricula"
    cursos ||--o{ clases : "id_curso"
    cursos ||--o{ materiales : "id_curso"
    cursos ||--o{ modulos : "id_curso"
    modulos ||--o{ clases : "id_modulo (opcional)"
    clases ||--o{ evaluaciones : "id_clase"
    clases ||--o{ materiales_curso : "id_clase"
    clases ||--o{ sesiones_asistencia : "id_clase"
    clases ||--o{ asistencias_alumnos : "id_clase"
    evaluaciones ||--o{ entregas_evaluacion : "id_evaluacion"
    evaluaciones ||--o{ calificaciones : "id_evaluacion"
    evaluaciones ||--o{ quizzes : "id_evaluacion"
    usuarios ||--o{ entregas_evaluacion : "id_estudiante"
    usuarios ||--o{ calificaciones : "id_estudiante"
    materiales ||--o{ progreso_material : "id_material"
    usuarios ||--o{ progreso_material : "id_estudiante"
    usuarios ||--o{ asistencias_alumnos : "id_estudiante"
    sesiones_asistencia ||--o{ asistencias_alumnos : "id_sesion"
    usuarios ||--o{ asistencias_trabajadores : "id_trabajador"
    usuarios ||--o{ mensajes : "id_remitente"
    usuarios ||--o{ mensajes : "id_destinatario"
    usuarios ||--o{ constancias_estudio : "id_estudiante"
    quizzes ||--o{ quiz_preguntas : "id_quiz"
    quiz_preguntas ||--o{ quiz_opciones : "id_pregunta"
    quizzes ||--o{ quiz_intentos : "id_quiz"
    usuarios ||--o{ quiz_intentos : "id_estudiante"
    quiz_intentos ||--o{ quiz_respuestas : "id_intento"
    quiz_preguntas ||--o{ quiz_respuestas : "id_pregunta"
```

### Componentes y sus funciones

```mermaid
flowchart TD
    subgraph Nucleo["core (servicios, guards, utils)"]
        Auth["auth.service.ts<br/>login() · logout() · getToken()<br/>getUser() · isAuthenticated()<br/>restoreSession()"]
        Toast["toast.service.ts<br/>show() · success() · error()<br/>warning() · info() · remove()"]
        Offline["offline-storage.service.ts<br/>saveAsistencia() · getPendingAsistencias()<br/>markAsistenciaSynced()<br/>saveEvaluacion() · getPendingEvaluaciones()"]
        Store["course-editor-store.service.ts<br/>cargarCurso() · guardarCurso() · undo()<br/>redo() · agregarModulo() · eliminarModulo()<br/>agregarLeccion() · eliminarLeccion()<br/>agregarItem() · actualizarItem()<br/>eliminarItem() · moverItem()<br/>seleccionarElemento()"]
        AuthGuard["auth.guard.ts<br/>authGuard() → redirige a login si no hay sesión"]
        RoleGuard["role.guard.ts<br/>roleGuard(roles) → valida rol/admin"]
        Theme["theme.util.ts<br/>applyTheme() · loadTheme()"]
    end

    subgraph Layout["App shell"]
        App["app (AppComponent)<br/>ngOnInit() · loadTheme() · toggleTheme()<br/>toggleMenu() · logout()<br/>filtra menú por rol"]
    end

    subgraph Features["features"]
        Login["login.component.ts<br/>onLogin()"]
        Dashboard["dashboard.component.ts<br/>ngOnInit() · loadDashboard()"]
        Courses["courses.component.ts<br/>loadCursos() · crearCurso()<br/>abrirModal() · cerrarModal()<br/>inscribirEstudiante()<br/>cargarEstudiantesDisponibles()"]
        Editor["course-editor.component.ts<br/>guardar() · deshacer() · rehacer()<br/>dropEnCanvas() · dropEnModulo()<br/>dropEnLeccion()<br/>agregarModulo() · agregarLeccion()<br/>agregarItem() · eliminarItem()<br/>seleccionarModulo() · iniciarEdicion()<br/>toggleTheme() · atajos teclado"]
        Preview["course-preview.component.ts<br/>toggleLeccion() · iconoItem()<br/>abrirNotas() · guardarCalificacion()<br/>abrirEntrega() · enviarEntrega()<br/>onArchivoSeleccionado()"]
        LessonCard["lesson-card.component.ts<br/>iconoItem() · labelTipo() · vencida()<br/>extraerEvaId() · sanitizeUrl()<br/>videoError()"]
        Quiz["quiz-player.component.ts<br/>iniciarTimer() · formatoTiempo()<br/>seleccionarRespuesta()<br/>finalizarQuiz() · volver()"]
        Attendance["attendance.component.ts<br/>loadClases() · loadSesionHoy()<br/>abrirAsistencia() · loadAlumnos()<br/>marcar() · cerrarAsistencia()<br/>syncNow() · puedeMarcar()"]
        Reports["reports.component.ts<br/>onTipoChange() · loadReporte()<br/>descargarCSV()"]
        Users["user-management.component.ts<br/>loadUsuarios() · search()<br/>goPage() · openCreateModal()<br/>openEditModal() · saveUser()<br/>deleteUser()"]
        Grades["my-grades.component.ts<br/>cargarMisNotas()<br/>agruparNotasPorCurso()<br/>toggleNotasCurso() · notaFinal()"]
    end

    Auth --> Login
    Auth --> App
    Auth --> Dashboard
    Auth --> Courses
    Auth --> Users
    App --> Auth
    Store --> Editor
    Store --> Preview
    Offline --> Attendance
    Offline --> Preview
    Toast --> App
    App --> Theme
    Editor --> Theme
    AuthGuard -.-> Login
    AuthGuard -.-> Dashboard
    RoleGuard -.-> Courses
    RoleGuard -.-> Users
    RoleGuard -.-> Attendance
    RoleGuard -.-> Reports
    Editor --> Preview
    Preview --> LessonCard
    Preview --> Quiz
```

### Solo componentes

```mermaid
flowchart TD
    subgraph Core["core"]
        Auth["auth.service.ts"]
        Toast["toast.service.ts"]
        Offline["offline-storage.service.ts"]
        Store["course-editor-store.service.ts"]
        AuthGuard["auth.guard.ts"]
        RoleGuard["role.guard.ts"]
        Theme["theme.util.ts"]
    end

    subgraph Shell["App shell"]
        App["AppComponent"]
    end

    subgraph Features["features"]
        Login["login"]
        Dashboard["dashboard"]
        Courses["courses"]
        Editor["course-editor"]
        Preview["course-preview"]
        LessonCard["lesson-card"]
        Quiz["quiz-player"]
        Attendance["attendance"]
        Reports["reports"]
        Users["user-management"]
        Grades["my-grades"]
    end

    App --> Login
    App --> Dashboard
    App --> Courses
    App --> Editor
    App --> Preview
    App --> Quiz
    App --> Attendance
    App --> Reports
    App --> Users
    App --> Grades

    Login --> Auth
    Dashboard --> Auth
    App --> Auth
    App --> Toast
    App --> Theme
    Editor --> Theme

    Editor --> Store
    Editor --> Preview
    Preview --> LessonCard
    Preview --> Quiz

    Attendance --> Offline
    Preview --> Offline
    Attendance --> Auth

    AuthGuard --> Login
    RoleGuard --> Courses
    RoleGuard --> Users
    RoleGuard --> Attendance
    RoleGuard --> Reports
```

---

## 📄 Licencia

MIT © 2026 — Desarrollado para la **U.E.N. Cacique Tamanaco**

---

<p align="center">
  <sub>Built with ❤️ using Angular · Express · PostgreSQL · Docker</sub>
</p>
