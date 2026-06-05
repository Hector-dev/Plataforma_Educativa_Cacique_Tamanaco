import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
    id_usuario: number;
    nombre_completo: string;
    cedula: string;
    email: string;
    rol: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            success: false,
            message: 'Token de autenticación no proporcionado',
        });
        return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    try {
        const secret = process.env.JWT_SECRET || 'cacique_tamanaco_secret_key_2024';
        const decoded = jwt.verify(token, secret) as {
            id: number;
            email: string;
            rol: string;
            iat: number;
            exp: number;
        };

        // Adjuntar usuario autenticado del token JWT
        req.user = {
            id_usuario: decoded.id,
            nombre_completo: '',
            cedula: '',
            email: decoded.email,
            rol: decoded.rol,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expirado. Inicie sesión nuevamente',
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: 'Token inválido',
        });
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
            return;
        }

        // Normalizar roles: "Administrador" y "admin" son equivalentes
        const userRoleNorm = req.user.rol.toLowerCase() === 'administrador' ? 'admin' : req.user.rol.toLowerCase();

        if (!roles.some(r => r.toLowerCase() === userRoleNorm)) {
            res.status(403).json({
                success: false,
                message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
            });
            return;
        }

        next();
    };
};

export default authMiddleware;