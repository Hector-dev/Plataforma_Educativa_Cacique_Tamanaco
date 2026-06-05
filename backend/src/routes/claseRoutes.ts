import { Router } from 'express';
import {
    crearClase,
    listarClasesPorCurso,
    obtenerClase,
    actualizarClase,
    eliminarClase,
} from '../controllers/claseController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', crearClase);
router.get('/curso/:id_curso', listarClasesPorCurso);
router.get('/:id', obtenerClase);
router.put('/:id', actualizarClase);
router.delete('/:id', eliminarClase);

export default router;