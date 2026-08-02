-- ============================================================
-- 08_migrar_tareas_a_evaluaciones.sql
-- Elimina el tipo "tarea": convierte tareas_curso en evaluaciones
-- y migra sus entregas a entregas_evaluacion. Luego elimina
-- las tablas de tareas.
-- ============================================================

-- 1. Columna temporal para mapear tarea_curso -> evaluacion
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS id_tarea_curso_orig INTEGER;

-- 2. Migrar tareas_curso a evaluaciones
INSERT INTO evaluaciones (id_clase, titulo_evaluacion, porcentaje, descripcion, orden, id_tarea_curso_orig)
SELECT
    id_clase,
    titulo,
    0,
    COALESCE(descripcion, ''),
    orden,
    id_tarea_curso
FROM tareas_curso;

-- 3. Migrar entregas_tarea a entregas_evaluacion
INSERT INTO entregas_evaluacion (id_evaluacion, id_estudiante, formato_entrega, contenido, fecha_entrega)
SELECT
    ev.id_evaluacion,
    et.id_estudiante,
    et.formato_entrega,
    et.contenido,
    et.fecha_entrega
FROM entregas_tarea et
JOIN evaluaciones ev ON ev.id_tarea_curso_orig = et.id_tarea_curso;

-- 4. Eliminar columna temporal y tablas de tareas
ALTER TABLE evaluaciones DROP COLUMN IF EXISTS id_tarea_curso_orig;

DROP TABLE IF EXISTS entregas_tarea;
DROP TABLE IF EXISTS tareas_curso;
