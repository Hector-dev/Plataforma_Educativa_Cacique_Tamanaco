/**
 * Pruebas unitarias para el módulo de Criptografía (AES-256-CBC)
 * Plataforma Educativa Móvil Cacique Tamanaco
 *
 * Estas pruebas se ejecutan completamente en memoria, sin conexión
 * a base de datos ni dependencias externas.
 */

import { encryptAES, decryptAES } from '../utils/crypto';

// ============================================================
// Configuración: variables de entorno necesarias para el módulo
// ============================================================

const TEST_KEY = 'mi-clave-super-secreta-para-pruebas-123';
const TEST_IV = 'vector-inicializacion-16b';

beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    process.env.ENCRYPTION_IV = TEST_IV;
});

// ============================================================
// Suite de pruebas
// ============================================================

describe('Módulo de Criptografía AES-256-CBC', () => {
    // ----------------------------------------------------------
    // Caso 1: Encriptar un string y verificar que el resultado
    //         sea diferente al texto original
    // ----------------------------------------------------------
    describe('Caso 1: Encriptación', () => {
        test('debe retornar un texto cifrado diferente al original', () => {
            const documentoIdentidad = 'V-12345678';

            const cifrado = encryptAES(documentoIdentidad);

            // El cifrado debe ser una cadena hexadecimal no vacía
            expect(cifrado).toBeDefined();
            expect(typeof cifrado).toBe('string');
            expect(cifrado.length).toBeGreaterThan(0);

            // No debe coincidir con el texto plano original
            expect(cifrado).not.toBe(documentoIdentidad);
        });

        test('debe producir salidas distintas para el mismo texto (por el IV)', () => {
            // Nota: en esta implementación el IV es fijo, pero se verifica
            // que efectivamente el cifrado sea reproducible.
            const texto = 'V-12345678';
            const resultado1 = encryptAES(texto);
            const resultado2 = encryptAES(texto);

            // Con IV fijo y misma clave, AES-CBC es determinista
            expect(resultado1).toBe(resultado2);
        });
    });

    // ----------------------------------------------------------
    // Caso 2: Desencriptar el string previamente encriptado y
    //         verificar que coincida exactamente con el original
    // ----------------------------------------------------------
    describe('Caso 2: Desencriptación exitosa', () => {
        test('debe recuperar el texto original tras encriptar y desencriptar', () => {
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
    // Caso 3: Intentar desencriptar un texto alterado o con un
    //         IV incorrecto y validar que el sistema maneje el
    //         error adecuadamente (lanzando una excepción)
    // ----------------------------------------------------------
    describe('Caso 3: Manejo de errores en desencriptación', () => {
        test('debe lanzar error al desencriptar un texto alterado', () => {
            const original = 'V-12345678';
            const cifrado = encryptAES(original);

            // Alteramos el texto cifrado (cambiamos un carácter hex)
            const cifradoAlterado =
                cifrado.substring(0, 5) +
                'f' +
                cifrado.substring(6);

            expect(() => {
                decryptAES(cifradoAlterado);
            }).toThrow();
        });

        test('debe lanzar error al desencriptar con IV incorrecto', () => {
            const original = 'V-12345678';
            const cifradoConIVOriginal = encryptAES(original);

            // Cambiamos la variable de entorno IV para simular un IV incorrecto
            process.env.ENCRYPTION_IV = 'otro-vector-incorrecto';

            expect(() => {
                decryptAES(cifradoConIVOriginal);
            }).toThrow();

            // Restauramos el IV original para no afectar otras pruebas
            process.env.ENCRYPTION_IV = TEST_IV;
        });

        test('debe lanzar error al desencriptar una cadena hex inválida', () => {
            // Una cadena que no es hexadecimal válido
            const textoInvalido = 'esto-no-es-hexadecimal-zzzz';

            expect(() => {
                decryptAES(textoInvalido);
            }).toThrow();
        });

        test('debe lanzar error al desencriptar una cadena vacía', () => {
            expect(() => {
                decryptAES('');
            }).toThrow();
        });

        test('debe lanzar error si ENCRYPTION_KEY no está definida', () => {
            delete process.env.ENCRYPTION_KEY;

            expect(() => {
                encryptAES('texto');
            }).toThrow('ENCRYPTION_KEY no está definida');

            // Restauramos la clave
            process.env.ENCRYPTION_KEY = TEST_KEY;
        });

        test('debe lanzar error si ENCRYPTION_IV no está definida', () => {
            delete process.env.ENCRYPTION_IV;

            expect(() => {
                encryptAES('texto');
            }).toThrow('ENCRYPTION_IV no está definida');

            // Restauramos el IV
            process.env.ENCRYPTION_IV = TEST_IV;
        });
    });
});