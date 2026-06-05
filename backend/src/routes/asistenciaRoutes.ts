import { Router } from 'express';
import { obtenerResumenSemanal, obtenerMiAsistencia } from '../controllers/asistenciaController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/asistencia/semanal - Resumen semanal de asistencias confirmadas
router.get('/semanal', obtenerResumenSemanal);

// GET /api/asistencia/mi-asistencia - Asistencia personal del estudiante autenticado
router.get('/mi-asistencia', obtenerMiAsistencia);

export default router;
