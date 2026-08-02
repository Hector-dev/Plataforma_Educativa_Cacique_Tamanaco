# Trabajo Especial de Grado

## Plataforma Educativa Móvil Cacique Tamanaco
### Sistema de Gestión de Aprendizaje (LMS) · Offline-First · PWA

---

### Datos del proyecto

| Campo | Detalle |
|-------|---------|
| **Institución** | U.E.N. Cacique Tamanaco |
| **Plataforma** | Web móvil (PWA) |
| **Área** | Educación — Gestión de aprendizaje (LMS/SGA) |
| **Versión** | v1.0 |
| **Licencia** | MIT |

---

## Resumen

El presente trabajo desarrolla una plataforma educativa móvil de tipo PWA que integra la gestión de cursos, estudiantes, docentes, evaluaciones, quizzes, entregas y control de asistencia, diseñada con enfoque **offline-first** para garantizar operatividad en entornos con conectividad limitada. El sistema se compone de una API REST construida con Express.js y TypeScript, una base de datos PostgreSQL y un frontend Angular 21 empaquetado como aplicación web instalable, con soporte de sincronización de datos mediante IndexedDB (Dexie.js).

---

## Índice

- [1. Introducción](#1-introducción)
- [2. Objetivos](#2-objetivos)
- [3. Marco Metodológico y Tecnológico](#3-marco-metodológico-y-tecnológico)
- [4. Arquitectura del Sistema](#4-arquitectura-del-sistema)
- [5. Modelo de Datos (DER)](#5-modelo-de-datos-der)
- [6. Componentes del Frontend](#6-componentes-del-frontend)
- [7. Funcionalidades](#7-funcionalidades)
- [8. Instalación y Despliegue](#8-instalación-y-despliegue)
- [9. Estructura del Proyecto](#9-estructura-del-proyecto)
- [10. Conclusiones](#10-conclusiones)
- [11. Referencias](#11-referencias)

---

## 1. Introducción

Las instituciones educativas requieren herramientas digitales que permitan centralizar el proceso de enseñanza-aprendizaje: publicación de contenidos, gestión de cursos, seguimiento de estudiantes y evaluación. La **U.E.N. Cacique Tamanaco** enfrenta, además, limitaciones de conectividad que dificultan el uso de plataformas exclusivamente en línea.

Esta plataforma aborda dicha problemática mediante una arquitectura **offline-first**: el estudiante consulta materiales, rinde evaluaciones y registra asistencia incluso sin conexión, y los datos se sincronizan automáticamente al restablecerse la red. El sistema incorpora control de roles (Administrador, Docente y Estudiante), editor visual de cursos, sistema de quizzes con calificación automática, entregas con rúbrica 0–20 y reportes exportables a CSV.

---

## 2. Objetivos

### 2.1 Objetivo General

Desarrollar una plataforma educativa móvil (PWA) que gestione el proceso de enseñanza-aprendizaje de la U.E.N. Cacique Tamanaco, garantizando su operatividad en escenarios sin conexión a internet.

### 2.2 Objetivos Específicos

- Diseñar un modelo de datos relacional que integre usuarios, cursos, matrículas, evaluaciones, quizzes y asistencia.
- Implementar una API REST segura (JWT + cifrado AES-256) para la gestión de los recursos académicos.
- Construir un frontend responsive con editor visual de cursos y soporte offline mediante IndexedDB.
- Desplegar la aplicación mediante contenedores Docker con inicialización automática de la base de datos.

---

## 3. Marco Metodológico y Tecnológico

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Angular | 21 | Frontend (SPA, standalone components) |
| Express.js | 4.x | API REST (TypeScript) |
| PostgreSQL | 16 | Base de datos relacional |
| Docker | 27 | Orquestación de servicios |
| PWA | — | Instalable, offline-first |
| Chart.js | — | Visualización de reportes |
| Playwright | — | Pruebas end-to-end |

**Cifrado y autenticación:** JWT para sesiones, bcrypt para contraseñas y AES-256-CBC para documentos personales sensibles.

---

## 4. Arquitectura del Sistema

La aplicación se distribuye en dos contenedores: el frontend servido por NGINX (PWA) y el backend Express. El navegador almacena datos offline en IndexedDB y sincroniza con la API al recuperar conectividad.

```mermaid
flowchart LR
    subgraph NAV["Navegador"]
        PWA["PWA Angular 21 - Service Worker - IndexedDB"]
    end

    subgraph DOCK["Docker Compose"]
        NGINX["NGINX :80 - Proxy reverso"]
        BACKEND["Express.js :3000 - TypeScript - JWT Auth"]
        DB[("PostgreSQL 16 :5432")]
    end

    PWA -->|"HTTP"| NGINX
    NGINX -->|"/api/*"| BACKEND
    BACKEND -->|"pg pool"| DB
    PWA -->|"offline"| PWA
    PWA -->|"sync"| BACKEND
```


---

## 5. Modelo de Datos (DER)

El esquema relacional se presenta en tres niveles: un **mapa conceptual** de módulos funcionales, el **DER completo** por subsistemas y **diagramas de tablas con atributos** por módulo.

### 5.1 Mapa conceptual de módulos (macro)

```mermaid
flowchart LR
    subgraph LMS["SISTEMA LMS / SGA"]
        direction LR
        M1["1. USUARIOS Y COMUNICACION: usuarios, documentos_personales, asistencias_trabajadores"]
        M2["2. ESTRUCTURA ACADEMICA: cursos, modulos, clases, materiales, materiales_curso"]
        M3["3. MATRICULA Y TRAMITES: matriculas, curso_estudiantes, exposicion_motivos, constancias_estudio"]
        M4["4. EVALUACIONES Y QUIZZES: evaluaciones, entregas_evaluacion, calificaciones, quizzes"]
        M5["5. SEGUIMIENTO Y ASISTENCIA: sesiones_asistencia, asistencias_alumnos, progreso_material"]
    end
    M1 <--> M2
    M2 <--> M3
    M3 <--> M4
    M4 <--> M5
```


### 5.2 Diagrama ER completo por subsistemas (detalle)

```mermaid
erDiagram

    %% ==========================================
    %% MODULO 1: USUARIOS Y COMUNICACION
    %% ==========================================
    usuarios ||--o{ documentos_personales : "registra"
    usuarios ||--o{ asistencias_trabajadores : "registra_trabajador"

    %% ==========================================
    %% MODULO 2: ESTRUCTURA ACADEMICA Y CONTENIDOS
    %% ==========================================
    usuarios ||--o{ cursos : "imparte (id_docente)"
    cursos ||--o{ modulos : "se_divide_en"
    cursos ||--o{ clases : "contiene"
    cursos ||--o{ materiales : "posee"
    modulos ||--o{ clases : "agrupa (opcional)"
    clases ||--o{ materiales_curso : "incluye"

    %% ==========================================
    %% MODULO 3: MATRICULA Y TRAMITES
    %% ==========================================
    usuarios ||--o{ curso_estudiantes : "cursa_estudiante"
    cursos ||--o{ curso_estudiantes : "pertenece_a"
    usuarios ||--o{ matriculas : "solicita"
    cursos ||--o{ matriculas : "oferta"
    matriculas ||--o{ exposicion_motivos : "respalda"
    usuarios ||--o{ constancias_estudio : "emite_a"

    %% ==========================================
    %% MODULO 4: EVALUACIONES, ENTREGAS Y QUIZZES
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
    quiz_preguntas ||--o{ quiz_respuestas : "evalua"

    %% ==========================================
    %% MODULO 5: SEGUIMIENTO Y ASISTENCIA
    %% ==========================================
    clases ||--o{ sesiones_asistencia : "inicia"
    clases ||--o{ asistencias_alumnos : "registra_clase"
    sesiones_asistencia ||--o{ asistencias_alumnos : "vincula_sesion"
    usuarios ||--o{ asistencias_alumnos : "asiste_estudiante"

    materiales ||--o{ progreso_material : "mide"
    usuarios ||--o{ progreso_material : "avanza"
```


### 5.3 Diagramas de tablas por módulo (entidades y atributos)

Cada módulo se presenta en una diapositiva independiente para evitar el diagrama monolítico ilegible.

**Módulo 1: Usuarios y Comunicación**

> Usuarios, documentos personales y asistencia de trabajadores.

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

> Cursos, módulos, clases, materiales y materiales por clase.

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

> Matrículas, curso-estudiantes, exposición de motivos y constancias.

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

> Evaluaciones, entregas, calificaciones y el subsistema de quizzes.

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
    quiz_preguntas ||--o{ quiz_respuestas : "evalua"

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

> Sesiones de asistencia, asistencias por alumno y progreso de material.

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


### 5.4 Subsistemas de detalle (diapositivas de apoyo)

**A. Subsistema de Evaluaciones y Quizzes**

```mermaid
erDiagram
    evaluaciones ||--o{ entregas_evaluacion : "genera"
    evaluaciones ||--o{ calificaciones : "asigna"
    evaluaciones ||--o{ quizzes : "implementa"
    quizzes ||--o{ quiz_preguntas : "posee"
    quiz_preguntas ||--o{ quiz_opciones : "ofrece"
    quizzes ||--o{ quiz_intentos : "registra"
    quiz_intentos ||--o{ quiz_respuestas : "guarda"
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


> **Puntos clave:** la relación opcional entre `modulos` y `clases` permite flexibilidad estructural; la separación entre `evaluaciones` convencionales y `quizzes` garantiza trazabilidad granular de respuestas por intento.

---

## 6. Componentes del Frontend

La aplicación sigue el patrón **container/presentational** con componentes standalone de Angular 21. A continuación se documentan el árbol de dependencias (vista general) y las responsabilidades de cada componente.

### 6.1 Vista general (dependencias)

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


### auth.service.ts

```mermaid
flowchart LR
    A["auth.service.ts"] --> m1["login()"]
    A --> m2["logout()"]
    A --> m3["getToken()"]
    A --> m4["getUser()"]
    A --> m5["isAuthenticated()"]
    A --> m6["restoreSession()"]
```


### toast.service.ts

```mermaid
flowchart LR
    T["toast.service.ts"] --> m1["show()"]
    T --> m2["success()"]
    T --> m3["error()"]
    T --> m4["warning()"]
    T --> m5["info()"]
    T --> m6["remove()"]
```


### offline-storage.service.ts

```mermaid
flowchart LR
    O["offline-storage.service.ts"] --> m1["saveAsistencia()"]
    O --> m2["getPendingAsistencias()"]
    O --> m3["markAsistenciaSynced()"]
    O --> m4["saveEvaluacion()"]
    O --> m5["getPendingEvaluaciones()"]
```


### course-editor-store.service.ts

```mermaid
flowchart LR
    S["course-editor-store.service.ts"] --> m1["cargarCurso()"]
    S --> m2["guardarCurso()"]
    S --> m3["undo()"]
    S --> m4["redo()"]
    S --> m5["agregarModulo()"]
    S --> m6["eliminarModulo()"]
    S --> m7["agregarLeccion()"]
    S --> m8["eliminarLeccion()"]
    S --> m9["agregarItem()"]
    S --> m10["actualizarItem()"]
    S --> m11["eliminarItem()"]
    S --> m12["moverItem()"]
    S --> m13["seleccionarElemento()"]
```


### auth.guard.ts

```mermaid
flowchart LR
    G["auth.guard.ts"] --> m1["authGuard() - redirige a login si no hay sesion"]
```


### role.guard.ts

```mermaid
flowchart LR
    R["role.guard.ts"] --> m1["roleGuard(roles) - valida rol/admin"]
```


### theme.util.ts

```mermaid
flowchart LR
    U["theme.util.ts"] --> m1["applyTheme()"]
    U --> m2["loadTheme()"]
```


### AppComponent (app shell)

```mermaid
flowchart LR
    A["AppComponent"] --> m1["ngOnInit()"]
    A --> m2["loadTheme()"]
    A --> m3["toggleTheme()"]
    A --> m4["toggleMenu()"]
    A --> m5["logout()"]
    A --> m6["filtra menu por rol"]
```


### login.component.ts

```mermaid
flowchart LR
    L["login.component.ts"] --> m1["onLogin()"]
```


### dashboard.component.ts

```mermaid
flowchart LR
    D["dashboard.component.ts"] --> m1["ngOnInit()"]
    D --> m2["loadDashboard()"]
```


### courses.component.ts

```mermaid
flowchart LR
    C["courses.component.ts"] --> m1["loadCursos()"]
    C --> m2["crearCurso()"]
    C --> m3["abrirModal()"]
    C --> m4["cerrarModal()"]
    C --> m5["inscribirEstudiante()"]
    C --> m6["cargarEstudiantesDisponibles()"]
```


### course-editor.component.ts

```mermaid
flowchart LR
    E["course-editor.component.ts"] --> m1["guardar()"]
    E --> m2["deshacer()"]
    E --> m3["rehacer()"]
    E --> m4["dropEnCanvas()"]
    E --> m5["dropEnModulo()"]
    E --> m6["dropEnLeccion()"]
    E --> m7["agregarModulo()"]
    E --> m8["agregarLeccion()"]
    E --> m9["agregarItem()"]
    E --> m10["eliminarItem()"]
    E --> m11["seleccionarModulo()"]
    E --> m12["iniciarEdicion()"]
    E --> m13["toggleTheme()"]
    E --> m14["atajos teclado"]
```


### course-preview.component.ts

```mermaid
flowchart LR
    P["course-preview.component.ts"] --> m1["toggleLeccion()"]
    P --> m2["iconoItem()"]
    P --> m3["abrirNotas()"]
    P --> m4["guardarCalificacion()"]
    P --> m5["abrirEntrega()"]
    P --> m6["enviarEntrega()"]
    P --> m7["onArchivoSeleccionado()"]
```


### lesson-card.component.ts

```mermaid
flowchart LR
    LC["lesson-card.component.ts"] --> m1["iconoItem()"]
    LC --> m2["labelTipo()"]
    LC --> m3["vencida()"]
    LC --> m4["extraerEvaId()"]
    LC --> m5["sanitizeUrl()"]
    LC --> m6["videoError()"]
```


### quiz-player.component.ts

```mermaid
flowchart LR
    Q["quiz-player.component.ts"] --> m1["iniciarTimer()"]
    Q --> m2["formatoTiempo()"]
    Q --> m3["seleccionarRespuesta()"]
    Q --> m4["finalizarQuiz()"]
    Q --> m5["volver()"]
```


### attendance.component.ts

```mermaid
flowchart LR
    AT["attendance.component.ts"] --> m1["loadClases()"]
    AT --> m2["loadSesionHoy()"]
    AT --> m3["abrirAsistencia()"]
    AT --> m4["loadAlumnos()"]
    AT --> m5["marcar()"]
    AT --> m6["cerrarAsistencia()"]
    AT --> m7["syncNow()"]
    AT --> m8["puedeMarcar()"]
```


### reports.component.ts

```mermaid
flowchart LR
    RP["reports.component.ts"] --> m1["onTipoChange()"]
    RP --> m2["loadReporte()"]
    RP --> m3["descargarCSV()"]
```


### user-management.component.ts

```mermaid
flowchart LR
    UM["user-management.component.ts"] --> m1["loadUsuarios()"]
    UM --> m2["search()"]
    UM --> m3["goPage()"]
    UM --> m4["openCreateModal()"]
    UM --> m5["openEditModal()"]
    UM --> m6["saveUser()"]
    UM --> m7["deleteUser()"]
```


### my-grades.component.ts

```mermaid
flowchart LR
    MG["my-grades.component.ts"] --> m1["cargarMisNotas()"]
    MG --> m2["agruparNotasPorCurso()"]
    MG --> m3["toggleNotasCurso()"]
    MG --> m4["notaFinal()"]
```


---

## 7. Funcionalidades

| Categoría | Funcionalidades |
|-----------|----------------|
| **Usuarios** | CRUD completo, roles (Admin/Docente/Estudiante), JWT auth, bcrypt |
| **Cursos** | Creación, matriculación, estructura modular con clases |
| **Editor Visual** | Canvas drag & drop, módulos, lecciones, evaluaciones, quizzes, materiales |
| **Quizzes** | Opción múltiple, verdadero/falso, tiempo límite, calificación automática |
| **Entregas** | Subida de archivos (PDF/Word), enlaces URL, calificación docente |
| **Asistencia** | Registro presente/ausente/justificado, soporte offline |
| **Reportes** | Rendimiento por curso, asistencia general, gráficos Chart.js, exportación CSV |
| **Documentos** | Cifrado AES-256-CBC para documentos personales sensibles |
| **Offline-First** | IndexedDB (Dexie.js), sincronización masiva al reconectar |
| **Tema** | Claro/Oscuro persistente, toggle unificado (`theme.util.ts`) |
| **Responsive** | Sidebar colapsable, off-canvas móvil, inspector overlay, hamburger menu |
| **Docker** | Multi-stage builds, healthchecks, init scripts automáticos |

### 7.1 Dashboard
Panel KPI con métricas en tiempo real, gráficos interactivos (Chart.js) y acceso rápido a todas las secciones.

### 7.2 Setup Wizard (Primer Arranque)
Si no hay semillas precargadas, la app detecta la ausencia de administrador y redirige al **Setup Wizard**: configuración del servidor, creación del admin y confirmación — sin terminal ni `.env`.

### 7.3 Gestión de Usuarios
CRUD completo con roles (Administrador, Docente, Estudiante), filtros por rol, búsqueda y modal de creación/edición.

### 7.4 Cursos y Clases
Cursos con estructura modular expansible. Cada curso contiene clases con evaluaciones, materiales y recursos. Matriculación de estudiantes.

### 7.5 Editor Visual Canvas
Editor drag-and-drop para estructurar cursos visualmente: Módulos → Lecciones → Evaluaciones/Quizzes/Materiales. Inspector lateral de propiedades y soporte para undo/redo.

### 7.6 Sistema de Quizzes
Creación de quizzes con preguntas de opción múltiple o verdadero/falso, tiempo límite configurable, calificación automática y tracking de intentos por estudiante.

### 7.7 Entregas y Calificaciones
Subida de entregas en PDF/Word o mediante enlace URL. Calificación con notas preliminares y definitivas. Escala 0–20 puntos.

### 7.8 Control de Asistencia
Registro diario con estados (presente, ausente, justificado). Funciona sin conexión y sincroniza al reconectar.

### 7.9 Reportes
- Asistencia general: porcentajes por curso y estudiante
- Rendimiento por curso: promedios y entregas completadas
- Asistencia por género: distribución demográfica
- Exportación CSV descargable

---

## 8. Instalación y Despliegue

### 8.1 Requisitos

- Docker Engine ≥ 24.x + Docker Compose V2
- Git
- 2 GB RAM libre
- Puertos **80** (frontend) y **3000** (API) disponibles
- Opcional: Node.js 20+ y npm 10+ (solo desarrollo)

### 8.2 Opción A: Docker (recomendado)

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

> No necesitas crear `.env`. Si existe, sus valores tienen prioridad. En caso contrario, Postgres usa `postgres:postgres` por defecto y los secrets (JWT, cifrado AES) se auto-generan con `crypto.randomBytes(32)` en el primer arranque, persistiéndose en el volumen dedicado `cacique_secrets`.

### 8.3 Opción B: Sin Docker (desarrollo manual)

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


### 8.4 Acceso inicial

| Campo | Valor |
|-------|-------|
| URL | http://localhost |
| Email (seed) | `admin@admin.com` |
| Contraseña (seed) | `admin` |
| Rol | Administrador |

> Si eliminas los scripts de init, la app muestra un **Setup Wizard** automático al entrar a http://localhost. Crea el admin desde la web, sin terminal ni `.env`. Cambia la contraseña seed desde el panel de usuarios.

### 8.5 Comandos útiles

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

## 9. Estructura del Proyecto

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

## 10. Conclusiones

- La arquitectura **offline-first** permite que estudiantes y docentes continúen la actividad académica sin conexión, sincronizando al recuperar conectividad.
- La separación de responsabilidades entre **evaluaciones**, **entregas** y **quizzes** garantiza trazabilidad granular del desempeño estudiantil.
- El uso de contenedores Docker con scripts de inicialización automática simplifica el despliegue y la reproducibilidad del entorno.
- El control de roles y el cifrado de documentos sensibles responden a los requisitos de seguridad y privacidad del contexto educativo.

---

## 11. Referencias

- Mermaid: Diagramas como código — https://mermaid.js.org
- Angular: Documentación oficial — https://angular.dev
- Express.js: Documentación oficial — https://expressjs.com
- PostgreSQL: Documentación oficial — https://www.postgresql.org/docs
- Dexie.js: IndexedDB simplificado — https://dexie.org
- Chart.js: Gráficos interactivos — https://www.chartjs.org

---

## Licencia

MIT © 2026 — Desarrollado para la **U.E.N. Cacique Tamanaco**

---

<p align="center">
  <sub>Built with Angular · Express · PostgreSQL · Docker</sub>
</p>
