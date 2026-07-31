import { Router } from 'express';
import {
    listarEvaluacionesPorClase,
    listarEvaluacionesPorCurso,
    obtenerEvaluacion,
    crearEvaluacion,
    actualizarEvaluacion,
    eliminarEvaluacion,
} from '../controllers/evaluacionController';
import {
    listarCalificacionesPorEvaluacion,
    guardarCalificacion,
    obtenerMisNotas,
} from '../controllers/calificacionController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Lectura: cualquier usuario autenticado (el controlador filtra según rol)
router.get('/mis-notas', obtenerMisNotas);
router.get('/curso/:id_curso', listarEvaluacionesPorCurso);
router.get('/clase/:id_clase', listarEvaluacionesPorClase);
router.get('/:id', obtenerEvaluacion);

// Escritura: solo docentes y administradores
const soloDocentes = requireRole('docente', 'admin');
router.post('/', soloDocentes, crearEvaluacion);
router.put('/:id', soloDocentes, actualizarEvaluacion);
router.delete('/:id', soloDocentes, eliminarEvaluacion);

// Calificaciones por evaluación
router.get('/:id/calificaciones', soloDocentes, listarCalificacionesPorEvaluacion);
router.post('/:id/calificaciones', soloDocentes, guardarCalificacion);

export default router;