import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import authMiddleware from '../middleware/authMiddleware';
import {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario,
} from '../controllers/usuarioController';

const router = Router();

// ─── Login público (sin middleware) ───────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
            return;
        }

        const result = await query(
            'SELECT id_usuario, nombre_completo, email, password, rol FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        const user = result.rows[0];
        const passwordValida = await bcrypt.compare(password, user.password);

        if (!passwordValida) {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        const secret = process.env.JWT_SECRET || 'cacique_tamanaco_secret_key_2024';
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email, rol: user.rol },
            secret,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id_usuario: user.id_usuario,
                nombre_completo: user.nombre_completo,
                email: user.email,
                rol: user.rol,
            },
        });
    } catch (error: any) {
        console.error('[Login] Error:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ─── CRUD protegido con autenticación JWT ────────────────
router.use(authMiddleware);
router.post('/', crearUsuario);
router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

export default router;