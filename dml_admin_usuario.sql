-- ============================================================
-- SCRIPT DML: INSERCIÓN DE USUARIO ADMINISTRADOR INICIAL
-- Base de Datos: cacique_tamanaco_db
-- Sistema: Plataforma Educativa Móvil Cacique Tamanaco
-- ============================================================

-- NOTA: La contraseña se inserta en texto plano ('admin') para
-- propósitos de prueba local. En producción, debe reemplazarse
-- por el hash bcrypt correspondiente. Ejemplo de hash generado
-- con pgcrypto:
-- SELECT crypt('admin', gen_salt('bf'));
-- ============================================================

INSERT INTO usuarios (
    nombre_completo,
    cedula,
    email,
    password,
    rol,
    tipo_discapacidad,
    foto_url,
    descripcion,
    edad,
    direccion,
    fecha_creacion
) VALUES (
    'Administrador del Sistema',            -- nombre_completo
    'admin',                                -- cedula (credencial de acceso primaria)
    'admin@admin.com',                      -- email
    'admin',                                -- password (texto plano; usar hash bcrypt en producción)
    'Administrador',                        -- rol
    'Ninguna',                              -- tipo_discapacidad
    NULL,                                   -- foto_url
    'Usuario administrador por defecto del sistema educativo', -- descripcion
    30,                                     -- edad
    'Sede Principal, Dirección de Sistemas', -- direccion
    CURRENT_TIMESTAMP                       -- fecha_creacion
);