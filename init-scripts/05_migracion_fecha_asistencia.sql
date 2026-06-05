-- ============================================================
-- Migration: Agregar columna fecha_registro a asistencias_alumnos
-- ============================================================

ALTER TABLE asistencias_alumnos
    ADD COLUMN IF NOT EXISTS fecha_registro DATE DEFAULT CURRENT_DATE;
