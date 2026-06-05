import { Router } from 'express';
import { crearDocumento } from '../controllers/documentoController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// POST /api/inclusivo/documentos - Registrar documento personal (cifrado)
router.post('/', crearDocumento);

export default router;