import pino from 'pino';

// ============================================================
// Logger estructurado (pino)
// Plataforma Educativa Móvil Cacique Tamanaco
// ============================================================

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        },
    }),
    formatters: {
        level(label) {
            return { level: label };
        },
    },
});

/**
 * Crea un child logger con el correlationId del request (X-Request-Id).
 */
export function childLogger(req: { requestId?: string }, ctx: string) {
    const bindings: Record<string, string> = { ctx };
    const rid = (req as any).requestId;
    if (rid) {
        bindings.requestId = rid;
    }
    return logger.child(bindings);
}

export default logger;
