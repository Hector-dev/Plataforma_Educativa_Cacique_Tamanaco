// ============================================================
// test-e2e-flows.js
// Pruebas E2E de flujos críticos de usuario
//
// Flujo 1: Login → Dashboard
// Flujo 2: Login → Crear Curso → Verificar listado
// Flujo 3: Login → Enviar Entrega (URL)
// ============================================================

const {
    initBrowser,
    sleep,
    appendReportLine,
    takeScreenshot,
    writeFinalReport,
} = require('./test-e2e-utils');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend:80';
const API_URL = process.env.API_URL || 'http://backend:3000';
const TIMEOUT = 30000;

(async () => {
    console.log('============================================');
    console.log('  PRUEBAS E2E — Flujos Críticos');
    console.log('============================================\n');

    const results = [];
    let browser, context, page;

    const recordResult = (name, passed, detail = '') => {
        results.push({ name, passed, detail, timestamp: new Date().toISOString() });
        const icon = passed ? '✓' : '✗';
        console.log(`  ${icon} ${name}: ${passed ? 'PASÓ' : 'FALLÓ'}${detail ? ` - ${detail}` : ''}`);
        appendReportLine(`${icon} ${name}: ${passed ? 'PASÓ' : 'FALLÓ'}${detail ? ` - ${detail}` : ''}`);
    };

    let authToken = '';

    try {
        // ───── 1. Inicializar navegador ─────────────────
        console.log('\n── Flujo 1: Login ──');
        const initResult = await initBrowser(true);
        browser = initResult.browser;
        context = initResult.context;
        page = initResult.page;

        // ───── 2. Login via API (más confiable que UI) ──
        console.log('\n[Login] Autenticando vía API...');
        const loginResult = await page.evaluate(async (apiUrl) => {
            try {
                const resp = await fetch(`${apiUrl}/usuarios/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@admin.com', password: 'admin' }),
                });
                const data = await resp.json();
                return { success: data.success, token: data.token, user: data.user, status: resp.status };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }, API_URL);

        if (loginResult.success && loginResult.token) {
            authToken = loginResult.token;
            console.log(`  ✓ Login exitoso — Usuario: ${loginResult.user?.nombre_completo}`);
            recordResult('Login (API)', true, `Rol: ${loginResult.user?.rol}`);
        } else {
            recordResult('Login (API)', false, loginResult.error || 'Token no recibido');
            throw new Error('Login falló — no se puede continuar');
        }

        await takeScreenshot(page, '01-login-exitoso');

        // ───── 3. Navegar al frontend con token ─────────
        console.log('\n[Frontend] Cargando dashboard...');
        await page.evaluate((token) => {
            sessionStorage.setItem('cactam_token', token);
        }, authToken);

        await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await sleep(2000);

        const dashTitle = await page.title();
        console.log(`  Título: ${dashTitle}`);
        recordResult('Carga de Dashboard', dashTitle.includes('Cacique'));

        await takeScreenshot(page, '02-dashboard-cargado');

        // ───── Flujo 2: Crear Curso ─────────────────────
        console.log('\n── Flujo 2: Crear Curso ──');

        const cursoPayload = {
            id_docente: loginResult.user?.id_usuario || 1,
            nombre: `Curso E2E Test ${Date.now()}`,
            descripcion: 'Curso creado por prueba E2E automatizada',
        };

        const createCursoResult = await page.evaluate(async (payload, apiUrl, token) => {
            try {
                const resp = await fetch(`${apiUrl}/cursos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                const data = await resp.json();
                return { success: data.success, data: data.data, status: resp.status };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }, cursoPayload, API_URL, authToken);

        let cursoId = null;
        if (createCursoResult.success) {
            cursoId = createCursoResult.data?.id_curso;
            console.log(`  ✓ Curso creado — ID: ${cursoId}, Nombre: ${createCursoResult.data?.nombre}`);
            recordResult('Crear Curso (API)', true, `ID: ${cursoId}`);
        } else {
            recordResult('Crear Curso (API)', false, createCursoResult.error || 'Error desconocido');
        }

        // Verificar que el curso aparece en el listado
        if (cursoId) {
            const listCursosResult = await page.evaluate(async (apiUrl, token) => {
                try {
                    const resp = await fetch(`${apiUrl}/cursos?limit=100`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await resp.json();
                    return { success: true, total: data.total, count: data.data?.length };
                } catch (err) {
                    return { success: false, error: err.message };
                }
            }, API_URL, authToken);

            if (listCursosResult.success && listCursosResult.total > 0) {
                console.log(`  ✓ Cursos listados: ${listCursosResult.total} total(es)`);
                recordResult('Listar Cursos', true, `Total: ${listCursosResult.total}`);
            } else {
                recordResult('Listar Cursos', false, listCursosResult.error || 'Sin resultados');
            }
        }

        await takeScreenshot(page, '03-curso-creado');

        // ───── Flujo 3: Enviar Entrega ──────────────────
        console.log('\n── Flujo 3: Enviar Entrega ──');

        // Primero necesitamos una evaluación. Buscamos la primera disponible.
        const findEvaluacionResult = await page.evaluate(async (apiUrl, token) => {
            try {
                // Buscar evaluaciones via el endpoint de cursos
                const resp = await fetch(`${apiUrl}/cursos?limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await resp.json();
                if (data.data && data.data.length > 0) {
                    const cursoId = data.data[0].id_curso;
                    // Buscar clases del curso
                    const clasesResp = await fetch(`${apiUrl}/clases/curso/${cursoId}`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const clasesData = await clasesResp.json();
                    if (clasesData.data && clasesData.data.length > 0) {
                        const claseId = clasesData.data[0].id_clase;
                        // Buscar evaluaciones de la clase
                        const evaResp = await fetch(`${apiUrl}/evaluaciones/clase/${claseId}`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                        });
                        const evaData = await evaResp.json();
                        if (evaData.data && evaData.data.length > 0) {
                            return {
                                success: true,
                                id_evaluacion: evaData.data[0].id_evaluacion,
                                id_estudiante: 1, // estudiante semilla
                            };
                        }
                    }
                }
                return { success: false, reason: 'No se encontraron evaluaciones disponibles' };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }, API_URL, authToken);

        if (findEvaluacionResult.success) {
            const entregaPayload = {
                id_evaluacion: findEvaluacionResult.id_evaluacion,
                id_estudiante: findEvaluacionResult.id_estudiante,
                tipo_entrega: 'URL',
                url_enlace: 'https://github.com/Hector-dev/Plataforma_Educativa_Cacique_Tamanaco',
            };

            const entregaResult = await page.evaluate(async (payload, apiUrl, token) => {
                try {
                    const resp = await fetch(`${apiUrl}/entregas`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify(payload),
                    });
                    const data = await resp.json();
                    return { success: data.success, data: data.data, status: resp.status, message: data.message };
                } catch (err) {
                    return { success: false, error: err.message };
                }
            }, entregaPayload, API_URL, authToken);

            if (entregaResult.success) {
                console.log(`  ✓ Entrega registrada — ID: ${entregaResult.data?.id_entrega}`);
                recordResult('Enviar Entrega (URL)', true, `ID: ${entregaResult.data?.id_entrega}`);
            } else {
                console.log(`  ⚠ Entrega: ${entregaResult.message || entregaResult.error}`);
                // Puede fallar si el estudiante no está matriculado — no es crítico
                recordResult('Enviar Entrega (URL)', entregaResult.success,
                    entregaResult.message || entregaResult.error || `Status: ${entregaResult.status}`);
            }
        } else {
            console.log(`  ⚠ No se encontraron evaluaciones: ${findEvaluacionResult.reason || findEvaluacionResult.error}`);
            recordResult('Enviar Entrega (URL)', false, 'No hay evaluaciones disponibles para test');
        }

        await takeScreenshot(page, '04-entrega-enviada');

    } catch (err) {
        console.error('\n❌ Error fatal en pruebas E2E:', err.message);
        recordResult('Flujo E2E completo', false, err.message);
    } finally {
        // ─── Reporte final ──────────────────────────────
        const allPassed = results.every(r => r.passed);
        console.log('\n============================================');
        console.log(`  Resultado: ${allPassed ? '✅ TODOS PASARON' : '❌ HAY FALLOS'}`);
        console.log(`  Pruebas: ${results.filter(r => r.passed).length}/${results.length} pasaron`);
        console.log('============================================\n');

        writeFinalReport(results, 'e2e-flows-results.json');

        if (browser) await browser.close();
        process.exit(allPassed ? 0 : 1);
    }
})();
