import { Router } from 'express';
import { crearDocumento } from '../controllers/documentoController';
import authMiddleware from '../middleware/authMiddleware';
import { adminOPropioUsuarioBody } from '../utils/authorization';

const router = Router();

router.use(authMiddleware);

// POST /api/inclusivo/documentos - Registrar documento personal (cifrado)
// Solo el propio usuario o un administrador puede registrar documentos personales.
router.post('/', adminOPropioUsuarioBody, crearDocumento);

export default router;