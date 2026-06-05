import crypto from 'crypto';

// ============================================================
// Módulo de Encriptación Simétrica (AES-256-CBC)
// Plataforma Educativa Móvil Cacique Tamanaco
// ============================================================

/**
 * Deriva una clave de 32 bytes a partir de la variable de entorno
 * ENCRYPTION_KEY usando SHA-256.
 */
function getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
        throw new Error(
            'ENCRYPTION_KEY no está definida en las variables de entorno'
        );
    }
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Deriva un IV de 16 bytes a partir de la variable de entorno
 * ENCRYPTION_IV usando MD5 (produce exactamente 16 bytes).
 */
function getIV(): Buffer {
    const iv = process.env.ENCRYPTION_IV;
    if (!iv) {
        throw new Error(
            'ENCRYPTION_IV no está definida en las variables de entorno'
        );
    }
    return crypto.createHash('md5').update(iv).digest();
}

/**
 * Encripta un texto plano usando AES-256-CBC.
 * Retorna el texto cifrado en formato hexadecimal.
 *
 * @param text - Texto plano a encriptar
 * @returns Texto cifrado en hexadecimal
 */
export function encryptAES(text: string): string {
    const key = getKey();
    const iv = getIV();

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
}

/**
 * Desencripta un texto cifrado (en hexadecimal) usando AES-256-CBC.
 * Retorna el texto plano original.
 *
 * @param encryptedText - Texto cifrado en hexadecimal
 * @returns Texto plano desencriptado
 */
export function decryptAES(encryptedText: string): string {
    const key = getKey();
    const iv = getIV();

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}