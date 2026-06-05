/**
 * Script de Inicialización (Seed) — Usuario Administrador por Defecto
 * Plataforma Educativa Móvil Cacique Tamanaco
 *
 * Este script verifica si existe un administrador en la base de datos.
 * Si no existe, crea uno con credenciales por defecto (admin / admin)
 * usando bcrypt para el hash de la contraseña.
 *
 * Ejecución:
 *   npx ts-node scripts/seedAdmin.ts
 *
 * Seguridad:
 *   - La contraseña por defecto se toma de la variable de entorno
 *     ADMIN_DEFAULT_PASSWORD (valor por defecto: "admin")
 *   - Se recomienda al administrador cambiar la contraseña tras el
 *     primer inicio de sesión mediante el endpoint PUT /api/usuarios/:id
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// ============================================================
// Configuración del pool de conexión
// ============================================================

const pool = new Pool({
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: parseInt(
        process.env.DB_PORT || process.env.DATABASE_PORT || '5432',
        10
    ),
    database:
        process.env.DB_NAME || process.env.DATABASE_NAME || 'cacique_tamanaco_db',
    user: process.env.DB_USER || process.env.DATABASE_USER || 'postgres',
    password:
        process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres',
});

// ============================================================
// Datos del administrador por defecto
// ============================================================

const ADMIN_USERNAME = 'admin';
const ADMIN_CEDULA = 'admin';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_NOMBRE = 'Administrador del Sistema';
const ADMIN_ROL = 'admin';
const ADMIN_DESC = 'Usuario administrador por defecto del sistema educativo';
const ADMIN_DIRECCION = 'Sede Principal, Dirección de Sistemas';

// ============================================================
// Función principal
// ============================================================

async function seedAdmin(): Promise<void> {
    const client = await pool.connect();

    try {
        console.log('[SeedAdmin] Conectando a la base de datos...');
        console.log(
            `[SeedAdmin] Host: ${pool.options.host}:${pool.options.port}, DB: ${pool.options.database}`
        );

        // --------------------------------------------------
        // Verificar si ya existe un usuario con rol admin
        // --------------------------------------------------
        const checkResult = await client.query(
            `SELECT id_usuario, nombre_completo, email, activo
             FROM usuarios
             WHERE rol = 'admin'
             LIMIT 1`
        );

        if (checkResult.rows.length > 0) {
            const existing = checkResult.rows[0];
            console.log(
                `[SeedAdmin] El administrador ya existe (ID: ${existing.id_usuario}, email: ${existing.email}).`
            );
            console.log('[SeedAdmin] No se realizaron cambios.');
            return;
        }

        // --------------------------------------------------
        // No existe → crear el usuario administrador
        // --------------------------------------------------
        console.log('[SeedAdmin] No se encontró administrador. Creando usuario por defecto...');

        const passwordPlain =
            process.env.ADMIN_DEFAULT_PASSWORD || 'admin';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

        const result = await client.query(
            `INSERT INTO usuarios (
                nombre_completo, cedula, email, password, rol,
                descripcion, direccion, activo, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
            RETURNING id_usuario, nombre_completo, cedula, email, rol, activo`,
            [
                ADMIN_NOMBRE,
                ADMIN_CEDULA,
                ADMIN_EMAIL,
                passwordHash,
                ADMIN_ROL,
                ADMIN_DESC,
                ADMIN_DIRECCION,
            ]
        );

        const newAdmin = result.rows[0];

        console.log('═══════════════════════════════════════════════');
        console.log('  ✅ ADMINISTRADOR CREADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════');
        console.log(`  ID:        ${newAdmin.id_usuario}`);
        console.log(`  Usuario:   ${newAdmin.cedula}`);
        console.log(`  Email:     ${newAdmin.email}`);
        console.log(`  Rol:       ${newAdmin.rol}`);
        console.log(`  Activo:    ${newAdmin.activo}`);
        console.log('───────────────────────────────────────────────');
        console.log('  ⚠️  ADVERTENCIA DE SEGURIDAD');
        console.log('───────────────────────────────────────────────');
        console.log('  La contraseña por defecto es: "admin"');
        console.log('');
        console.log('  >>> CAMBIE LA CONTRASEÑA INMEDIATAMENTE <<<');
        console.log('  tras el primer inicio de sesión usando el');
        console.log('  endpoint PUT /api/usuarios/:id');
        console.log('');
        console.log('  En producción, configure la variable de');
        console.log('  entorno ADMIN_DEFAULT_PASSWORD con una');
        console.log('  contraseña segura antes de ejecutar este seed.');
        console.log('═══════════════════════════════════════════════');

        console.log('[SeedAdmin] Proceso de inicialización completado.');
    } catch (error: any) {
        console.error('[SeedAdmin] Error durante la inicialización:', error);
        throw error;
    } finally {
        await client.release();
        await pool.end();
    }
}

// ============================================================
// Ejecución
// ============================================================

seedAdmin()
    .then(() => {
        console.log('[SeedAdmin] Script finalizado.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[SeedAdmin] Script finalizado con errores:', err);
        process.exit(1);
    });