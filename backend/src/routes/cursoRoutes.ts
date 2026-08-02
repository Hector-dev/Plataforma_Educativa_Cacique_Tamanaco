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
    listarEstudiantesDisponibles,
    obtenerDocumentoCurso,
    guardarDocumentoCurso,
    subirMaterialCurso,
} from '../controllers/cursoController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';
import { requireCursoOwner, requireCursoAccess } from '../utils/authorization';
import { uploadMaterial } from '../middleware/materialUploadMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Lectura: disponible para cualquier usuario autenticado
router.get('/', listarCursos);
router.get('/mis-cursos', listarMisCursos);
router.get('/:id', obtenerCurso);
router.get('/:id/document', requireCursoAccess, obtenerDocumentoCurso);
router.get('/:id/matriculados', requireCursoOwner, listarMatriculados);

// Escritura: solo docentes y administradores
const soloDocentes = requireRole('docente', 'admin');

router.post('/', soloDocentes, crearCurso);
router.post('/:id/matricular', soloDocentes, matricularEstudiante);
router.delete('/:id/matricular/:idEstudiante', soloDocentes, retirarEstudiante);
router.put('/:id', soloDocentes, actualizarCurso);
router.delete('/:id', soloDocentes, eliminarCurso);
router.put('/:id/document', soloDocentes, guardarDocumentoCurso);
router.post('/:id/material-upload', soloDocentes, requireCursoOwner, uploadMaterial.single('archivo'), subirMaterialCurso);
router.get('/:id/estudiantes-disponibles', soloDocentes, requireCursoOwner, listarEstudiantesDisponibles);

export default router;