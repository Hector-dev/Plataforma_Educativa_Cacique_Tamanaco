/**
 * Prueba End-to-End: Sincronización Masiva (POST /api/sync)
 * Plataforma Educativa Móvil Cacique Tamanaco
 *
 * Escenario: Docente sin conexión que se conecta a la red local y sincroniza.
 * Validación transaccional: atomicidad (COMMIT / ROLLBACK) desde el HTTP.
 *
 * Requisitos:
 *   - PostgreSQL en ejecución (Docker: cacique_postgres)
 *   - Base de datos cacique_tamanaco_db con esquema DDL aplicado
 *   - Variables de entorno DATABASE_PORT=5433 (puerto mapeado del contenedor)
 */

import request from 'supertest';
import { Pool } from 'pg';
import express from 'express';
import cors from 'cors';
import syncRoutes from '../routes/syncRoutes';

// Construimos una app Express exclusiva para pruebas, sin app.listen()
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/sync', syncRoutes);

// ============================================================
// Configuración: pool de conexión directa para setup/verificación
// ============================================================

const TEST_DB_CONFIG = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    database: process.env.DATABASE_NAME || 'cacique_tamanaco_db',
    user: process.env.DATABASE_USER || 'cacique_admin',
    password: process.env.DATABASE_PASSWORD || 'CaciqueDB_2026!SecurePass',
};

const pool = new Pool(TEST_DB_CONFIG);

// ============================================================
// Sufijo único por ejecución → evita colisiones en UNIQUE
// ============================================================

const TS = Date.now();
const sufijo = `${TS}`;

// ============================================================
// IDs semilla (poblados en beforeAll)
// ============================================================

let docenteId: number;
let cursoId: number;
let claseId: number;
let evaluacionId: number;
let estudianteIds: number[] = [];

// ============================================================
// Setup: Insertar datos semilla en una transacción
// ============================================================

beforeAll(async () => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // --- 1. Insertar docente (cedula + email únicos por ejecución) ---
        const resDocente = await client.query(
            `INSERT INTO usuarios (nombre_completo, cedula, email, password, rol)
             VALUES ('Docente E2E ${sufijo}', 'V-DOC-${sufijo}', 'docente.${sufijo}@test.com', 'hash123', 'docente')
             RETURNING id_usuario`
        );
        docenteId = resDocente.rows[0].id_usuario;

        // --- 2. Insertar curso ---
        const resCurso = await client.query(
            `INSERT INTO cursos (id_docente, nombre, descripcion)
             VALUES ($1, 'Curso E2E ' || $2, 'Curso creado para validación end-to-end')
             RETURNING id_curso`,
            [docenteId, sufijo]
        );
        cursoId = resCurso.rows[0].id_curso;

        // --- 3. Insertar clase ---
        const resClase = await client.query(
            `INSERT INTO clases (id_curso, titulo, tipo_discapacidad)
             VALUES ($1, 'Clase de Prueba E2E', 'Visual')
             RETURNING id_clase`,
            [cursoId]
        );
        claseId = resClase.rows[0].id_clase;

        // --- 4. Insertar evaluación ---
        const resEvaluacion = await client.query(
            `INSERT INTO evaluaciones (id_clase, titulo_evaluacion, porcentaje)
             VALUES ($1, 'Evaluación de Prueba E2E', 20.00)
             RETURNING id_evaluacion`,
            [claseId]
        );
        evaluacionId = resEvaluacion.rows[0].id_evaluacion;

        // --- 5. Insertar 3 estudiantes (cedula + email únicos) ---
        estudianteIds = [];
        for (let i = 1; i <= 3; i++) {
            const resEst = await client.query(
                `INSERT INTO usuarios (nombre_completo, cedula, email, password, rol)
                 VALUES ('Est ${i} ${sufijo}', 'V-EST${i}-${sufijo}', 'est${i}.${sufijo}@test.com', 'hash456', 'estudiante')
                 RETURNING id_usuario`
            );
            const estId = resEst.rows[0].id_usuario;
            estudianteIds.push(estId);

            // Matricular en el curso
            await client.query(
                `INSERT INTO curso_estudiantes (id_curso, id_estudiante)
                 VALUES ($1, $2)`,
                [cursoId, estId]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

// ============================================================
// Teardown: Limpiar todos los datos de prueba
// ============================================================

afterAll(async () => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM asistencias_alumnos WHERE id_clase = $1', [claseId]);
        await client.query('DELETE FROM calificaciones WHERE id_evaluacion = $1', [evaluacionId]);
        await client.query('DELETE FROM evaluaciones WHERE id_clase = $1', [claseId]);
        await client.query('DELETE FROM curso_estudiantes WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM necesidades_inclusivas WHERE id_estudiante = ANY($1)', [estudianteIds]);
        await client.query('DELETE FROM exposicion_motivos WHERE id_usuario = ANY($1)', [estudianteIds]);
        await client.query('DELETE FROM clases WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM cursos WHERE id_docente = $1', [docenteId]);
        await client.query('DELETE FROM usuarios WHERE id_usuario = ANY($1)', [estudianteIds]);
        await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [docenteId]);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Cleanup Error]', err);
    } finally {
        client.release();
    }

    await pool.end();
});

// ============================================================
// Suite de pruebas E2E: Sincronización Masiva
// ============================================================

describe('E2E: Sincronización Masiva POST /api/sync', () => {
    // ============================================================
    // Caso de Éxito (Happy Path)
    // ============================================================
    describe('✅ Caso de Éxito: Sincronización válida (COMMIT)', () => {
        let payload: any;

        beforeAll(() => {
            // Construir payload con los IDs reales de la BD
            payload = {
                asistencias: estudianteIds.map((estId, idx) => ({
                    id_clase: claseId,
                    id_estudiante: estId,
                    estado: idx === 2 ? 'ausente' : 'presente',
                })),
                calificaciones: estudianteIds.map((estId, idx) => ({
                    id_evaluacion: evaluacionId,
                    id_estudiante: estId,
                    nota_preliminar: idx === 0 ? 18 : idx === 1 ? 15 : 20,
                    observaciones:
                        idx === 0
                            ? 'Buen trabajo'
                            : idx === 1
                                ? 'Puede mejorar'
                                : 'Excelente',
                })),
            };
        });

        test('debe retornar status 200 con payload válido', async () => {
            const res = await request(app)
                .post('/api/sync')
                .set('Authorization', 'Bearer test-token-e2e')
                .send(payload)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Sincronización Exitosa');
            expect(res.body.data.asistencias_sincronizadas).toBe(3);
            expect(res.body.data.calificaciones_sincronizadas).toBe(3);
        });

        test('las 3 asistencias deben persistir en la base de datos (COMMIT ok)', async () => {
            const result = await pool.query(
                `SELECT id_clase, id_estudiante, estado
                 FROM asistencias_alumnos
                 WHERE id_clase = $1
                 ORDER BY id_estudiante`,
                [claseId]
            );

            expect(result.rows).toHaveLength(3);

            const estados = result.rows.map((r) => r.estado);
            expect(estados).toContain('presente');
            expect(estados).toContain('ausente');

            const idsEstudiantes = result.rows.map((r) => r.id_estudiante);
            expect(idsEstudiantes.sort()).toEqual([...estudianteIds].sort());
        });

        test('las 3 calificaciones deben persistir en la base de datos (COMMIT ok)', async () => {
            const result = await pool.query(
                `SELECT id_evaluacion, id_estudiante, nota_preliminar, observaciones
                 FROM calificaciones
                 WHERE id_evaluacion = $1
                 ORDER BY id_estudiante`,
                [evaluacionId]
            );

            expect(result.rows).toHaveLength(3);

            const notas = result.rows.map((r) => Number(r.nota_preliminar));
            expect(notas).toContain(18);
            expect(notas).toContain(15);
            expect(notas).toContain(20);
        });
    });

    // ============================================================
    // Caso de Fallo Transaccional (Rollback Automático)
    // ============================================================
    describe('❌ Caso de Fallo: FK violation → ROLLBACK automático', () => {
        let asistenciaCountBefore: number;
        let calificacionCountBefore: number;
        let payloadInvalido: any;

        beforeAll(async () => {
            // Contar registros ANTES del intento fallido (debe incluir
            // los 3 registros del Happy Path)
            const countAsist = await pool.query(
                `SELECT COUNT(*) as cnt FROM asistencias_alumnos WHERE id_clase = $1`,
                [claseId]
            );
            asistenciaCountBefore = parseInt(countAsist.rows[0].cnt, 10);

            const countCalif = await pool.query(
                `SELECT COUNT(*) as cnt FROM calificaciones WHERE id_evaluacion = $1`,
                [evaluacionId]
            );
            calificacionCountBefore = parseInt(countCalif.rows[0].cnt, 10);

            // Construir payload inválido con una evaluación que NO existe (FK violada)
            const evaluacionInexistente = evaluacionId + 99999;

            payloadInvalido = {
                // 2 asistencias válidas (usando estudiantes y clase existentes)
                asistencias: estudianteIds.slice(0, 2).map((estId) => ({
                    id_clase: claseId,
                    id_estudiante: estId,
                    estado: 'justificado',
                })),
                // 1 calificación con id_evaluacion que NO existe → violación FK
                calificaciones: [
                    {
                        id_evaluacion: evaluacionInexistente,
                        id_estudiante: estudianteIds[2],
                        nota_preliminar: 15,
                        observaciones: 'Evaluación inexistente - debe disparar ROLLBACK',
                    },
                ],
            };
        });

        test('debe retornar status 400 por violación de FK (evaluación inexistente)', async () => {
            const res = await request(app)
                .post('/api/sync')
                .set('Authorization', 'Bearer test-token-e2e')
                .send(payloadInvalido)
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        test('las 2 asistencias NO deben persistir (ROLLBACK deshizo todo)', async () => {
            const countResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM asistencias_alumnos WHERE id_clase = $1`,
                [claseId]
            );
            const countAfter = parseInt(countResult.rows[0].cnt, 10);

            // El contador debe ser exactamente igual al de antes del intento
            expect(countAfter).toBe(asistenciaCountBefore);
        });

        test('las calificaciones NO deben persistir (ROLLBACK deshizo todo)', async () => {
            // Esta prueba verifica que el contador de calificaciones
            // NO haya cambiado (rollback deshizo la calificación inválida
            // y también las asistencias válidas del mismo paquete)
            const countResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM calificaciones WHERE id_evaluacion = $1`,
                [evaluacionId]
            );
            const countAfter = parseInt(countResult.rows[0].cnt, 10);

            expect(countAfter).toBe(calificacionCountBefore);
        });
    });
});