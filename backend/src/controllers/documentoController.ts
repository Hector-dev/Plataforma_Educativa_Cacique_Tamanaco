import { Request, Response } from 'express';
import { query } from '../db';
import { encryptAES } from '../utils/crypto';

// ============================================================
// Endpoint de Registro de Documentos Personales (Cifrados)
// POST /api/inclusivo/documentos
// ============================================================

export const crearDocumento = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id_usuario, tipo_documento, numero_identificacion } = req.body;

        // Validar campos obligatorios
        if (!id_usuario || !tipo_documento || !numero_identificacion) {
            res.status(400).json({
                success: false,
                message:
                    'Los campos id_usuario, tipo_documento y numero_identificacion son obligatorios',
            });
            return;
        }

        // Encriptar el número de identificación con AES-256-CBC
        const numeroCifrado = encryptAES(String(numero_identificacion));

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

        console.error(
            '[DocumentoController] Error al registrar documento:',
            error
        );
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al registrar el documento',
        });
    }
};