/**
 * Pruebas unitarias para el módulo de Criptografía (AES-256-CBC)
 * Plataforma Educativa Móvil Cacique Tamanaco
 *
 * v2 — IV aleatorio por operación, formato iv:data, backward-compat.
 */

import { encryptAES, decryptAES } from '../utils/crypto';
import crypto from 'crypto';

// ============================================================
// Configuración: variables de entorno necesarias para el módulo
// ============================================================

const TEST_KEY = 'mi-clave-super-secreta-para-pruebas-123';
const TEST_IV = 'vector-inicializacion-legacy';

beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    process.env.ENCRYPTION_IV = TEST_IV;
});

// ============================================================
// Suite de pruebas
// ============================================================

describe('Módulo de Criptografía AES-256-CBC (v2 — IV aleatorio)', () => {
    // ----------------------------------------------------------
    // Caso 1: Encriptación con IV aleatorio
    // ----------------------------------------------------------
    describe('Caso 1: Encriptación', () => {
        test('debe retornar un texto en formato iv:data (hex)', () => {
            const documentoIdentidad = 'V-12345678';

            const cifrado = encryptAES(documentoIdentidad);

            // Debe tener el formato iv_hex:data_hex
            expect(cifrado).toBeDefined();
            expect(typeof cifrado).toBe('string');
            expect(cifrado).toContain(':');

            const [ivHex, dataHex] = cifrado.split(':');
            // IV son 16 bytes = 32 caracteres hex
            expect(ivHex).toHaveLength(32);
            // Data debe ser > 0
            expect(dataHex.length).toBeGreaterThan(0);

            // No debe coincidir con el texto plano original
            expect(cifrado).not.toBe(documentoIdentidad);
        });

        test('debe producir salidas distintas para el mismo texto (IV aleatorio)', () => {
            const texto = 'V-12345678';
            const resultado1 = encryptAES(texto);
            const resultado2 = encryptAES(texto);

            // Con IV aleatorio, AES-CBC NUNCA es determinista
            expect(resultado1).not.toBe(resultado2);
        });
    });

    // ----------------------------------------------------------
    // Caso 2: Desencriptación (round-trip)
    // ----------------------------------------------------------
    describe('Caso 2: Desencriptación exitosa', () => {
        test('debe recuperar el texto original (round-trip)', () => {
            const original = 'V-12345678';

            const cifrado = encryptAES(original);
            const descifrado = decryptAES(cifrado);

            expect(descifrado).toBe(original);
        });

        test('debe funcionar con cédulas de distintos formatos', () => {
            const casos = [
                'V-12345678',
                'E-87654321',
                'J-40123456',
                '12345678',
                'V-12345678-0',
            ];

            for (const cedula of casos) {
                const cifrado = encryptAES(cedula);
                const descifrado = decryptAES(cifrado);
                expect(descifrado).toBe(cedula);
            }
        });

        test('debe funcionar con strings largos y caracteres especiales', () => {
            const original =
                'Juan Pérez - cédula: V-12345678 - email: juan@example.com';

            const cifrado = encryptAES(original);
            const descifrado = decryptAES(cifrado);

            expect(descifrado).toBe(original);
        });
    });

    // ----------------------------------------------------------
    // Caso 3: Manejo de errores
    // ----------------------------------------------------------
    describe('Caso 3: Manejo de errores en desencriptación', () => {
        test('debe lanzar error al desencriptar un texto alterado', () => {
            const original = 'V-12345678';
            const cifrado = encryptAES(original);

            // Alteramos la parte de datos (después del separador ':')
            const [ivHex, dataHex] = cifrado.split(':');
            const cifradoAlterado = ivHex + ':' + dataHex.substring(0, 5) + 'f' + dataHex.substring(6);

            expect(() => {
                decryptAES(cifradoAlterado);
            }).toThrow();
        });

        test('debe lanzar error al desencriptar con IV manipulado', () => {
            const original = 'V-12345678';
            const cifrado = encryptAES(original);

            // Alteramos el IV (primeros 32 caracteres hex)
            const [_ivHex, dataHex] = cifrado.split(':');
            const ivFalso = 'a'.repeat(32);
            const cifradoConIVFalso = ivFalso + ':' + dataHex;

            expect(() => {
                decryptAES(cifradoConIVFalso);
            }).toThrow();
        });
    });

    // ----------------------------------------------------------
    // Caso 4: Backward-compat con formato legacy (sin IV)
    // ----------------------------------------------------------
    describe('Caso 4: Backward-compat con datos legacy (sin IV embebido)', () => {
        test('debe detectar formato legacy (sin ":") y usar IV derivado', () => {
            // Simular dato legacy: ciframos con IV fijo derivado de ENCRYPTION_IV
            // (replica del algoritmo antiguo para verificar backward-compat)
            const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY!).digest();
            const ivLegacy = crypto.createHash('sha256').update(process.env.ENCRYPTION_IV!).digest().subarray(0, 16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, ivLegacy);
            let legacyEncrypted = cipher.update('V-12345678', 'utf8', 'hex');
            legacyEncrypted += cipher.final('hex');

            // decryptAES debe detectar que no tiene ':' → usar IV legacy
            const descifrado = decryptAES(legacyEncrypted);
            expect(descifrado).toBe('V-12345678');
        });

        test('debe manejar formato nuevo (con ":") correctamente', () => {
            const original = 'DATOS-CONFIDENCIALES-2026';
            const cifrado = encryptAES(original);

            // Debe contener exactamente un separador ':'
            const parts = cifrado.split(':');
            expect(parts).toHaveLength(2);
            // IV hex = 32 chars
            expect(parts[0]).toHaveLength(32);

            const descifrado = decryptAES(cifrado);
            expect(descifrado).toBe(original);
        });
    });
});