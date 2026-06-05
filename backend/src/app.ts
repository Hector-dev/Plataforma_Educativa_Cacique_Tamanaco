import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// CORS
app.use(cors());

// Parseo de JSON y urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    console.error('[Error Global]', err);

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
    console.log(`[Server] Servidor iniciado en el puerto ${PORT}`);
    console.log(`[Server] Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;