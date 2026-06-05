-- ============================================================
-- INIT SCRIPT 03 — SEED E2E
-- Curso, clases y evaluaciones de demostración
-- Idempotente: no duplica datos si ya existen
-- ============================================================

-- Docente de demostración (el admin existente, id=1)
-- Curso E2E Test (id predecible para tests)
INSERT INTO cursos (id_docente, nombre, descripcion)
SELECT 1, 'Curso E2E Test', 'Curso de prueba para tests automatizados E2E'
WHERE NOT EXISTS (
    SELECT 1 FROM cursos WHERE nombre = 'Curso E2E Test'
);

-- Clase dentro del curso
INSERT INTO clases (id_curso, titulo, descripcion, fecha)
SELECT c.id_curso, 'Clase 1 — Introducción', 'Primera clase del curso E2E', CURRENT_DATE
FROM cursos c
WHERE c.nombre = 'Curso E2E Test'
  AND NOT EXISTS (
    SELECT 1 FROM clases cl WHERE cl.id_curso = c.id_curso AND cl.titulo = 'Clase 1 — Introducción'
  );

-- Evaluación dentro de la clase
INSERT INTO evaluaciones (id_clase, titulo_evaluacion, porcentaje)
SELECT cl.id_clase, 'Tarea E2E 01', 25
FROM clases cl
JOIN cursos c ON c.id_curso = cl.id_curso
WHERE c.nombre = 'Curso E2E Test'
  AND cl.titulo = 'Clase 1 — Introducción'
  AND NOT EXISTS (
    SELECT 1 FROM evaluaciones e WHERE e.id_clase = cl.id_clase AND e.titulo_evaluacion = 'Tarea E2E 01'
  );
