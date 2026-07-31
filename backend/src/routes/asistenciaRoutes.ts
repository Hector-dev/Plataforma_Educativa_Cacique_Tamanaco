import { Router } from 'express';
import {
    crearSesionAsistencia,
    obtenerSesionHoy,
    obtenerSesion,
    registrarAsistencia,
    cerrarSesionAsistencia,
    obtenerResumenSemanal,
    obtenerMiAsistencia,
} from '../controllers/asistenciaController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

const soloDocentes = requireRole('docente', 'admin');

// GET /api/asistencia/semanal - Resumen semanal de asistencias confirmadas
router.get('/semanal', soloDocentes, obtenerResumenSemanal);

// Sesiones diarias de asistencia
router.post('/sesiones', soloDocentes, crearSesionAsistencia);
router.get('/sesiones/:id_clase/hoy', soloDocentes, obtenerSesionHoy);
router.get('/sesiones/:id_sesion', soloDocentes, obtenerSesion);
router.post('/sesiones/:id_sesion/asistencias', soloDocentes, registrarAsistencia);
router.post('/sesiones/:id_sesion/cerrar', soloDocentes, cerrarSesionAsistencia);

// GET /api/asistencia/mi-asistencia - Asistencia personal del estudiante autenticado
router.get('/mi-asistencia', obtenerMiAsistencia);

export default router;
