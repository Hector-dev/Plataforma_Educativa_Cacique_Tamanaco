-- ============================================================
-- 07_entregas_tarea.sql
-- Entregas de tareas_curso (tareas anidadas en clases)
-- ============================================================

CREATE TABLE IF NOT EXISTS entregas_tarea (
    id_entrega_tarea    SERIAL                      NOT NULL,
    id_tarea_curso      INTEGER                     NOT NULL,
    id_estudiante       INTEGER                     NOT NULL,
    formato_entrega     VARCHAR(50)                 NOT NULL,
    contenido           TEXT,
    fecha_entrega       TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_entregas_tarea PRIMARY KEY (id_entrega_tarea),
    CONSTRAINT fk_entregas_tarea_tarea FOREIGN KEY (id_tarea_curso)
        REFERENCES tareas_curso (id_tarea_curso) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_entregas_tarea_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_entregas_tarea_formato CHECK (
        formato_entrega IN ('PDF', 'WORD', 'URL')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entregas_tarea_estudiante
    ON entregas_tarea (id_tarea_curso, id_estudiante);

CREATE INDEX IF NOT EXISTS idx_entregas_tarea_estudiante
    ON entregas_tarea (id_estudiante);
