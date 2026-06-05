-- ============================================================
-- MIGRACIÓN 04 — Módulo de Quizzes Interactivos
-- Plataforma Educativa Móvil Cacique Tamanaco
-- Fecha: 2026-06-02
-- ============================================================

-- 1. Tabla de quizzes (un quiz por evaluación)
CREATE TABLE IF NOT EXISTS quizzes (
    id_quiz             SERIAL          NOT NULL,
    id_evaluacion       INTEGER         NOT NULL,
    titulo              VARCHAR(255)    NOT NULL,
    descripcion         TEXT,
    tiempo_limite_min   INTEGER,                  -- NULL = sin límite
    activo              BOOLEAN         NOT NULL DEFAULT true,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_quizzes PRIMARY KEY (id_quiz),
    CONSTRAINT fk_quiz_evaluacion FOREIGN KEY (id_evaluacion)
        REFERENCES evaluaciones (id_evaluacion)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 2. Preguntas del quiz
CREATE TABLE IF NOT EXISTS quiz_preguntas (
    id_pregunta         SERIAL          NOT NULL,
    id_quiz             INTEGER         NOT NULL,
    enunciado           TEXT            NOT NULL,
    tipo                VARCHAR(20)     NOT NULL DEFAULT 'opcion_multiple',
    orden               INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_quiz_preguntas PRIMARY KEY (id_pregunta),
    CONSTRAINT fk_pregunta_quiz FOREIGN KEY (id_quiz)
        REFERENCES quizzes (id_quiz)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_pregunta_tipo CHECK (tipo IN ('opcion_multiple', 'verdadero_falso'))
);

-- 3. Opciones de respuesta por pregunta
CREATE TABLE IF NOT EXISTS quiz_opciones (
    id_opcion           SERIAL          NOT NULL,
    id_pregunta         INTEGER         NOT NULL,
    texto               TEXT            NOT NULL,
    es_correcta         BOOLEAN         NOT NULL DEFAULT false,
    orden               CHAR(1)         NOT NULL,   -- 'A','B','C','D'

    CONSTRAINT pk_quiz_opciones PRIMARY KEY (id_opcion),
    CONSTRAINT fk_opcion_pregunta FOREIGN KEY (id_pregunta)
        REFERENCES quiz_preguntas (id_pregunta)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_opcion_orden CHECK (orden IN ('A','B','C','D')),
    CONSTRAINT uq_opcion_pregunta_orden UNIQUE (id_pregunta, orden)
);

-- 4. Intentos de estudiantes
CREATE TABLE IF NOT EXISTS quiz_intentos (
    id_intento          SERIAL          NOT NULL,
    id_quiz             INTEGER         NOT NULL,
    id_estudiante       INTEGER         NOT NULL,
    nota                NUMERIC(5,2),             -- 0-100, calculada al finalizar
    total_preguntas     INTEGER         NOT NULL DEFAULT 0,
    acertadas           INTEGER         NOT NULL DEFAULT 0,
    finalizado          BOOLEAN         NOT NULL DEFAULT false,
    iniciado_en         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    finalizado_en       TIMESTAMPTZ,

    CONSTRAINT pk_quiz_intentos PRIMARY KEY (id_intento),
    CONSTRAINT fk_intento_quiz FOREIGN KEY (id_quiz)
        REFERENCES quizzes (id_quiz)
        ON DELETE CASCADE,
    CONSTRAINT fk_intento_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario)
        ON DELETE CASCADE,
    CONSTRAINT uq_intento_quiz_estudiante UNIQUE (id_quiz, id_estudiante)
);

-- 5. Respuestas del estudiante por pregunta
CREATE TABLE IF NOT EXISTS quiz_respuestas (
    id_respuesta        SERIAL          NOT NULL,
    id_intento          INTEGER         NOT NULL,
    id_pregunta         INTEGER         NOT NULL,
    id_opcion           INTEGER,                  -- NULL si no respondió
    es_correcta         BOOLEAN,

    CONSTRAINT pk_quiz_respuestas PRIMARY KEY (id_respuesta),
    CONSTRAINT fk_respuesta_intento FOREIGN KEY (id_intento)
        REFERENCES quiz_intentos (id_intento)
        ON DELETE CASCADE,
    CONSTRAINT fk_respuesta_pregunta FOREIGN KEY (id_pregunta)
        REFERENCES quiz_preguntas (id_pregunta)
        ON DELETE CASCADE,
    CONSTRAINT uq_respuesta_intento_pregunta UNIQUE (id_intento, id_pregunta)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quiz_evaluacion ON quizzes (id_evaluacion);
CREATE INDEX IF NOT EXISTS idx_preguntas_quiz ON quiz_preguntas (id_quiz, orden);
CREATE INDEX IF NOT EXISTS idx_opciones_pregunta ON quiz_opciones (id_pregunta, orden);
CREATE INDEX IF NOT EXISTS idx_intentos_quiz ON quiz_intentos (id_quiz);
CREATE INDEX IF NOT EXISTS idx_intentos_estudiante ON quiz_intentos (id_estudiante);
