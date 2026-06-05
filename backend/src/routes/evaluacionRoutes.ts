import { Router } from 'express';
import {
    listarEvaluacionesPorClase,
    listarEvaluacionesPorCurso,
    obtenerEvaluacion,
    crearEvaluacion,
    actualizarEvaluacion,
    eliminarEvaluacion,
} from '../controllers/evaluacionController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// GET /api/evaluaciones/curso/:id_curso - Evaluaciones de todas las clases de un curso
router.get('/curso/:id_curso', listarEvaluacionesPorCurso);

// GET /api/evaluaciones/clase/:id_clase - Evaluaciones de una clase específica
router.get('/clase/:id_clase', listarEvaluacionesPorClase);

// GET /api/evaluaciones/:id - Una evaluación
router.get('/:id', obtenerEvaluacion);

// POST /api/evaluaciones - Crear
router.post('/', crearEvaluacion);

// PUT /api/evaluaciones/:id - Actualizar
router.put('/:id', actualizarEvaluacion);

// DELETE /api/evaluaciones/:id - Eliminar
router.delete('/:id', eliminarEvaluacion);

export default router;