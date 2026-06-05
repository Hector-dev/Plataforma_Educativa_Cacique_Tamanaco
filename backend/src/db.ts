import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

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

pool.on('error', (err: Error) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});

export const query = async (
    text: string,
    params?: any[]
): Promise<QueryResult> => {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query ejecutada en ${duration}ms | filas: ${result.rowCount}`);
    return result;
};

export default pool;