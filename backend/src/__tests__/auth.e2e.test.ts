/**
 * Pruebas End-to-End: autenticación con cookies HttpOnly y endpoints de clase.
 */
import request from 'supertest';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import usuarioRoutes from '../routes/usuarioRoutes';
import claseRoutes from '../routes/claseRoutes';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-e2e-auth';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clases', claseRoutes);

const TEST_DB_CONFIG = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    database: process.env.DATABASE_NAME || 'cacique_tamanaco_db',
    user: process.env.DATABASE_USER || 'cacique_admin',
    password: process.env.DATABASE_PASSWORD || 'CaciqueDB_2026!SecurePass',
};

const pool = new Pool(TEST_DB_CONFIG);

const TS = Date.now();
const sufijo = `${TS}`;

let docenteId: number;
let estudianteId: number;
let cursoId: number;
let claseId: number;
const password = 'TestPass123!';
let passwordHash: string;

beforeAll(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        passwordHash = await bcrypt.hash(password, 10);

        const resDocente = await client.query(
            `INSERT INTO usuarios (nombre_completo, cedula, email, password, rol)
             VALUES ('Docente Auth ${sufijo}', 'V-DOC-${sufijo}', 'docente.auth.${sufijo}@test.com', $1, 'docente')
             RETURNING id_usuario`,
            [passwordHash]
        );
        docenteId = resDocente.rows[0].id_usuario;

        const resEstudiante = await client.query(
            `INSERT INTO usuarios (nombre_completo, cedula, email, password, rol)
             VALUES ('Estudiante Auth ${sufijo}', 'V-EST-${sufijo}', 'estudiante.auth.${sufijo}@test.com', $1, 'estudiante')
             RETURNING id_usuario`,
            [passwordHash]
        );
        estudianteId = resEstudiante.rows[0].id_usuario;

        const resCurso = await client.query(
            `INSERT INTO cursos (id_docente, nombre, descripcion)
             VALUES ($1, 'Curso Auth ${sufijo}', 'Curso para tests de autenticación')
             RETURNING id_curso`,
            [docenteId]
        );
        cursoId = resCurso.rows[0].id_curso;

        const resClase = await client.query(
            `INSERT INTO clases (id_curso, titulo, tipo_discapacidad)
             VALUES ($1, 'Clase Auth ${sufijo}', 'Visual')
             RETURNING id_clase`,
            [cursoId]
        );
        claseId = resClase.rows[0].id_clase;

        await client.query(
            `INSERT INTO curso_estudiantes (id_curso, id_estudiante) VALUES ($1, $2)`,
            [cursoId, estudianteId]
        );
        await client.query(
            `INSERT INTO matriculas (id_curso, id_estudiante, estado) VALUES ($1, $2, 'activo')`,
            [cursoId, estudianteId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

afterAll(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM asistencias_alumnos WHERE id_clase = $1', [claseId]);
        await client.query('DELETE FROM matriculas WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM curso_estudiantes WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM clases WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM cursos WHERE id_curso = $1', [cursoId]);
        await client.query('DELETE FROM usuarios WHERE id_usuario = ANY($1)', [[docenteId, estudianteId]]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Auth Cleanup Error]', err);
    } finally {
        client.release();
    }
    await pool.end();
});

describe('E2E: Autenticación con cookies HttpOnly', () => {
    test('login debe devolver cookie HttpOnly con el token', async () => {
        const res = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `docente.auth.${sufijo}@test.com`, password })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeUndefined();
        expect(res.body.user).toMatchObject({
            id_usuario: docenteId,
            rol: 'docente',
        });

        const cookieHeader = res.headers['set-cookie'];
        expect(cookieHeader).toBeDefined();
        const tokenCookie = Array.isArray(cookieHeader)
            ? cookieHeader.find((c) => c.startsWith('token='))
            : cookieHeader;
        expect(tokenCookie).toContain('HttpOnly');
        expect(tokenCookie).toContain('SameSite=');
    });

    test('logout debe borrar la cookie de token', async () => {
        // Autenticar primero
        const login = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `docente.auth.${sufijo}@test.com`, password });

        const cookies = login.headers['set-cookie'] as unknown as unknown as string[];
        expect(cookies).toBeDefined();

        const res = await request(app)
            .post('/api/usuarios/logout')
            .set('Cookie', cookies)
            .expect(200);

        expect(res.body.success).toBe(true);
        const cleared = res.headers['set-cookie'] as unknown as string[] | undefined;
        expect(cleared).toBeDefined();
        expect(cleared!.some((c) => c.startsWith('token=;'))).toBe(true);
    });

    test('acceso protegido funciona con la cookie HttpOnly', async () => {
        const login = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `docente.auth.${sufijo}@test.com`, password });

        const cookies = login.headers['set-cookie'] as unknown as string[];

        const res = await request(app)
            .get(`/api/clases/${claseId}/estudiantes`)
            .set('Cookie', cookies)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].id_usuario).toBe(estudianteId);
    });

    test('acceso protegido rechaza petición sin cookie ni header', async () => {
        const res = await request(app)
            .get(`/api/clases/${claseId}/estudiantes`)
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    test('solo docente/admin puede ver estudiantes de su clase', async () => {
        // Estudiante no puede ver la lista
        const loginEst = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `estudiante.auth.${sufijo}@test.com`, password });

        const cookiesEst = loginEst.headers['set-cookie'] as unknown as string[];

        await request(app)
            .get(`/api/clases/${claseId}/estudiantes`)
            .set('Cookie', cookiesEst)
            .expect(403);
    });
});

describe('E2E: Estudiantes por clase', () => {
    test('listar estudiantes matriculados en una clase', async () => {
        const login = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `docente.auth.${sufijo}@test.com`, password });

        const cookies = login.headers['set-cookie'] as unknown as string[];

        const res = await request(app)
            .get(`/api/clases/${claseId}/estudiantes`)
            .set('Cookie', cookies)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.total).toBe(1);
        expect(res.body.data[0]).toMatchObject({
            id_usuario: estudianteId,
            nombre_completo: expect.stringContaining('Estudiante Auth'),
        });
    });

    test('rechaza acceso si la clase no existe o no es del docente', async () => {
        const login = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `docente.auth.${sufijo}@test.com`, password });

        const cookies = login.headers['set-cookie'] as unknown as string[];

        await request(app)
            .get('/api/clases/999999/estudiantes')
            .set('Cookie', cookies)
            .expect(403);
    });

    test('un estudiante no puede listar estudiantes de una clase', async () => {
        const login = await request(app)
            .post('/api/usuarios/login')
            .send({ email: `estudiante.auth.${sufijo}@test.com`, password });

        const cookies = login.headers['set-cookie'] as unknown as string[];

        await request(app)
            .get(`/api/clases/${claseId}/estudiantes`)
            .set('Cookie', cookies)
            .expect(403);
    });
});
