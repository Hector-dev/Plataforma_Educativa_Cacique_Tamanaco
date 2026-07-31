import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';
import { encryptAES } from '../utils/crypto';
import { crearDocumentoSchema } from '../utils/validators';

// ============================================================
// Endpoint de Registro de Documentos Personales (Cifrados)
// POST /api/inclusivo/documentos
// ============================================================

export const crearDocumento = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const parsed = crearDocumentoSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: parsed.error.flatten(),
            });
            return;
        }

        const { id_usuario, tipo_documento, numero_identificacion } = parsed.data;

        // Encriptar el número de identificación con AES-256-CBC
        const numeroCifrado = encryptAES(numero_identificacion);

        // Insertar en la base de datos
        const result = await query(
            `INSERT INTO documentos_personales
                (id_usuario, tipo_documento, numero_identificacion, fecha_subida)
             VALUES ($1, $2, $3, NOW())
             RETURNING id_documento, id_usuario, tipo_documento, fecha_subida`,
            [id_usuario, tipo_documento, numeroCifrado]
        );

        res.status(201).json({
            success: true,
            message: 'Documento registrado exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        // Manejar error de FK violada
        if (error.code === '23503') {
            res.status(400).json({
                success: false,
                message: 'El usuario especificado no existe',
            });
            return;
        }

        logger.error(
            '[DocumentoController] Error al registrar documento:',
            error
        );
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al registrar el documento',
        });
    }
};