import { Router } from 'express';
import { syncData } from '../controllers/syncController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// POST /api/sync - Sincronización masiva de asistencias y calificaciones
router.post('/', syncData);

export default router;