import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';

// ============================================================
// CRUD de Usuarios
// ============================================================

// POST /api/usuarios - Crear usuario
export const crearUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            nombre_completo,
            cedula,
            email,
            password,
            rol,
            tipo_discapacidad,
            foto_url,
            descripcion,
            edad,
            direccion,
            genero,
        } = req.body;

        // Validar campos obligatorios
        if (!nombre_completo || !cedula || !email || !password || !rol) {
            res.status(400).json({
                success: false,
                message: 'Los campos nombre_completo, cedula, email, password y rol son obligatorios',
            });
            return;
        }

        // Hashear la contraseña con bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await query(
            `INSERT INTO usuarios (
                nombre_completo, cedula, email, password, rol,
                tipo_discapacidad, foto_url, descripcion, edad, direccion, genero,
                fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING id_usuario, nombre_completo, cedula, email, rol, fecha_creacion`,
            [
                nombre_completo,
                cedula,
                email,
                passwordHash,
                rol,
                tipo_discapacidad || null,
                foto_url || null,
                descripcion || null,
                edad || null,
                direccion || null,
                genero || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        // Manejar violación de unique constraint (cédula o email duplicado)
        if (error.code === '23505') {
            const detail = error.detail || '';
            res.status(409).json({
                success: false,
                message: 'El valor ya existe en la base de datos',
                detail: detail.includes('cedula')
                    ? 'La cédula ya está registrada'
                    : 'El email ya está registrado',
            });
            return;
        }

        console.error('[UsuarioController] Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear el usuario',
        });
    }
};

// GET /api/usuarios - Listar todos los usuarios
export const listarUsuarios = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT id_usuario, nombre_completo, cedula, email, rol,
                    tipo_discapacidad, foto_url, descripcion, edad, direccion, genero,
                    fecha_creacion
             FROM usuarios
             ORDER BY fecha_creacion DESC`
        );

        res.json({
            success: true,
            data: result.rows,
            total: result.rowCount,
        });
    } catch (error) {
        console.error('[UsuarioController] Error al listar usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al listar usuarios',
        });
    }
};

// GET /api/usuarios/:id - Obtener un usuario por ID
export const obtenerUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_usuario = parseInt(id, 10);

        if (isNaN(id_usuario)) {
            res.status(400).json({
                success: false,
                message: 'ID de usuario inválido',
            });
            return;
        }

        const result = await query(
            `SELECT id_usuario, nombre_completo, cedula, email, rol,
                    tipo_discapacidad, foto_url, descripcion, edad, direccion, genero,
                    fecha_creacion
             FROM usuarios
             WHERE id_usuario = $1`,
            [id_usuario]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[UsuarioController] Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener el usuario',
        });
    }
};

// PUT /api/usuarios/:id - Actualizar usuario
export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_usuario = parseInt(id, 10);

        if (isNaN(id_usuario)) {
            res.status(400).json({
                success: false,
                message: 'ID de usuario inválido',
            });
            return;
        }

        const {
            nombre_completo,
            cedula,
            email,
            password,
            rol,
            tipo_discapacidad,
            foto_url,
            descripcion,
            edad,
            direccion,
            genero,
        } = req.body;

        // Construir dinámicamente los campos a actualizar
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (nombre_completo !== undefined) {
            fields.push(`nombre_completo = $${paramIndex++}`);
            values.push(nombre_completo);
        }
        if (cedula !== undefined) {
            fields.push(`cedula = $${paramIndex++}`);
            values.push(cedula);
        }
        if (email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (password !== undefined) {
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            fields.push(`password = $${paramIndex++}`);
            values.push(passwordHash);
        }
        if (rol !== undefined) {
            fields.push(`rol = $${paramIndex++}`);
            values.push(rol);
        }
        if (tipo_discapacidad !== undefined) {
            fields.push(`tipo_discapacidad = $${paramIndex++}`);
            values.push(tipo_discapacidad);
        }
        if (foto_url !== undefined) {
            fields.push(`foto_url = $${paramIndex++}`);
            values.push(foto_url);
        }
        if (descripcion !== undefined) {
            fields.push(`descripcion = $${paramIndex++}`);
            values.push(descripcion);
        }
        if (edad !== undefined) {
            fields.push(`edad = $${paramIndex++}`);
            values.push(edad);
        }
        if (direccion !== undefined) {
            fields.push(`direccion = $${paramIndex++}`);
            values.push(direccion);
        }
        if (genero !== undefined) {
            fields.push(`genero = $${paramIndex++}`);
            values.push(genero);
        }

        if (fields.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar',
            });
            return;
        }

        values.push(id_usuario);
        const result = await query(
            `UPDATE usuarios
             SET ${fields.join(', ')}
             WHERE id_usuario = $${paramIndex}
             RETURNING id_usuario, nombre_completo, cedula, email, rol,
                       tipo_discapacidad, foto_url, descripcion, edad, direccion, genero,
                       fecha_creacion`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({
                success: false,
                message: 'La cédula o el email ya están registrados por otro usuario',
            });
            return;
        }

        console.error('[UsuarioController] Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar el usuario',
        });
    }
};

// DELETE /api/usuarios/:id - Eliminar usuario
export const eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_usuario = parseInt(id, 10);

        if (isNaN(id_usuario)) {
            res.status(400).json({
                success: false,
                message: 'ID de usuario inválido',
            });
            return;
        }

        const result = await query(
            `DELETE FROM usuarios WHERE id_usuario = $1
             RETURNING id_usuario, nombre_completo, cedula, email`,
            [id_usuario]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[UsuarioController] Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar el usuario',
        });
    }
};