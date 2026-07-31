import { Router } from 'express';
import {
    crearClase,
    listarClasesPorCurso,
    listarClasesPorDocente,
    obtenerClase,
    actualizarClase,
    eliminarClase,
    listarEstudiantesPorClase,
} from '../controllers/claseController';
import authMiddleware, { requireRole } from '../middleware/authMiddleware';
import { requireClaseOwner } from '../utils/authorization';

const router = Router();

router.use(authMiddleware);

// Lectura: cualquier usuario autenticado
router.get('/mis-clases', requireRole('docente', 'admin'), listarClasesPorDocente);
router.get('/curso/:id_curso', listarClasesPorCurso);
router.get('/:id', obtenerClase);
router.get('/:id/estudiantes', requireClaseOwner, listarEstudiantesPorClase);

// Escritura: solo docentes y administradores
const soloDocentes = requireRole('docente', 'admin');
router.post('/', soloDocentes, crearClase);
router.put('/:id', soloDocentes, actualizarClase);
router.delete('/:id', soloDocentes, eliminarClase);

export default router;