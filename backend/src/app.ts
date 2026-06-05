import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

import usuarioRoutes from './routes/usuarioRoutes';
import cursoRoutes from './routes/cursoRoutes';
import claseRoutes from './routes/claseRoutes';
import entregaRoutes from './routes/entregaRoutes';
import syncRoutes from './routes/syncRoutes';
import documentoRoutes from './routes/documentoRoutes';
import reporteRoutes from './routes/reporteRoutes';
import evaluacionRoutes from './routes/evaluacionRoutes';
import quizRoutes from './routes/quizRoutes';
import asistenciaRoutes from './routes/asistenciaRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middlewares globales
// ============================================================

// Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type, etc.)
app.use(helmet());

// Compresión gzip/brotli para respuestas JSON
app.use(compression());

// CORS — solo orígenes permitidos
const allowedOrigins = [
    'http://localhost',
    'http://localhost:4200',              // Angular dev server
    process.env.CORS_ORIGIN,              // Dominio de producción
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (server-to-server, Postman, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origen no permitido por CORS: ${origin}`));
        }
    },
    credentials: true,
}));

// X-Request-Id — trazabilidad única por request
app.use((_req: Request, res: Response, next: NextFunction) => {
    const id = crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    (_req as any).requestId = id;
    next();
});

// Parseo de JSON y urlencoded — body limitado a 1MB
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// ============================================================
// Rutas
// ============================================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'API Cacique Tamanaco funcionando correctamente',
        timestamp: new Date().toISOString(),
    });
});

// CRUD Usuarios
app.use('/api/usuarios', usuarioRoutes);

// CRUD Cursos
app.use('/api/cursos', cursoRoutes);

// CRUD Clases
app.use('/api/clases', claseRoutes);

// Endpoint de Entregas
app.use('/api/entregas', entregaRoutes);

// Endpoint de Sincronización Masiva (Offline-First)
app.use('/api/sync', syncRoutes);

// Endpoint de Documentos Personales (Cifrados)
app.use('/api/inclusivo/documentos', documentoRoutes);

// Reportes de Rendimiento
app.use('/api/reportes', reporteRoutes);

// Evaluaciones (actividades entregables)
app.use('/api/evaluaciones', evaluacionRoutes);

// Quizzes
app.use('/api/quizzes', quizRoutes);

// Asistencia
app.use('/api/asistencia', asistenciaRoutes);

// ============================================================
// Middleware de errores global
// ============================================================

interface ErrorResponse {
    success: boolean;
    message: string;
    error?: string;
    stack?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: any) => {
    logger.error({ err, requestId: (_req as any).requestId }, '[Error Global]');

    // Error de multer (subida de archivos)
    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
            success: false,
            message: 'El archivo excede el tamaño máximo permitido (10MB)',
        } as ErrorResponse);
        return;
    }

    // Error de tipo multer (extensión no permitida)
    if (err.message && err.message.includes('Extensión no permitida')) {
        res.status(400).json({
            success: false,
            message: err.message,
        } as ErrorResponse);
        return;
    }

    const statusCode = err.status || 500;

    const response: ErrorResponse = {
        success: false,
        message: err.message || 'Error interno del servidor',
    };

    if (process.env.NODE_ENV === 'development') {
        response.error = err.message;
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// ============================================================
// Inicio del servidor
// ============================================================

app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Servidor iniciado');
});

export default app;