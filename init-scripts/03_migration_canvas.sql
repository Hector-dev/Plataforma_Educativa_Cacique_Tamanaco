-- ============================================================
-- MIGRACIÓN 03 — Editor Visual de Cursos (Canvas)
-- Plataforma Educativa Móvil Cacique Tamanaco
-- Fecha: 2026-06-01
-- Descripción: Agrega tablas y columnas para el editor
--              drag-and-drop tipo Canvas.
-- ============================================================

-- ============================================================
-- 1. NUEVA TABLA: modulos (agrupación de clases)
-- ============================================================
CREATE TABLE IF NOT EXISTS modulos (
    id_modulo   SERIAL          NOT NULL,
    id_curso    INTEGER         NOT NULL,
    titulo      VARCHAR(255)    NOT NULL,
    descripcion TEXT,
    orden       NUMERIC(10,4)   NOT NULL DEFAULT 1.0,

    CONSTRAINT pk_modulos PRIMARY KEY (id_modulo),
    CONSTRAINT fk_modulos_curso FOREIGN KEY (id_curso)
        REFERENCES cursos (id_curso)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modulos_curso_orden
    ON modulos (id_curso, orden);

-- ============================================================
-- 2. NUEVAS COLUMNAS EN clases
-- ============================================================
ALTER TABLE clases
    ADD COLUMN IF NOT EXISTS id_modulo       INTEGER
        REFERENCES modulos (id_modulo)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    ADD COLUMN IF NOT EXISTS orden           NUMERIC(10,4) NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS descripcion     TEXT,
    ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER;

CREATE INDEX IF NOT EXISTS idx_clases_modulo_orden
    ON clases (id_modulo, orden);

CREATE INDEX IF NOT EXISTS idx_clases_curso_orden
    ON clases (id_curso, orden);

-- ============================================================
-- 3. NUEVA COLUMNA version EN cursos (control de concurrencia)
-- ============================================================
ALTER TABLE cursos
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- ============================================================
-- 4. NUEVA COLUMNA orden EN evaluaciones
-- ============================================================
ALTER TABLE evaluaciones
    ADD COLUMN IF NOT EXISTS orden       NUMERIC(10,4) NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_clase_orden
    ON evaluaciones (id_clase, orden);

-- ============================================================
-- 5. NUEVA TABLA: tareas_curso (tareas anidadas en clases)
-- ============================================================
CREATE TABLE IF NOT EXISTS tareas_curso (
    id_tarea_curso      SERIAL          NOT NULL,
    id_clase            INTEGER         NOT NULL,
    titulo              VARCHAR(255)    NOT NULL,
    descripcion         TEXT,
    formatos_permitidos TEXT[]          NOT NULL DEFAULT ARRAY['PDF'],
    fecha_limite        DATE,
    orden               NUMERIC(10,4)   NOT NULL DEFAULT 1.0,

    CONSTRAINT pk_tareas_curso PRIMARY KEY (id_tarea_curso),
    CONSTRAINT fk_tareas_curso_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tareas_curso_clase_orden
    ON tareas_curso (id_clase, orden);

-- ============================================================
-- 6. NUEVA TABLA: materiales_curso (materiales anidados en clases)
--    Complementa la tabla 'materiales' existente agregando
--    vinculación directa a clase en lugar de solo a curso.
-- ============================================================
CREATE TABLE IF NOT EXISTS materiales_curso (
    id_material_curso   SERIAL          NOT NULL,
    id_clase            INTEGER         NOT NULL,
    titulo              VARCHAR(255)    NOT NULL,
    descripcion         TEXT,
    url_recurso         TEXT,
    tipo_recurso        VARCHAR(50)     NOT NULL DEFAULT 'documento',
    orden               NUMERIC(10,4)   NOT NULL DEFAULT 1.0,

    CONSTRAINT pk_materiales_curso PRIMARY KEY (id_material_curso),
    CONSTRAINT fk_materiales_curso_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_materiales_curso_tipo CHECK (
        tipo_recurso IN ('video', 'documento', 'enlace', 'imagen')
    )
);

CREATE INDEX IF NOT EXISTS idx_materiales_curso_clase_orden
    ON materiales_curso (id_clase, orden);

-- ============================================================
-- 7. ÍNDICES DE SOPORTE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clases_sin_modulo
    ON clases (id_curso, orden) WHERE id_modulo IS NULL;
