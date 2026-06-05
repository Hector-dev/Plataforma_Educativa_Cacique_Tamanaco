import { Router } from 'express';
import {
    crearCurso,
    listarCursos,
    listarMisCursos,
    obtenerCurso,
    actualizarCurso,
    eliminarCurso,
    matricularEstudiante,
    listarMatriculados,
    retirarEstudiante,
    obtenerDocumentoCurso,
    guardarDocumentoCurso,
} from '../controllers/cursoController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Lectura: disponible para cualquier usuario autenticado
router.get('/', listarCursos);
router.get('/mis-cursos', listarMisCursos);
router.get('/:id', obtenerCurso);
router.get('/:id/document', obtenerDocumentoCurso);
router.get('/:id/matriculados', listarMatriculados);

// Escritura: solo docentes y administradores
const soloDocentes = requireRole('docente', 'admin');

router.post('/', soloDocentes, crearCurso);
router.post('/:id/matricular', soloDocentes, matricularEstudiante);
router.delete('/:id/matricular/:idEstudiante', soloDocentes, retirarEstudiante);
router.put('/:id', soloDocentes, actualizarCurso);
router.delete('/:id', soloDocentes, eliminarCurso);
router.put('/:id/document', soloDocentes, guardarDocumentoCurso);

export default router;