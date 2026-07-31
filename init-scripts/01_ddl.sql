-- ============================================================
-- INIT SCRIPT 01 — DDL (Auto-ejecutable en PostgreSQL initdb)
-- Plataforma Educativa Móvil Cacique Tamanaco
-- Se ejecuta automáticamente al crear la BD por primera vez
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CREACIÓN DE TABLAS
-- ============================================================

-- usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario      SERIAL          NOT NULL,
    nombre_completo VARCHAR(255)    NOT NULL,
    cedula          VARCHAR(20)     NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    rol             VARCHAR(50)     NOT NULL,
    tipo_discapacidad VARCHAR(100),
    foto_url        VARCHAR(500),
    descripcion     VARCHAR(500),
    edad            INTEGER,
    direccion       VARCHAR(500),
    genero          VARCHAR(20) CHECK (genero IN ('masculino','femenino','otro')),
    fecha_creacion  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_cedula UNIQUE (cedula),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

-- cursos
CREATE TABLE IF NOT EXISTS cursos (
    id_curso    SERIAL                  NOT NULL,
    id_docente  INTEGER                 NOT NULL,
    nombre      VARCHAR(255)            NOT NULL,
    descripcion TEXT,
    creado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_cursos PRIMARY KEY (id_curso),
    CONSTRAINT fk_cursos_docente FOREIGN KEY (id_docente)
        REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- documentos_personales
CREATE TABLE IF NOT EXISTS documentos_personales (
    id_documento          SERIAL                      NOT NULL,
    id_usuario            INTEGER                     NOT NULL,
    tipo_documento        VARCHAR(100)                NOT NULL,
    numero_identificacion TEXT                        NOT NULL,
    archivo_url           TEXT,
    fecha_subida          TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_documentos_personales PRIMARY KEY (id_documento),
    CONSTRAINT fk_documentos_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─────────────────────────────────────────────────────────
-- RELACIÓN ESTUDIANTE-CURSO: Existen dos tablas con fines complementarios:
--
-- 1. `curso_estudiantes` — Tabla de relación directa (link table).
--    Propósito: Mapeo simple y rápido de qué estudiantes pertenecen
--    a qué cursos. Útil para joins ligeros y validaciones FK.
--    Sin campos extra de negocio.
--
-- 2. `matriculas` — Tabla de negocio con ciclo de vida completo.
--    Propósito: Registrar el proceso de matrícula con estado
--    (activo, inactivo, cancelada), fecha de inscripción y otros
--    metadatos administrativos.
--
-- Coexisten porque:
--   - `curso_estudiantes` → FK para integridad referencial en
--     entregas, asistencias, calificaciones (sin overhead de estado).
--   - `matriculas` → Lógica de negocio: estados, fechas, auditoría.
--
-- Futura consolidación: Se evaluará migrar a una sola tabla
-- `matriculas` que absorba la FK de `curso_estudiantes` y añada
-- un índice único en (id_curso, id_estudiante) con estado 'activo'.
-- ─────────────────────────────────────────────────────────

-- curso_estudiantes (link table — integridad referencial)
CREATE TABLE IF NOT EXISTS curso_estudiantes (
    id_curso        INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    inscrito_en     TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_curso_estudiantes PRIMARY KEY (id_curso, id_estudiante),
    CONSTRAINT fk_curso_estudiantes_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_curso_estudiantes_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- matriculas
CREATE TABLE IF NOT EXISTS matriculas (
    id_matricula        SERIAL                      NOT NULL,
    id_estudiante       INTEGER                     NOT NULL,
    id_curso            INTEGER                     NOT NULL,
    estado              VARCHAR(50)                 NOT NULL,
    fecha_inscripcion   TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_matriculas PRIMARY KEY (id_matricula),
    CONSTRAINT fk_matriculas_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matriculas_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso) ON DELETE CASCADE ON UPDATE CASCADE
);

-- clases
CREATE TABLE IF NOT EXISTS clases (
    id_clase            SERIAL                      NOT NULL,
    id_curso            INTEGER                     NOT NULL,
    titulo              VARCHAR(255)                NOT NULL,
    tipo_discapacidad   VARCHAR(100),
    fecha               TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    enlace_recurso      TEXT,
    CONSTRAINT pk_clases PRIMARY KEY (id_clase),
    CONSTRAINT fk_clases_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso) ON DELETE CASCADE ON UPDATE CASCADE
);

-- evaluaciones
CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion       SERIAL          NOT NULL,
    id_clase            INTEGER         NOT NULL,
    titulo_evaluacion   VARCHAR(255)    NOT NULL,
    porcentaje          NUMERIC(5,2)    NOT NULL,
    CONSTRAINT pk_evaluaciones PRIMARY KEY (id_evaluacion),
    CONSTRAINT fk_evaluaciones_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_evaluaciones_porcentaje CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

-- entregas_evaluacion
CREATE TABLE IF NOT EXISTS entregas_evaluacion (
    id_entrega      SERIAL                      NOT NULL,
    id_evaluacion   INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    formato_entrega VARCHAR(50)                 NOT NULL,
    contenido       TEXT,
    fecha_entrega   TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_entregas_evaluacion PRIMARY KEY (id_entrega),
    CONSTRAINT fk_entregas_evaluacion FOREIGN KEY (id_evaluacion)
        REFERENCES evaluaciones (id_evaluacion) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_entregas_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_entregas_evaluacion_estudiante
    ON entregas_evaluacion (id_evaluacion, id_estudiante);

-- calificaciones
CREATE TABLE IF NOT EXISTS calificaciones (
    id_calificacion     SERIAL                      NOT NULL,
    id_evaluacion       INTEGER                     NOT NULL,
    id_estudiante       INTEGER                     NOT NULL,
    nota_preliminar     NUMERIC(5,2),
    nota_definitiva     NUMERIC(5,2),
    observaciones       TEXT,
    fecha_registro      TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_calificaciones PRIMARY KEY (id_calificacion),
    CONSTRAINT fk_calificaciones_evaluacion FOREIGN KEY (id_evaluacion)
        REFERENCES evaluaciones (id_evaluacion) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_calificaciones_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_calificaciones_nota_preliminar CHECK (
        nota_preliminar IS NULL OR (nota_preliminar >= 0 AND nota_preliminar <= 20)),
    CONSTRAINT chk_calificaciones_nota_definitiva CHECK (
        nota_definitiva IS NULL OR (nota_definitiva >= 0 AND nota_definitiva <= 20)),
    CONSTRAINT uq_calificaciones_evaluacion_estudiante UNIQUE (id_evaluacion, id_estudiante)
);

-- materiales
CREATE TABLE IF NOT EXISTS materiales (
    id_material SERIAL          NOT NULL,
    id_curso    INTEGER         NOT NULL,
    titulo      VARCHAR(255)    NOT NULL,
    tipo        VARCHAR(50)     NOT NULL,
    contenido   TEXT,
    orden       INTEGER         NOT NULL DEFAULT 0,
    CONSTRAINT pk_materiales PRIMARY KEY (id_material),
    CONSTRAINT fk_materiales_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso) ON DELETE CASCADE ON UPDATE CASCADE
);

-- progreso_material
CREATE TABLE IF NOT EXISTS progreso_material (
    id_progreso     SERIAL          NOT NULL,
    id_estudiante   INTEGER         NOT NULL,
    id_material     INTEGER         NOT NULL,
    estado          VARCHAR(50)     NOT NULL,
    nota            NUMERIC(5,2),
    CONSTRAINT pk_progreso_material PRIMARY KEY (id_progreso),
    CONSTRAINT fk_progreso_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_progreso_material FOREIGN KEY (id_material)
        REFERENCES materiales (id_material) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_progreso_estudiante_material UNIQUE (id_estudiante, id_material)
);

-- asistencias_alumnos
CREATE TABLE IF NOT EXISTS asistencias_alumnos (
    id_asistencia   SERIAL                      NOT NULL,
    id_clase        INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    estado          VARCHAR(50)                 NOT NULL,
    CONSTRAINT pk_asistencias_alumnos PRIMARY KEY (id_asistencia),
    CONSTRAINT fk_asistencias_alumnos_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_asistencias_alumnos_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_asistencia_alumno_clase UNIQUE (id_clase, id_estudiante)
);

-- asistencias_trabajadores
CREATE TABLE IF NOT EXISTS asistencias_trabajadores (
    id_asistencia_trabajador    SERIAL      NOT NULL,
    id_trabajador               INTEGER     NOT NULL,
    fecha                       DATE        NOT NULL,
    hora_entrada                TIME        NOT NULL,
    hora_salida                 TIME,
    estado                      VARCHAR(50) NOT NULL,
    CONSTRAINT pk_asistencias_trabajadores PRIMARY KEY (id_asistencia_trabajador),
    CONSTRAINT fk_asistencias_trabajador FOREIGN KEY (id_trabajador)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_asistencia_trabajador_fecha UNIQUE (id_trabajador, fecha)
);

-- mensajes
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensaje      SERIAL                      NOT NULL,
    id_remitente    INTEGER                     NOT NULL,
    id_destinatario INTEGER                     NOT NULL,
    asunto          VARCHAR(255)                NOT NULL,
    cuerpo          TEXT,
    leido           BOOLEAN                     NOT NULL DEFAULT FALSE,
    fecha_envio     TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_mensajes PRIMARY KEY (id_mensaje),
    CONSTRAINT fk_mensajes_remitente FOREIGN KEY (id_remitente)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mensajes_destinatario FOREIGN KEY (id_destinatario)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- exposicion_motivos
CREATE TABLE IF NOT EXISTS exposicion_motivos (
    id_exposicion   SERIAL      NOT NULL,
    id_matricula    INTEGER     NOT NULL,
    motivo          TEXT        NOT NULL,
    aprobado        BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_exposicion_motivos PRIMARY KEY (id_exposicion),
    CONSTRAINT fk_exposicion_motivos_matricula FOREIGN KEY (id_matricula)
        REFERENCES matriculas (id_matricula) ON DELETE CASCADE ON UPDATE CASCADE
);

-- calendarios
CREATE TABLE IF NOT EXISTS calendarios (
    id_evento       SERIAL                      NOT NULL,
    titulo          VARCHAR(255)                NOT NULL,
    descripcion     TEXT,
    fecha_inicio    TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    tipo_evento     VARCHAR(50)                 NOT NULL DEFAULT 'evento',
    CONSTRAINT pk_calendarios PRIMARY KEY (id_evento)
);

-- constancias_estudio
CREATE TABLE IF NOT EXISTS constancias_estudio (
    id_constancia           SERIAL          NOT NULL,
    id_estudiante           INTEGER         NOT NULL,
    codigo_verificacion     VARCHAR(100)    NOT NULL,
    url_documento           TEXT,
    CONSTRAINT pk_constancias_estudio PRIMARY KEY (id_constancia),
    CONSTRAINT fk_constancias_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_constancias_codigo UNIQUE (codigo_verificacion)
);

-- ============================================================
-- ÍNDICES ADICIONALES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_discapacidad ON usuarios (tipo_discapacidad);
CREATE INDEX IF NOT EXISTS idx_cursos_docente ON cursos (id_docente);
CREATE INDEX IF NOT EXISTS idx_documentos_usuario ON documentos_personales (id_usuario);
CREATE INDEX IF NOT EXISTS idx_matriculas_estudiante ON matriculas (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_matriculas_curso ON matriculas (id_curso);
CREATE INDEX IF NOT EXISTS idx_clases_curso ON clases (id_curso);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_clase ON evaluaciones (id_clase);
CREATE INDEX IF NOT EXISTS idx_entregas_estudiante ON entregas_evaluacion (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_calificaciones_estudiante ON calificaciones (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes (id_remitente);
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario ON mensajes (id_destinatario);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes (leido) WHERE leido = FALSE;
CREATE INDEX IF NOT EXISTS idx_constancias_estudiante ON constancias_estudio (id_estudiante);
