import { Router } from 'express';
import { crearEntrega, crearEntregaTarea, listarMisEntregas, listarEntregasDeTarea } from '../controllers/entregaController';
import authMiddleware from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/entregas/mis-entregas - Entregas del estudiante autenticado
router.get('/mis-entregas', listarMisEntregas);

// GET /api/entregas/tarea/:id/entregas - Entregas de una tarea (docente/admin)
router.get('/tarea/:id/entregas', listarEntregasDeTarea);

// POST /api/entregas - Crear o actualizar entrega (soporta archivos y URL)
router.post('/', upload.single('archivo'), crearEntrega);

// POST /api/entregas/tarea/:id - Entrega de tareas_curso
router.post('/tarea/:id', upload.single('archivo'), crearEntregaTarea);

export default router;