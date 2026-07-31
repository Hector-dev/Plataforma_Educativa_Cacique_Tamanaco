import { Router } from 'express';
import { syncData } from '../controllers/syncController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// POST /api/sync - Sincronización masiva de asistencias y calificaciones
// Solo docentes y administradores pueden sincronizar notas y asistencias.
router.post('/', requireRole('docente', 'admin'), syncData);

export default router;