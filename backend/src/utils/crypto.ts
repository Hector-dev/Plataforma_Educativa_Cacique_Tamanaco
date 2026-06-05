import crypto from 'crypto';

// ============================================================
// Módulo de Encriptación Simétrica (AES-256-CBC)
// Plataforma Educativa Móvil Cacique Tamanaco
// ============================================================

const IV_LENGTH = 16; // bytes para AES
const SEPARATOR = ':';

/**
 * Deriva una clave de 32 bytes (256 bits) desde ENCRYPTION_KEY.
 * Usa SHA-256 exclusivamente — NO se usa MD5.
 */
function getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
        throw new Error(
            '[CRYPTO] ENCRYPTION_KEY no está definida en variables de entorno'
        );
    }
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Deriva un IV legacy de 16 bytes desde ENCRYPTION_IV usando SHA-256
 * (truncado a 16 bytes). Solo usado para desencriptar datos antiguos
 * que no tienen IV embebido (backward-compat).
 *
 * @deprecated Los nuevos cifrados usan IV aleatorio por operación.
 */
function getLegacyIV(): Buffer {
    const iv = process.env.ENCRYPTION_IV;
    if (!iv) {
        throw new Error(
            '[CRYPTO] ENCRYPTION_IV no está definida en variables de entorno'
        );
    }
    // SHA-256 produce 32 bytes → truncamos a 16 para AES
    return crypto.createHash('sha256').update(iv).digest().subarray(0, IV_LENGTH);
}

/**
 * Encripta un texto plano usando AES-256-CBC con IV aleatorio.
 *
 * Formato de salida: `iv_hex:ciphertext_hex`
 * - IV aleatorio de 16 bytes generado con crypto.randomBytes
 * - Ambos componentes en hexadecimal, separados por ':'
 *
 * @param text - Texto plano a encriptar
 * @returns Cadena `iv:data` en hexadecimal
 */
export function encryptAES(text: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prependemos el IV en hex para poder desencriptar después
    return iv.toString('hex') + SEPARATOR + encrypted;
}

/**
 * Desencripta un texto cifrado con AES-256-CBC.
 *
 * Soporta dos formatos:
 * - Nuevo: `iv_hex:ciphertext_hex` (IV aleatorio embebido)
 * - Legacy: `ciphertext_hex` solo (usa IV derivado de ENCRYPTION_IV)
 *
 * @param encryptedText - Texto cifrado (formato nuevo o legacy)
 * @returns Texto plano desencriptado
 */
export function decryptAES(encryptedText: string): string {
    const key = getKey();

    // Detectar formato: si contiene ':' es nuevo formato (iv:data)
    const sepIndex = encryptedText.indexOf(SEPARATOR);

    let iv: Buffer;
    let ciphertext: string;

    if (sepIndex !== -1) {
        // ─── Nuevo formato: IV aleatorio embebido ───
        const ivHex = encryptedText.substring(0, sepIndex);
        ciphertext = encryptedText.substring(sepIndex + 1);
        iv = Buffer.from(ivHex, 'hex');
    } else {
        // ─── Formato legacy: IV estático (backward-compat) ───
        ciphertext = encryptedText;
        iv = getLegacyIV();
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}