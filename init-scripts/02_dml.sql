-- ============================================================
-- INIT SCRIPT 02 — DML: Usuario Administrador Inicial
-- Plataforma Educativa Móvil Cacique Tamanaco
-- Se ejecuta automáticamente al crear la BD por primera vez
--
-- Credenciales:
--   Email:    admin@admin.com
--   Password: admin
--   (hash bcrypt precomputado — listo para usar)
-- ============================================================

-- Solo insertar si no existe (idempotente)
INSERT INTO usuarios (
    nombre_completo, cedula, email, password, rol,
    tipo_discapacidad, foto_url, descripcion, edad, direccion, fecha_creacion
)
SELECT
    'Administrador del Sistema',
    'admin',
    'admin@admin.com',
    '$2b$10$SSZYCEllo8rvRHUM3P9MMu1YrThvaS2d5nYW8rWvxOS9w/Id4rnhK',
    'Administrador',
    'Ninguna',
    NULL,
    'Usuario administrador por defecto del sistema educativo',
    30,
    'Sede Principal, Dirección de Sistemas',
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE email = 'admin@admin.com'
);
