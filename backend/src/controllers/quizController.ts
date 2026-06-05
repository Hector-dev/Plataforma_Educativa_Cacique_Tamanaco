import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query, default as pool } from '../db';

// ============================================================
// Quiz Controller — CRUD de quizzes + intentos de estudiantes
// ============================================================

// ─── ADMIN / DOCENTE: CRUD del Quiz ────────────────────────

/** GET /api/quizzes/evaluacion/:id — obtener quiz de una evaluación */
export const obtenerQuizPorEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_evaluacion = parseInt(req.params.id, 10);
        if (isNaN(id_evaluacion)) {
            res.status(400).json({ success: false, message: 'ID de evaluación inválido' });
            return;
        }
        const quizResult = await query(
            `SELECT * FROM quizzes WHERE id_evaluacion = $1 LIMIT 1`, [id_evaluacion]
        );
        if (quizResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'No hay quiz para esta evaluación' });
            return;
        }
        const quiz = quizResult.rows[0];

        // Si es estudiante, verificar si ya completó el quiz
        if (req.user) {
            const intentoCompletado = await query(
                `SELECT nota, acertadas, total_preguntas FROM quiz_intentos
                 WHERE id_quiz = $1 AND id_estudiante = $2 AND finalizado = true`,
                [quiz.id_quiz, req.user.id_usuario]
            );
            if (intentoCompletado.rows.length > 0) {
                res.json({
                    success: true,
                    data: {
                        yaCompletado: true,
                        nota: intentoCompletado.rows[0].nota,
                        acertadas: intentoCompletado.rows[0].acertadas,
                        total_preguntas: intentoCompletado.rows[0].total_preguntas,
                    },
                });
                return;
            }
        }

        // Obtener preguntas con opciones
        const esAdmin = req.user && (req.user.rol === 'admin' || req.user.rol === 'docente' || req.user.rol === 'Administrador');
        const opcionesQuery = esAdmin
            ? `SELECT id_opcion, texto, es_correcta, orden FROM quiz_opciones WHERE id_pregunta = $1 ORDER BY orden`
            : `SELECT id_opcion, texto, orden FROM quiz_opciones WHERE id_pregunta = $1 ORDER BY orden`;
        const preguntasResult = await query(
            `SELECT * FROM quiz_preguntas WHERE id_quiz = $1 ORDER BY orden`, [quiz.id_quiz]
        );
        const preguntas: any[] = [];
        for (const p of preguntasResult.rows) {
            const opciones = await query(opcionesQuery, [p.id_pregunta]);
            preguntas.push({
                id: p.id_pregunta,
                enunciado: p.enunciado,
                tipo: p.tipo,
                opciones: opciones.rows,
            });
        }

        res.json({
            success: true,
            data: {
                id: quiz.id_quiz,
                id_evaluacion: quiz.id_evaluacion,
                titulo: quiz.titulo,
                descripcion: quiz.descripcion,
                tiempo_limite_min: quiz.tiempo_limite_min,
                activo: quiz.activo,
                preguntas,
            },
        });
    } catch (error) {
        logger.error({ err: error }, '[QuizController] Error al obtener quiz:');
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

/** PUT /api/quizzes/evaluacion/:id — crear o actualizar quiz completo */
export const guardarQuiz = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
        const id_evaluacion = parseInt(req.params.id, 10);
        if (isNaN(id_evaluacion)) {
            res.status(400).json({ success: false, message: 'ID de evaluación inválido' });
            return;
        }

        const { titulo, descripcion, tiempo_limite_min, activo, preguntas } = req.body;
        if (!titulo || !preguntas || !Array.isArray(preguntas)) {
            res.status(400).json({ success: false, message: 'titulo y preguntas son obligatorios' });
            return;
        }

        await client.query('BEGIN');

        // Upsert quiz
        let quizResult = await client.query(
            `SELECT id_quiz FROM quizzes WHERE id_evaluacion = $1`, [id_evaluacion]
        );
        let id_quiz: number;

        if (quizResult.rows.length > 0) {
            id_quiz = quizResult.rows[0].id_quiz;
            await client.query(
                `UPDATE quizzes SET titulo=$1, descripcion=$2, tiempo_limite_min=$3, activo=$4
                 WHERE id_quiz=$5`,
                [titulo, descripcion || null, tiempo_limite_min || null, activo !== false, id_quiz]
            );
            // Limpiar preguntas viejas (cascade elimina opciones y respuestas)
            await client.query(`DELETE FROM quiz_preguntas WHERE id_quiz = $1`, [id_quiz]);
        } else {
            quizResult = await client.query(
                `INSERT INTO quizzes (id_evaluacion, titulo, descripcion, tiempo_limite_min, activo)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id_quiz`,
                [id_evaluacion, titulo, descripcion || null, tiempo_limite_min || null, activo !== false]
            );
            id_quiz = quizResult.rows[0].id_quiz;
        }

        // Insertar preguntas
        for (let i = 0; i < preguntas.length; i++) {
            const p = preguntas[i];
            const preguntaResult = await client.query(
                `INSERT INTO quiz_preguntas (id_quiz, enunciado, tipo, orden)
                 VALUES ($1,$2,$3,$4) RETURNING id_pregunta`,
                [id_quiz, p.enunciado, p.tipo || 'opcion_multiple', i + 1]
            );
            const id_pregunta = preguntaResult.rows[0].id_pregunta;

            // Insertar opciones
            const opciones = p.opciones || [];
            const letras = ['A', 'B', 'C', 'D'];
            for (let j = 0; j < opciones.length; j++) {
                await client.query(
                    `INSERT INTO quiz_opciones (id_pregunta, texto, es_correcta, orden)
                     VALUES ($1,$2,$3,$4)`,
                    [id_pregunta, opciones[j].texto, opciones[j].es_correcta === true, letras[j]]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Quiz guardado exitosamente', data: { id_quiz } });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, '[QuizController] Error al guardar quiz:');
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        client.release();
    }
};

// ─── ESTUDIANTE: Tomar Quiz ────────────────────────────────

/** GET /api/quizzes/:id/tomar — obtener quiz sin revelar respuestas correctas */
export const tomarQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_quiz = parseInt(req.params.id, 10);
        if (isNaN(id_quiz)) {
            res.status(400).json({ success: false, message: 'ID de quiz inválido' });
            return;
        }
        const quizResult = await query(`SELECT * FROM quizzes WHERE id_quiz = $1`, [id_quiz]);
        if (quizResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Quiz no encontrado' });
            return;
        }
        const quiz = quizResult.rows[0];

        // Verificar si el estudiante ya lo completó
        if (req.user) {
            const intento = await query(
                `SELECT * FROM quiz_intentos WHERE id_quiz = $1 AND id_estudiante = $2 AND finalizado = true`,
                [id_quiz, req.user.id_usuario]
            );
            if (intento.rows.length > 0) {
                res.json({
                    success: true,
                    data: { yaCompletado: true, nota: intento.rows[0].nota, acertadas: intento.rows[0].acertadas, total: intento.rows[0].total_preguntas },
                });
                return;
            }
        }

        const preguntasResult = await query(
            `SELECT id_pregunta, enunciado, tipo, orden FROM quiz_preguntas WHERE id_quiz = $1 ORDER BY orden`,
            [id_quiz]
        );
        const preguntas: any[] = [];
        for (const p of preguntasResult.rows) {
            // No revelar es_correcta al estudiante
            const opciones = await query(
                `SELECT id_opcion, texto, orden FROM quiz_opciones WHERE id_pregunta = $1 ORDER BY orden`,
                [p.id_pregunta]
            );
            preguntas.push({
                id: p.id_pregunta,
                enunciado: p.enunciado,
                tipo: p.tipo,
                orden: p.orden,
                opciones: opciones.rows,
            });
        }

        res.json({
            success: true,
            data: {
                id: quiz.id_quiz,
                titulo: quiz.titulo,
                descripcion: quiz.descripcion,
                tiempo_limite_min: quiz.tiempo_limite_min,
                preguntas,
            },
        });
    } catch (error) {
        logger.error({ err: error }, '[QuizController] Error al tomar quiz:');
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

/** POST /api/quizzes/:id/responder — enviar respuesta individual */
export const responderPregunta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_quiz = parseInt(req.params.id, 10);
        const { id_pregunta, id_opcion } = req.body;
        if (!req.user || isNaN(id_quiz) || !id_pregunta) {
            res.status(400).json({ success: false, message: 'Datos inválidos' });
            return;
        }

        // Si ya completó el quiz, rechazar
        const completado = await query(
            `SELECT id_intento FROM quiz_intentos WHERE id_quiz = $1 AND id_estudiante = $2 AND finalizado = true`,
            [id_quiz, req.user.id_usuario]
        );
        if (completado.rows.length > 0) {
            res.status(400).json({ success: false, message: 'Ya completaste este quiz' });
            return;
        }

        // Crear o recuperar intento
        let intentoResult = await query(
            `SELECT id_intento FROM quiz_intentos WHERE id_quiz = $1 AND id_estudiante = $2 AND finalizado = false`,
            [id_quiz, req.user.id_usuario]
        );
        let id_intento: number;
        if (intentoResult.rows.length === 0) {
            intentoResult = await query(
                `INSERT INTO quiz_intentos (id_quiz, id_estudiante, total_preguntas)
                 SELECT $1, $2, COUNT(*) FROM quiz_preguntas WHERE id_quiz = $1
                 RETURNING id_intento`,
                [id_quiz, req.user.id_usuario]
            );
        }
        id_intento = intentoResult.rows[0].id_intento;

        // Verificar si la opción es correcta
        let es_correcta = false;
        if (id_opcion) {
            const opcionResult = await query(
                `SELECT es_correcta FROM quiz_opciones WHERE id_opcion = $1 AND id_pregunta = $2`,
                [id_opcion, id_pregunta]
            );
            if (opcionResult.rows.length > 0) {
                es_correcta = opcionResult.rows[0].es_correcta;
            }
        }

        // Upsert respuesta
        await query(
            `INSERT INTO quiz_respuestas (id_intento, id_pregunta, id_opcion, es_correcta)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (id_intento, id_pregunta)
             DO UPDATE SET id_opcion = $3, es_correcta = $4`,
            [id_intento, id_pregunta, id_opcion || null, es_correcta]
        );

        res.json({ success: true, data: { es_correcta } });
    } catch (error) {
        logger.error({ err: error }, '[QuizController] Error al responder:');
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

/** POST /api/quizzes/:id/finalizar — calificar y cerrar intento */
export const finalizarQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_quiz = parseInt(req.params.id, 10);
        if (!req.user || isNaN(id_quiz)) {
            res.status(400).json({ success: false, message: 'Datos inválidos' });
            return;
        }

        const intentoResult = await query(
            `SELECT id_intento FROM quiz_intentos WHERE id_quiz = $1 AND id_estudiante = $2 AND finalizado = false`,
            [id_quiz, req.user.id_usuario]
        );
        if (intentoResult.rows.length === 0) {
            res.status(400).json({ success: false, message: 'No hay intento activo' });
            return;
        }
        const id_intento = intentoResult.rows[0].id_intento;

        // Contar aciertos y total desde el intento (que ya tiene total_preguntas del quiz)
        const stats = await query(
            `SELECT i.total_preguntas AS total,
                    COUNT(r.id_respuesta) FILTER (WHERE r.es_correcta = true)::int AS acertadas
             FROM quiz_intentos i
             LEFT JOIN quiz_respuestas r ON r.id_intento = i.id_intento
             WHERE i.id_intento = $1
             GROUP BY i.total_preguntas`,
            [id_intento]
        );
        const { total, acertadas } = stats.rows[0];
        const nota = total > 0 ? Math.round((acertadas / total) * 100) : 0;

        await query(
            `UPDATE quiz_intentos SET finalizado = true, finalizado_en = NOW(),
                    nota = $1, acertadas = $2
             WHERE id_intento = $3`,
            [nota, acertadas, id_intento]
        );

        res.json({
            success: true,
            data: { nota, acertadas, total_preguntas: total },
        });
    } catch (error) {
        logger.error({ err: error }, '[QuizController] Error al finalizar:');
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

/** GET /api/quizzes/:id/resultados — obtener resultados de todos los estudiantes (solo docentes) */
export const obtenerResultadosQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_quiz = parseInt(req.params.id, 10);
        if (isNaN(id_quiz)) {
            res.status(400).json({ success: false, message: 'ID de quiz inválido' });
            return;
        }

        const result = await query(
            `SELECT qi.id_intento, qi.id_estudiante, u.nombre_completo AS estudiante,
                    qi.nota, qi.acertadas, qi.total_preguntas,
                    qi.finalizado, qi.finalizado_en, qi.iniciado_en
             FROM quiz_intentos qi
             JOIN usuarios u ON u.id_usuario = qi.id_estudiante
             WHERE qi.id_quiz = $1 AND qi.finalizado = true
             ORDER BY qi.nota DESC`,
            [id_quiz]
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        logger.error({ err: error }, '[QuizController] Error al obtener resultados:');
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};
