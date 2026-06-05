import { Router } from 'express';
import { rendimientoCurso, asistenciaGeneral, asistenciaPorCurso, estudiantesPorGenero } from '../controllers/reporteController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/reportes/rendimiento/:id_curso - Reporte de rendimiento por curso
router.get('/rendimiento/:id_curso', rendimientoCurso);

// GET /api/reportes/asistencia-general - Reporte de asistencia general
router.get('/asistencia-general', asistenciaGeneral);

// GET /api/reportes/asistencia-por-curso/:id_curso - Asistencia detallada por curso
router.get('/asistencia-por-curso/:id_curso', asistenciaPorCurso);

// GET /api/reportes/estudiantes-por-genero - Reporte de estudiantes por género
router.get('/estudiantes-por-genero', estudiantesPorGenero);

export default router;