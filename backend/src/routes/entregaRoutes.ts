import { Router } from 'express';
import { crearEntrega } from '../controllers/entregaController';
import authMiddleware from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

// POST /api/entregas - Crear o actualizar entrega (soporta archivos y URL)
router.post('/', upload.single('archivo'), crearEntrega);

export default router;