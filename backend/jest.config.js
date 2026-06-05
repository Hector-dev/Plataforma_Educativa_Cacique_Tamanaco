/**
 * Configuración de Jest para pruebas unitarias
 * Plataforma Educativa Móvil Cacique Tamanaco
 *
 * Entorno: TypeScript con ts-jest
 */
module.exports = {
    // Usa ts-jest como transformador para compilar TypeScript
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },

    // Patrón para encontrar los archivos de prueba
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],

    // Directorio raíz donde buscar las pruebas
    roots: ['<rootDir>/src'],

    // Entorno de pruebas en Node.js (sin DOM ni navegador)
    testEnvironment: 'node',

    // Limpia los mocks entre cada prueba automáticamente
    clearMocks: true,

    // Extensiones de archivo a considerar
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};