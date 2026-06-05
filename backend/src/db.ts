import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'cacique_tamanaco_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// ─── Pool error handler: log, NO matar el proceso ──────────
pool.on('error', (err: Error) => {
    logger.error({ err }, 'Error inesperado en pool PostgreSQL');
    // NO process.exit — el pool maneja reconexión automáticamente
});

// ─── Retry con backoff exponencial ──────────────────────────
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 300
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const isRetryable =
                err.code === '57P01' ||   // admin shutdown
                err.code === '57P02' ||   // crash shutdown
                err.code === '57P03' ||   // cannot connect now
                err.code === '08006' ||   // connection failure
                err.code === '08001' ||   // unable to connect
                err.code === '40001' ||   // serialization failure
                err.message?.includes('Connection terminated');

            if (!isRetryable || attempt === maxRetries) {
                throw err;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            logger.warn(
                { attempt: attempt + 1, maxRetries, delayMs: delay, code: err.code },
                'Reintentando query BD'
            );
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw new Error('unreachable');
}

/**
 * Helper unificado para queries con retry automático.
 * Todas las consultas deben usar este helper.
 */
export const query = async (
    text: string,
    params?: any[]
): Promise<QueryResult> => {
    const start = Date.now();
    const result = await withRetry(() => pool.query(text, params));
    const duration = Date.now() - start;
    logger.debug({ durationMs: duration, rows: result.rowCount }, 'DB query');
    return result;
};

/**
 * Obtiene un PoolClient para transacciones.
 * Usar SOLO cuando se necesita BEGIN/COMMIT/ROLLBACK.
 */
export const getClient = async (): Promise<PoolClient> => {
    return await withRetry(() => pool.connect());
};

export default pool;