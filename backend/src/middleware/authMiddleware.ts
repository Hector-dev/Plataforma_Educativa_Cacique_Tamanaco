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
    // Preferir cookie HttpOnly; mantener fallback a header Authorization
    // para compatibilidad con clientes que no manejen cookies (ej. scripts).
    let token: string | undefined;
    if (req.cookies && typeof req.cookies.token === 'string') {
        token = req.cookies.token;
    } else {
        const authHeader = req.headers.authorization;
        token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Token de autenticación no proporcionado',
        });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('[CRÍTICO] JWT_SECRET no está definido en variables de entorno. El servidor no puede validar tokens.');
        }
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
        const userRoleRaw = req.user.rol || '';
        const userRoleNorm = userRoleRaw.toLowerCase() === 'administrador' ? 'admin' : userRoleRaw.toLowerCase();

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