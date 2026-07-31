import { Router } from 'express';
import {
    obtenerQuizPorEvaluacion,
    guardarQuiz,
    tomarQuiz,
    responderPregunta,
    finalizarQuiz,
    obtenerResultadosQuiz,
    obtenerResultadosPorEvaluacion,
} from '../controllers/quizController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Admin / Docente: CRUD de quizzes + ver resultados
const soloDocentes = requireRole('docente', 'admin');
router.get('/evaluacion/:id', obtenerQuizPorEvaluacion);
router.put('/evaluacion/:id', soloDocentes, guardarQuiz);
router.get('/evaluacion/:id/resultados', soloDocentes, obtenerResultadosPorEvaluacion);
router.get('/:id/resultados', soloDocentes, obtenerResultadosQuiz);

// Estudiante: tomar quiz
router.get('/:id/tomar', tomarQuiz);
router.post('/:id/responder', responderPregunta);
router.post('/:id/finalizar', finalizarQuiz);

export default router;
