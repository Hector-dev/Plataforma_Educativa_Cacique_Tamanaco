import { Router } from 'express';
import { crearEntrega, listarMisEntregas } from '../controllers/entregaController';
import authMiddleware from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/entregas/mis-entregas - Entregas del estudiante autenticado
router.get('/mis-entregas', listarMisEntregas);

// POST /api/entregas - Crear o actualizar entrega (soporta archivos y URL)
router.post('/', upload.single('archivo'), crearEntrega);

export default router;