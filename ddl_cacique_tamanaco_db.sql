-- ============================================================
-- SCRIPT DDL INICIAL
-- Base de Datos: cacique_tamanaco_db
-- Sistema: Plataforma Educativa Móvil Cacique Tamanaco
-- Paradigma: Offline-First
-- Motor: PostgreSQL 16
-- ============================================================

-- ============================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- ============================================================
-- NOTA: La sentencia CREATE DATABASE debe ejecutarse fuera de
-- una transacción, conectado a otra base (por ejemplo, postgres).
-- ============================================================

DROP DATABASE IF EXISTS cacique_tamanaco_db;

CREATE DATABASE cacique_tamanaco_db
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_VE.UTF-8'
    LC_CTYPE = 'es_VE.UTF-8'
    TEMPLATE = template0
    OWNER = postgres;

-- Conectarse a la base de datos recién creada
\c cacique_tamanaco_db;

-- ============================================================
-- 2. EXTENSIONES NECESARIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Para funciones criptográficas (gen_random_uuid, etc.)

-- ============================================================
-- 3. CREACIÓN DE TABLAS
-- ============================================================

-- 3.1. usuarios
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
    fecha_creacion  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_cedula UNIQUE (cedula),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

-- 3.2. cursos
CREATE TABLE IF NOT EXISTS cursos (
    id_curso    SERIAL                  NOT NULL,
    id_docente  INTEGER                 NOT NULL,
    nombre      VARCHAR(255)            NOT NULL,
    descripcion TEXT,
    creado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_cursos PRIMARY KEY (id_curso),
    CONSTRAINT fk_cursos_docente FOREIGN KEY (id_docente)
        REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- 3.3. documentos_personales
CREATE TABLE IF NOT EXISTS documentos_personales (
    id_documento          SERIAL                      NOT NULL,
    id_usuario            INTEGER                     NOT NULL,
    tipo_documento        VARCHAR(100)                NOT NULL,
    numero_identificacion TEXT                        NOT NULL,   -- Almacenará data cifrada con AES-256
    archivo_url           TEXT,
    fecha_subida          TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_documentos_personales PRIMARY KEY (id_documento),
    CONSTRAINT fk_documentos_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.4. curso_estudiantes (tabla pivote)
CREATE TABLE IF NOT EXISTS curso_estudiantes (
    id_curso        INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    inscrito_en     TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_curso_estudiantes PRIMARY KEY (id_curso, id_estudiante),
    CONSTRAINT fk_curso_estudiantes_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_curso_estudiantes_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.5. matriculas
CREATE TABLE IF NOT EXISTS matriculas (
    id_matricula        SERIAL                      NOT NULL,
    id_estudiante       INTEGER                     NOT NULL,
    id_curso            INTEGER                     NOT NULL,
    estado              VARCHAR(50)                 NOT NULL,
    fecha_inscripcion   TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_matriculas PRIMARY KEY (id_matricula),
    CONSTRAINT fk_matriculas_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_matriculas_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.6. clases
CREATE TABLE IF NOT EXISTS clases (
    id_clase            SERIAL                      NOT NULL,
    id_curso            INTEGER                     NOT NULL,
    titulo              VARCHAR(255)                NOT NULL,
    tipo_discapacidad   VARCHAR(100),
    fecha               TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    enlace_recurso      TEXT,

    CONSTRAINT pk_clases PRIMARY KEY (id_clase),
    CONSTRAINT fk_clases_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.7. evaluaciones
CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion       SERIAL          NOT NULL,
    id_clase            INTEGER         NOT NULL,
    titulo_evaluacion   VARCHAR(255)    NOT NULL,
    porcentaje          NUMERIC(5,2)    NOT NULL,

    CONSTRAINT pk_evaluaciones PRIMARY KEY (id_evaluacion),
    CONSTRAINT fk_evaluaciones_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_evaluaciones_porcentaje CHECK (
        porcentaje >= 0 AND porcentaje <= 100
    )
);

-- 3.8. entregas_evaluacion
CREATE TABLE IF NOT EXISTS entregas_evaluacion (
    id_entrega      SERIAL                      NOT NULL,
    id_evaluacion   INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    formato_entrega VARCHAR(50)                 NOT NULL,
    contenido       TEXT,
    fecha_entrega   TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_entregas_evaluacion PRIMARY KEY (id_entrega),
    CONSTRAINT fk_entregas_evaluacion FOREIGN KEY (id_evaluacion)
        REFERENCES evaluaciones (id_evaluacion)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_entregas_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Índice único parcial para soportar UPSERT:
-- Evita entregas duplicadas del mismo estudiante en la misma evaluación.
CREATE UNIQUE INDEX IF NOT EXISTS uq_entregas_evaluacion_estudiante
    ON entregas_evaluacion (id_evaluacion, id_estudiante);

-- 3.9. calificaciones
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
        REFERENCES evaluaciones (id_evaluacion)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_calificaciones_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_calificaciones_nota_preliminar CHECK (
        nota_preliminar IS NULL OR (nota_preliminar >= 0 AND nota_preliminar <= 20)
    ),
    CONSTRAINT chk_calificaciones_nota_definitiva CHECK (
        nota_definitiva IS NULL OR (nota_definitiva >= 0 AND nota_definitiva <= 20)
    ),
    CONSTRAINT uq_calificaciones_evaluacion_estudiante UNIQUE (id_evaluacion, id_estudiante)
);

-- 3.10. materiales
CREATE TABLE IF NOT EXISTS materiales (
    id_material SERIAL          NOT NULL,
    id_curso    INTEGER         NOT NULL,
    titulo      VARCHAR(255)    NOT NULL,
    tipo        VARCHAR(50)     NOT NULL,
    contenido   TEXT,
    orden       INTEGER         NOT NULL DEFAULT 0,

    CONSTRAINT pk_materiales PRIMARY KEY (id_material),
    CONSTRAINT fk_materiales_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.11. progreso_material
CREATE TABLE IF NOT EXISTS progreso_material (
    id_progreso     SERIAL          NOT NULL,
    id_estudiante   INTEGER         NOT NULL,
    id_material     INTEGER         NOT NULL,
    estado          VARCHAR(50)     NOT NULL,
    nota            NUMERIC(5,2),

    CONSTRAINT pk_progreso_material PRIMARY KEY (id_progreso),
    CONSTRAINT fk_progreso_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_progreso_material FOREIGN KEY (id_material)
        REFERENCES materiales (id_material)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_progreso_estudiante_material UNIQUE (id_estudiante, id_material)
);

-- 3.12. asistencias_alumnos
CREATE TABLE IF NOT EXISTS asistencias_alumnos (
    id_asistencia   SERIAL                      NOT NULL,
    id_clase        INTEGER                     NOT NULL,
    id_estudiante   INTEGER                     NOT NULL,
    estado          VARCHAR(50)                 NOT NULL,

    CONSTRAINT pk_asistencias_alumnos PRIMARY KEY (id_asistencia),
    CONSTRAINT fk_asistencias_alumnos_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_asistencias_alumnos_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_asistencia_alumno_clase UNIQUE (id_clase, id_estudiante)
);

-- 3.13. asistencias_trabajadores
CREATE TABLE IF NOT EXISTS asistencias_trabajadores (
    id_asistencia_trabajador    SERIAL      NOT NULL,
    id_trabajador               INTEGER     NOT NULL,
    fecha                       DATE        NOT NULL,
    hora_entrada                TIME        NOT NULL,
    hora_salida                 TIME,
    estado                      VARCHAR(50) NOT NULL,

    CONSTRAINT pk_asistencias_trabajadores PRIMARY KEY (id_asistencia_trabajador),
    CONSTRAINT fk_asistencias_trabajador FOREIGN KEY (id_trabajador)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_asistencia_trabajador_fecha UNIQUE (id_trabajador, fecha)
);

-- 3.14. mensajes
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
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_mensajes_destinatario FOREIGN KEY (id_destinatario)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.15. exposicion_motivos
CREATE TABLE IF NOT EXISTS exposicion_motivos (
    id_exposicion   SERIAL      NOT NULL,
    id_matricula    INTEGER     NOT NULL,
    motivo          TEXT        NOT NULL,
    aprobado        BOOLEAN     NOT NULL DEFAULT FALSE,

    CONSTRAINT pk_exposicion_motivos PRIMARY KEY (id_exposicion),
    CONSTRAINT fk_exposicion_motivos_matricula FOREIGN KEY (id_matricula)
        REFERENCES matriculas (id_matricula)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3.16. calendarios
CREATE TABLE IF NOT EXISTS calendarios (
    id_evento       SERIAL                      NOT NULL,
    titulo          VARCHAR(255)                NOT NULL,
    descripcion     TEXT,
    fecha_inicio    TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
    tipo_evento     VARCHAR(50)                 NOT NULL DEFAULT 'evento',

    CONSTRAINT pk_calendarios PRIMARY KEY (id_evento)
);

-- NOTA: Se corrigió el tipo del campo tipo_evento (era TIMESTAMP en la especificación,
-- pero por semántica debe ser VARCHAR para describir el tipo de evento,
-- como "feriado", "examen", "reunión", etc.)

-- 3.17. constancias_estudio
CREATE TABLE IF NOT EXISTS constancias_estudio (
    id_constancia           SERIAL          NOT NULL,
    id_estudiante           INTEGER         NOT NULL,
    codigo_verificacion     VARCHAR(100)    NOT NULL,
    url_documento           TEXT,

    CONSTRAINT pk_constancias_estudio PRIMARY KEY (id_constancia),
    CONSTRAINT fk_constancias_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_constancias_codigo UNIQUE (codigo_verificacion)
);

-- ============================================================
-- 4. ÍNDICES ADICIONALES (Optimización de consultas)
-- ============================================================

-- Índices para búsquedas por rol y tipo de discapacidad en usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_discapacidad ON usuarios (tipo_discapacidad);

-- Índice para búsqueda de cursos por docente
CREATE INDEX IF NOT EXISTS idx_cursos_docente ON cursos (id_docente);

-- Índice para búsqueda de documentos por usuario
CREATE INDEX IF NOT EXISTS idx_documentos_usuario ON documentos_personales (id_usuario);

-- Índice para búsqueda de matrículas por estudiante y curso
CREATE INDEX IF NOT EXISTS idx_matriculas_estudiante ON matriculas (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_matriculas_curso ON matriculas (id_curso);

-- Índice para búsqueda de clases por curso
CREATE INDEX IF NOT EXISTS idx_clases_curso ON clases (id_curso);

-- Índice para búsqueda de evaluaciones por clase
CREATE INDEX IF NOT EXISTS idx_evaluaciones_clase ON evaluaciones (id_clase);

-- Índice para búsqueda de entregas por estudiante
CREATE INDEX IF NOT EXISTS idx_entregas_estudiante ON entregas_evaluacion (id_estudiante);

-- Índice para búsqueda de calificaciones por estudiante
CREATE INDEX IF NOT EXISTS idx_calificaciones_estudiante ON calificaciones (id_estudiante);

-- Índice para búsqueda de mensajes por remitente/destinatario
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes (id_remitente);
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario ON mensajes (id_destinatario);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes (leido) WHERE leido = FALSE;

-- Índice para búsqueda de constancias por estudiante
CREATE INDEX IF NOT EXISTS idx_constancias_estudiante ON constancias_estudio (id_estudiante);

-- ============================================================
-- 5. COMENTARIOS DE TABLAS (Documentación del esquema)
-- ============================================================

COMMENT ON DATABASE cacique_tamanaco_db IS 'Base de datos principal de la Plataforma Educativa Móvil Cacique Tamanaco - Paradigma Offline-First';

COMMENT ON TABLE usuarios IS 'Almacena todos los usuarios del sistema: estudiantes, docentes, trabajadores y administradores';
COMMENT ON COLUMN usuarios.password IS 'Hash de la contraseña (almacenar con pgcrypto o bcrypt a nivel de aplicación)';
COMMENT ON COLUMN usuarios.tipo_discapacidad IS 'Tipo de discapacidad del usuario (NULL si no aplica)';

COMMENT ON TABLE cursos IS 'Cursos académicos ofrecidos en la plataforma';
COMMENT ON COLUMN cursos.id_docente IS 'Docente responsable del curso (FK -> usuarios con rol docente)';

COMMENT ON TABLE documentos_personales IS 'Documentos de identidad y otros documentos personales cifrados con AES-256';
COMMENT ON COLUMN documentos_personales.numero_identificacion IS 'Dato sensible almacenado cifrado con AES-256 (cifrado vía pgcrypto o a nivel de aplicación)';

COMMENT ON TABLE curso_estudiantes IS 'Tabla pivote que relaciona estudiantes con los cursos en los que están inscritos';

COMMENT ON TABLE matriculas IS 'Registro formal de matrícula de un estudiante en un curso';

COMMENT ON TABLE clases IS 'Clases o sesiones asociadas a un curso';

COMMENT ON TABLE evaluaciones IS 'Evaluaciones asociadas a una clase, con su respectivo porcentaje de ponderación';

COMMENT ON TABLE entregas_evaluacion IS 'Entregas realizadas por los estudiantes para una evaluación. Preparada para operaciones UPSERT vía índice único parcial';
COMMENT ON COLUMN entregas_evaluacion.contenido IS 'Contenido textual de la entrega (puede ser un texto, JSON, o referencia a un archivo)';

COMMENT ON TABLE calificaciones IS 'Calificaciones de los estudiantes en las evaluaciones, con nota preliminar y definitiva';

COMMENT ON TABLE materiales IS 'Materiales educativos asociados a un curso (videos, documentos, enlaces, etc.)';

COMMENT ON TABLE progreso_material IS 'Progreso individual de cada estudiante en los materiales del curso';

COMMENT ON TABLE asistencias_alumnos IS 'Registro de asistencia de alumnos a las clases';

COMMENT ON TABLE asistencias_trabajadores IS 'Registro de asistencia del personal trabajador (docentes, administrativos)';

COMMENT ON TABLE mensajes IS 'Mensajería interna entre usuarios de la plataforma';

COMMENT ON TABLE exposicion_motivos IS 'Exposición de motivos o solicitudes asociadas a una matrícula';

COMMENT ON TABLE calendarios IS 'Eventos del calendario académico (feriados, exámenes, reuniones, etc.)';

COMMENT ON TABLE constancias_estudio IS 'Constancias de estudio generadas con código único de verificación';

-- ============================================================
-- FIN DEL SCRIPT DDL
-- ============================================================