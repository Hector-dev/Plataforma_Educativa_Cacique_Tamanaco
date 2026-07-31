import { Router } from 'express';
import { rendimientoCurso, asistenciaGeneral, asistenciaPorCurso, asistenciaPorGenero } from '../controllers/reporteController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// Reportes: solo docentes y administradores
const soloDocentes = requireRole('docente', 'admin');

// GET /api/reportes/rendimiento/:id_curso - Reporte de rendimiento por curso
router.get('/rendimiento/:id_curso', soloDocentes, rendimientoCurso);

// GET /api/reportes/asistencia-general - Reporte de asistencia general
router.get('/asistencia-general', soloDocentes, asistenciaGeneral);

// GET /api/reportes/asistencia-por-curso/:id_curso - Asistencia detallada por curso
router.get('/asistencia-por-curso/:id_curso', soloDocentes, asistenciaPorCurso);

// GET /api/reportes/genero - Reporte de asistencia por género
router.get('/genero', soloDocentes, asistenciaPorGenero);

export default router;