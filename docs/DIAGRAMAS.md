# Diagramas — Plataforma Educativa Cacique Tamanaco

Diagramas Mermaid generados a partir del esquema real de la base de datos
(`init-scripts/`) y de los componentes del frontend (`frontend/src/app/`).

---

## 1. Diagrama de la base de datos

> Esquema final: las tablas `tareas_curso` y `entregas_tarea` ya no existen
> (migración `08_migrar_tareas_a_evaluaciones.sql`).
>
> Para la **defensa de tesis** el DER se presenta en dos niveles de abstracción:
> un **mapa conceptual** de módulos funcionales (macro) y diagramas de **detalle**
> segmentados por subsistema. Las entidades están agrupadas jerárquicamente por
> módulo para que los generadores visuales (Mermaid Live Editor, Draw.io)
> desplieguen un diagrama limpio y ordenado.

### 1.1 Mapa conceptual de módulos (macro)

```mermaid
flowchart LR
    subgraph LMS["SISTEMA LMS / SGA"]
        direction LR
        M1["1. USUARIOS Y COMUNICACIÓN<br/>usuarios · documentos_personales<br/>asistencias_trabajadores · mensajes"]
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

### 1.2 Diagrama ER completo estructurado por subsistemas (detalle)

```mermaid
erDiagram

    %% ==========================================
    %% MÓDULO 1: USUARIOS Y COMUNICACIÓN
    %% ==========================================
    usuarios ||--o{ documentos_personales : "registra"
    usuarios ||--o{ mensajes : "envía (id_remitente)"
    usuarios ||--o{ mensajes : "recibe (id_destinatario)"
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
    progreso_material {
        serial id_progreso PK
        integer id_estudiante FK
        integer id_material FK
        varchar estado
        numeric nota
    }
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
    asistencias_trabajadores {
        serial id_asistencia_trabajador PK
        integer id_trabajador FK
        date fecha
        time hora_entrada
        time hora_salida
        varchar estado
    }
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
    documentos_personales {
        serial id_documento PK
        integer id_usuario FK
        varchar tipo_documento
        text numero_identificacion
        text archivo_url
        timestamptz fecha_subida
    }
    mensajes {
        serial id_mensaje PK
        integer id_remitente FK
        integer id_destinatario FK
        varchar asunto
        text cuerpo
        boolean leido
        timestamptz fecha_envio
    }
    exposicion_motivos {
        serial id_exposicion PK
        integer id_matricula FK
        text motivo
        boolean aprobado
    }
    calendarios {
        serial id_evento PK
        varchar titulo
        text descripcion
        timestamptz fecha_inicio
        varchar tipo_evento
    }
    constancias_estudio {
        serial id_constancia PK
        integer id_estudiante FK
        varchar codigo_verificacion UK
        text url_documento
    }
```

### 1.3 Sub-diagramas modulares para diapositivas

**A. Subsistema de Evaluaciones y Quizzes**

> **Objetivo:** explicar cómo el sistema gestiona tanto evaluaciones
> tradicionales como exámenes interactivos (quizzes).

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

> **Objetivo:** demostrar la trazabilidad del estudiante respecto a la
> asistencia a clases y el consumo de contenidos.

```mermaid
erDiagram
    usuarios ||--o{ asistencias_alumnos : "asiste"
    clases ||--o{ sesiones_asistencia : "programa"
    clases ||--o{ asistencias_alumnos : "registra"
    sesiones_asistencia ||--o{ asistencias_alumnos : "valida"

    materiales ||--o{ progreso_material : "mide"
    usuarios ||--o{ progreso_material : "avanza"
```

---

## 2. Diagrama de componentes + funciones

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

---

## 3. Solo componentes

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

## Notas

- El diagrama de BD refleja las **28 tablas finales** (sin `tareas_curso`/`entregas_tarea`),
  organizadas en **5 módulos funcionales** para la defensa de tesis.
- Recomendaciones visuales para la defensa: 🟦 azul = usuarios/perfiles,
  🟩 verde = módulo académico, 🟨 amarillo/naranja = evaluaciones y quizzes,
  💜 púrpura = asistencia y progreso.
- El editor canvas es el componente más pesado: delega toda su mutación al
  `course-editor-store.service.ts` (undo/redo y atomicidad).
- Los guards protegen rutas: `authGuard` para sesión, `roleGuard` para roles
  (admin siempre pasa).
