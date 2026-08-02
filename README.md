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

Para la defensa de tesis, el DER se presenta en **dos niveles de abstracción**:
un **mapa conceptual** de módulos funcionales (macro) y **diagramas de detalle**
segmentados por subsistema.

#### Mapa conceptual de módulos (macro)

```mermaid
flowchart LR
    subgraph LMS["SISTEMA LMS / SGA"]
        direction LR
        M1["1. USUARIOS Y COMUNICACIÓN<br/>usuarios · documentos_personales<br/>asistencias_trabajadores"]
        M2["2. ESTRUCTURA ACADÉMICA<br/>cursos · modulos · clases<br/>materiales · materiales_curso"]
        M3["3. MATRÍCULA Y TRÁMITES<br/>matriculas · curso_estudiantes<br/>exposicion_motivos · constancias_estudio"]
        M4["4. EVALUACIONES Y QUIZZES<br/>evaluaciones · entregas_evaluacion<br/>calificaciones · quizzes + respuestas"]
        M5["5. SEGUIMIENTO Y ASISTENCIA<br/>sesiones_asistencia · asistencias_alumnos<br/>asistencias_trabajadores · progreso_material"]
    end
    M1 <--> M2
    M2 <--> M3
    M3 <--> M4
    M4 <--> M5
```

#### Diagrama ER completo estructurado por subsistemas (detalle)

```mermaid
erDiagram

    %% ==========================================
    %% MÓDULO 1: USUARIOS Y COMUNICACIÓN
    %% ==========================================
    usuarios ||--o{ documentos_personales : "registra"
    usuarios ||--o{ asistencias_trabajadores : "registra_trabajador"

    %% ==========================================
    %% MÓDULO 2: ESTRUCTURA ACADÉMICA Y CONTENIDOS
    %% ==========================================
    usuarios ||--o{ cursos : "imparte (id_docente)"
    cursos ||--o{ modulos : "se_divide_en"
    cursos ||--o{ clases : "contiene"
    cursos ||--o{ materiales : "posee"
    modulos ||--o{ clases : "agrupa (opcional)"
    clases ||--o{ materiales_curso : "incluye"

    %% ==========================================
    %% MÓDULO 3: MATRÍCULA Y TRÁMITES
    %% ==========================================
    usuarios ||--o{ curso_estudiantes : "cursa_estudiante"
    cursos ||--o{ curso_estudiantes : "pertenece_a"
    usuarios ||--o{ matriculas : "solicita"
    cursos ||--o{ matriculas : "oferta"
    matriculas ||--o{ exposicion_motivos : "respalda"
    usuarios ||--o{ constancias_estudio : "emite_a"

    %% ==========================================
    %% MÓDULO 4: EVALUACIONES, ENTREGAS Y QUIZZES
    %% ==========================================
    clases ||--o{ evaluaciones : "contiene"
    evaluaciones ||--o{ entregas_evaluacion : "genera"
    evaluaciones ||--o{ calificaciones : "asigna"
    evaluaciones ||--o{ quizzes : "implementa"

    usuarios ||--o{ entregas_evaluacion : "realiza"
    usuarios ||--o{ calificaciones : "recibe"

    quizzes ||--o{ quiz_preguntas : "se_compone_de"
    quiz_preguntas ||--o{ quiz_opciones : "ofrece"
    quizzes ||--o{ quiz_intentos : "registra"
    usuarios ||--o{ quiz_intentos : "inicia"
    quiz_intentos ||--o{ quiz_respuestas : "guarda"
    quiz_preguntas ||--o{ quiz_respuestas : "evalúa"

    %% ==========================================
    %% MÓDULO 5: SEGUIMIENTO Y ASISTENCIA
    %% ==========================================
    clases ||--o{ sesiones_asistencia : "inicia"
    clases ||--o{ asistencias_alumnos : "registra_clase"
    sesiones_asistencia ||--o{ asistencias_alumnos : "vincula_sesion"
    usuarios ||--o{ asistencias_alumnos : "asiste_estudiante"

    materiales ||--o{ progreso_material : "mide"
    usuarios ||--o{ progreso_material : "avanza"
```

#### Diagrama de tablas por módulo (entidades y atributos)

Cada módulo se presenta en una diapositiva independiente para evitar el
diagrama monolítico ilegible.

**Módulo 1: Usuarios y Comunicación**

```mermaid
erDiagram
    usuarios ||--o{ documentos_personales : "registra"
    usuarios ||--o{ asistencias_trabajadores : "registra_trabajador"

    usuarios {
        serial id_usuario PK
        varchar nombre_completo
        varchar cedula UK
        varchar email UK
        varchar password
        varchar rol
        varchar tipo_discapacidad
        varchar foto_url
        integer edad
        varchar genero
        timestamptz fecha_creacion
    }
    documentos_personales {
        serial id_documento PK
        integer id_usuario FK
        varchar tipo_documento
        text numero_identificacion
        text archivo_url
        timestamptz fecha_subida
    }
    asistencias_trabajadores {
        serial id_asistencia_trabajador PK
        integer id_trabajador FK
        date fecha
        time hora_entrada
        time hora_salida
        varchar estado
    }
```

**Módulo 2: Estructura Académica y Contenidos**

```mermaid
erDiagram
    usuarios ||--o{ cursos : "imparte (id_docente)"
    cursos ||--o{ modulos : "se_divide_en"
    cursos ||--o{ clases : "contiene"
    cursos ||--o{ materiales : "posee"
    modulos ||--o{ clases : "agrupa (opcional)"
    clases ||--o{ materiales_curso : "incluye"

    cursos {
        serial id_curso PK
        integer id_docente FK
        varchar nombre
        text descripcion
        integer version
        timestamptz creado_en
    }
    modulos {
        serial id_modulo PK
        integer id_curso FK
        varchar titulo
        text descripcion
        numeric orden
    }
    clases {
        serial id_clase PK
        integer id_curso FK
        integer id_modulo FK
        varchar titulo
        varchar tipo_discapacidad
        timestamptz fecha
        text enlace_recurso
        text descripcion
        integer duracion_minutos
        numeric orden
    }
    materiales {
        serial id_material PK
        integer id_curso FK
        varchar titulo
        varchar tipo
        text contenido
        integer orden
    }
    materiales_curso {
        serial id_material_curso PK
        integer id_clase FK
        varchar titulo
        text descripcion
        text url_recurso
        varchar tipo_recurso
        numeric orden
    }
```

**Módulo 3: Matrícula y Trámites**

```mermaid
erDiagram
    usuarios ||--o{ curso_estudiantes : "cursa_estudiante"
    cursos ||--o{ curso_estudiantes : "pertenece_a"
    usuarios ||--o{ matriculas : "solicita"
    cursos ||--o{ matriculas : "oferta"
    matriculas ||--o{ exposicion_motivos : "respalda"
    usuarios ||--o{ constancias_estudio : "emite_a"

    matriculas {
        serial id_matricula PK
        integer id_estudiante FK
        integer id_curso FK
        varchar estado
        timestamptz fecha_inscripcion
    }
    curso_estudiantes {
        integer id_curso PK, FK
        integer id_estudiante PK, FK
        timestamptz inscrito_en
    }
    exposicion_motivos {
        serial id_exposicion PK
        integer id_matricula FK
        text motivo
        boolean aprobado
    }
    constancias_estudio {
        serial id_constancia PK
        integer id_estudiante FK
        varchar codigo_verificacion UK
        text url_documento
    }
```

**Módulo 4: Evaluaciones, Entregas y Quizzes**

```mermaid
erDiagram
    clases ||--o{ evaluaciones : "contiene"
    evaluaciones ||--o{ entregas_evaluacion : "genera"
    evaluaciones ||--o{ calificaciones : "asigna"
    evaluaciones ||--o{ quizzes : "implementa"
    usuarios ||--o{ entregas_evaluacion : "realiza"
    usuarios ||--o{ calificaciones : "recibe"
    quizzes ||--o{ quiz_preguntas : "se_compone_de"
    quiz_preguntas ||--o{ quiz_opciones : "ofrece"
    quizzes ||--o{ quiz_intentos : "registra"
    usuarios ||--o{ quiz_intentos : "inicia"
    quiz_intentos ||--o{ quiz_respuestas : "guarda"
    quiz_preguntas ||--o{ quiz_respuestas : "evalúa"

    evaluaciones {
        serial id_evaluacion PK
        integer id_clase FK
        varchar titulo_evaluacion
        numeric porcentaje
        text descripcion
        numeric orden
    }
    entregas_evaluacion {
        serial id_entrega PK
        integer id_evaluacion FK
        integer id_estudiante FK
        varchar formato_entrega
        text contenido
        timestamptz fecha_entrega
    }
    calificaciones {
        serial id_calificacion PK
        integer id_evaluacion FK
        integer id_estudiante FK
        numeric nota_preliminar
        numeric nota_definitiva
        text observaciones
        timestamptz fecha_registro
    }
    quizzes {
        serial id_quiz PK
        integer id_evaluacion FK
        varchar titulo
        text descripcion
        integer tiempo_limite_min
        boolean activo
        timestamptz creado_en
    }
    quiz_preguntas {
        serial id_pregunta PK
        integer id_quiz FK
        text enunciado
        varchar tipo
        integer orden
    }
    quiz_opciones {
        serial id_opcion PK
        integer id_pregunta FK
        text texto
        boolean es_correcta
        char orden
    }
    quiz_intentos {
        serial id_intento PK
        integer id_quiz FK
        integer id_estudiante FK
        numeric nota
        integer total_preguntas
        integer acertadas
        boolean finalizado
        timestamptz iniciado_en
        timestamptz finalizado_en
    }
    quiz_respuestas {
        serial id_respuesta PK
        integer id_intento FK
        integer id_pregunta FK
        integer id_opcion FK
        boolean es_correcta
    }
```

**Módulo 5: Seguimiento y Asistencia**

```mermaid
erDiagram
    clases ||--o{ sesiones_asistencia : "inicia"
    clases ||--o{ asistencias_alumnos : "registra_clase"
    sesiones_asistencia ||--o{ asistencias_alumnos : "vincula_sesion"
    usuarios ||--o{ asistencias_alumnos : "asiste_estudiante"
    materiales ||--o{ progreso_material : "mide"
    usuarios ||--o{ progreso_material : "avanza"

    sesiones_asistencia {
        serial id_sesion PK
        integer id_clase FK
        integer id_docente FK
        date fecha
        varchar estado
        integer total_presentes
        integer total_ausentes
        integer total_justificados
        timestamp creado_en
        timestamp cerrado_en
    }
    asistencias_alumnos {
        serial id_asistencia PK
        integer id_clase FK
        integer id_estudiante FK
        integer id_sesion FK
        varchar estado
        date fecha_registro
    }
    progreso_material {
        serial id_progreso PK
        integer id_estudiante FK
        integer id_material FK
        varchar estado
        numeric nota
    }
    calendarios {
        serial id_evento PK
        varchar titulo
        text descripcion
        timestamptz fecha_inicio
        varchar tipo_evento
    }
```

#### Sub-diagramas modulares para diapositivas

**A. Subsistema de Evaluaciones y Quizzes**

```mermaid
erDiagram
    clases ||--o{ evaluaciones : "contiene"
    evaluaciones ||--o{ entregas_evaluacion : "genera"
    evaluaciones ||--o{ calificaciones : "asigna"
    evaluaciones ||--o{ quizzes : "implementa"
    usuarios ||--o{ entregas_evaluacion : "realiza"
    usuarios ||--o{ calificaciones : "recibe"

    quizzes ||--o{ quiz_preguntas : "posee"
    quiz_preguntas ||--o{ quiz_opciones : "ofrece"
    quizzes ||--o{ quiz_intentos : "registra"
    usuarios ||--o{ quiz_intentos : "ejecuta"
    quiz_intentos ||--o{ quiz_respuestas : "contiene"
    quiz_preguntas ||--o{ quiz_respuestas : "valida"
```

**B. Subsistema de Control de Asistencia y Progreso**

```mermaid
erDiagram
    usuarios ||--o{ asistencias_alumnos : "asiste"
    clases ||--o{ sesiones_asistencia : "programa"
    clases ||--o{ asistencias_alumnos : "registra"
    sesiones_asistencia ||--o{ asistencias_alumnos : "valida"

    materiales ||--o{ progreso_material : "mide"
    usuarios ||--o{ progreso_material : "avanza"
```

> 💡 **Puntos clave para el jurado:**
> - La relación opcional entre `modulos` y `clases` permite flexibilidad si un
>   curso no requiere estructuración formal en módulos.
> - La separación entre `evaluaciones` convencionales y `quizzes` permite
>   trazabilidad granular de respuestas por pregunta/intento sin sobrecargar
>   la tabla de calificaciones.

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
