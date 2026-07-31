-- ============================================================
-- Migration: Asistencia por sesiones diarias
-- ============================================================

-- 1. Tabla de sesiones de asistencia
CREATE TABLE IF NOT EXISTS sesiones_asistencia (
    id_sesion           SERIAL          NOT NULL,
    id_clase            INTEGER         NOT NULL,
    id_docente          INTEGER         NOT NULL,
    fecha               DATE            NOT NULL DEFAULT CURRENT_DATE,
    estado              VARCHAR(20)     NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    total_presentes     INTEGER         NOT NULL DEFAULT 0,
    total_ausentes      INTEGER         NOT NULL DEFAULT 0,
    total_justificados  INTEGER         NOT NULL DEFAULT 0,
    creado_en           TIMESTAMP       NOT NULL DEFAULT NOW(),
    cerrado_en          TIMESTAMP       NULL,
    CONSTRAINT pk_sesiones_asistencia PRIMARY KEY (id_sesion),
    CONSTRAINT fk_sesiones_asistencia_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase) ON DELETE CASCADE,
    CONSTRAINT fk_sesiones_asistencia_docente FOREIGN KEY (id_docente)
        REFERENCES usuarios (id_usuario),
    CONSTRAINT uq_sesion_asistencia_clase_fecha UNIQUE (id_clase, fecha)
);

-- 2. Añadir columnas a asistencias_alumnos
ALTER TABLE asistencias_alumnos
    ADD COLUMN IF NOT EXISTS id_sesion INTEGER,
    ADD COLUMN IF NOT EXISTS fecha_registro DATE DEFAULT CURRENT_DATE;

-- 3. Migrar datos existentes: crear una sesión por clase con asistencias
DO $$
DECLARE
    clase RECORD;
    id_docente_sesion INTEGER;
    id_sesion_nueva INTEGER;
BEGIN
    FOR clase IN
        SELECT DISTINCT aa.id_clase
        FROM asistencias_alumnos aa
        WHERE aa.id_sesion IS NULL
    LOOP
        -- Buscar el docente del curso de la clase
        SELECT c.id_docente INTO id_docente_sesion
        FROM clases cl
        JOIN cursos c ON c.id_curso = cl.id_curso
        WHERE cl.id_clase = clase.id_clase
        LIMIT 1;

        -- Fallback a 1 si no se encuentra
        IF id_docente_sesion IS NULL THEN
            id_docente_sesion := 1;
        END IF;

        -- Crear sesión para hoy
        INSERT INTO sesiones_asistencia (id_clase, id_docente, fecha, estado)
        VALUES (clase.id_clase, id_docente_sesion, CURRENT_DATE, 'cerrada')
        RETURNING id_sesion INTO id_sesion_nueva;

        -- Asociar registros existentes a la sesión
        UPDATE asistencias_alumnos
        SET id_sesion = id_sesion_nueva,
            fecha_registro = CURRENT_DATE
        WHERE id_clase = clase.id_clase
          AND id_sesion IS NULL;
    END LOOP;
END $$;

-- 4. Convertir id_sesion en NOT NULL
ALTER TABLE asistencias_alumnos
    ALTER COLUMN id_sesion SET NOT NULL;

-- 5. Añadir clave foránea de asistencias_alumnos a sesiones_asistencia
ALTER TABLE asistencias_alumnos
    ADD CONSTRAINT fk_asistencias_alumnos_sesion
        FOREIGN KEY (id_sesion) REFERENCES sesiones_asistencia(id_sesion) ON DELETE CASCADE;

-- 6. Eliminar constraint único antigua y crear nueva
ALTER TABLE asistencias_alumnos
    DROP CONSTRAINT IF EXISTS uq_asistencia_alumno_clase;

ALTER TABLE asistencias_alumnos
    ADD CONSTRAINT uq_asistencia_alumno_sesion UNIQUE (id_sesion, id_estudiante);
