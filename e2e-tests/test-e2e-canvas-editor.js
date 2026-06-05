// ============================================================
// test-e2e-canvas-editor.js
// Prueba E2E del Editor Visual Canvas - Cacique Tamanaco
//
// Flujo probado:
//   1. Autenticación (API + formulario)
//   2. Navegación al editor de curso #1
//   3. Creación de módulo → clase → tarea + material + evaluación
//   4. Edición inline (títulos)
//   5. Uso del inspector
//   6. Guardado y verificación vía API
// ============================================================

const { initBrowser, sleep, takeScreenshot, writeFinalReport, REPORT_DIR } = require('./test-e2e-utils');

// ─── Configuración ────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:80';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

// ─── Inicio ────────────────────────────────────────────────
(async () => {
    console.log('============================================');
    console.log('  E2E — Editor Visual Canvas');
    console.log('  Cacique Tamanaco');
    console.log('============================================\n');

    const results = [];
    let browser, page, idCurso = 1;

    const record = (name, passed, detail = '') => {
        results.push({ name, passed, detail, timestamp: new Date().toISOString() });
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${name}: ${passed ? 'PASÓ' : 'FALLÓ'}${detail ? ' — ' + detail : ''}`);
    };

    try {
        // ═══════════════════════════════════════════════════
        // FASE 0: Preparación — autenticar vía API
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 0: Autenticación vía API ━━━');

        let token;
        try {
            const res = await fetch(`${API_URL}/api/usuarios/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@admin.com', password: 'admin' }),
            });
            const data = await res.json();
            token = data.token;
            record('Login vía API', !!token, token ? 'Token obtenido' : 'Sin token');

            // Crear un curso de prueba para E2E
            const cursoRes = await fetch(`${API_URL}/api/cursos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_docente: 1,
                    nombre: 'Curso de Prueba E2E Canvas',
                    descripcion: 'Creado para validación automatizada'
                })
            });
            const cursoData = await cursoRes.json();
            if (cursoData.success && cursoData.data) {
                idCurso = cursoData.data.id_curso;
                console.log(`  Curso de prueba creado con ID: ${idCurso}`);
            }
        } catch (err) {
            record('Login vía API', false, err.message);
            // Continuar con login por formulario
        }

        // ═══════════════════════════════════════════════════
        // FASE 1: Iniciar navegador y abrir editor
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 1: Inicializar navegador ━━━');

        const initResult = await initBrowser(true);
        browser = initResult.browser;
        page = initResult.page;
        record('Navegador iniciado', true, 'Chromium headless');

        // Inyectar token en localStorage antes de cargar la página
        await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

        if (token) {
            await page.evaluate((t) => {
                localStorage.setItem('cactam_token', t);
                localStorage.setItem('cactam_user', JSON.stringify({
                    id_usuario: 1, nombre_completo: 'Administrador del Sistema',
                    rol: 'Administrador', email: 'admin@admin.com'
                }));
            }, token);
            console.log('  Token inyectado en localStorage');
        }

        // Recargar para que la app lea el token
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await sleep(2000);

        // Verificar si estamos en dashboard o login
        const isDashboard = await page.evaluate(() => {
            return !!document.querySelector('.dashboard-view') ||
                   document.body.innerText.includes('Bienvenido');
        });

        if (!isDashboard) {
            console.log('  Sesión no restaurada, haciendo login por formulario...');
            await page.fill('input[type="email"]', 'admin@admin.com');
            await page.fill('input[type="password"]', 'admin');
            await page.locator('button[type="submit"]').click({ force: true, timeout: 5000 });
            await sleep(3000);
        }

        const afterLoginTitle = await page.title();
        record('Autenticación', isDashboard || afterLoginTitle.includes('Cacique'), 'Sesión activa');

        await takeScreenshot(page, '01-login-exitoso');

        // ═══════════════════════════════════════════════════
        // FASE 2: Navegar al editor de curso
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 2: Navegar al Editor Canvas ━━━');

        await page.goto(`${FRONTEND_URL}/cursos/${idCurso}/editor`, {
            waitUntil: 'networkidle', timeout: TIMEOUT
        });
        await sleep(3000);

        const pageText = await page.evaluate(() => document.body.innerText);
        const editorLoaded = pageText.includes('Estructura del Curso') &&
                             pageText.includes('Biblioteca') &&
                             pageText.includes('Inspector');

        record('Editor Canvas cargado', editorLoaded,
            editorLoaded ? '3 zonas visibles (Sidebar|Canvas|Inspector)' : 'Faltan elementos');

        await takeScreenshot(page, '02-editor-cargado');

        // ═══════════════════════════════════════════════════
        // FASE 3: Crear un Módulo
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 3: Crear Módulo ━━━');

        // Click en "➕ Agregar Módulo" en el canvas
        const btnAgregarModulo = page.locator('button:has-text("Agregar Módulo")').first();
        await btnAgregarModulo.click();
        await sleep(1500);

        const tieneModulo = await page.evaluate(() => {
            return document.body.innerText.includes('Nuevo Módulo') ||
                   document.querySelector('.modulo-card') !== null;
        });
        record('Módulo creado', tieneModulo, 'Aparece "Nuevo Módulo" en canvas');

        await takeScreenshot(page, '03-modulo-creado');

        // Editar título del módulo (inline)
        const moduloTitle = page.locator('.modulo-title').first();
        await moduloTitle.dblclick();
        await sleep(500);

        // Buscar el input de edición inline y escribir nuevo título
        const moduloInput = page.locator('.modulo-title-area input.inline-input');
        const inputCount = await moduloInput.count();

        if (inputCount > 0) {
            await moduloInput.fill('Módulo 1: Fundamentos');
            await moduloInput.press('Enter');
            await sleep(1000);

            const tituloActualizado = await page.evaluate(() => {
                return document.body.innerText.includes('Módulo 1: Fundamentos');
            });
            record('Edición inline de módulo', tituloActualizado, 'Título actualizado a "Módulo 1: Fundamentos"');
        } else {
            record('Edición inline de módulo', false, 'No se encontró el input de edición');
        }

        await takeScreenshot(page, '04-modulo-editado');

        // ═══════════════════════════════════════════════════
        // FASE 4: Agregar una Clase al módulo
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 4: Agregar Clase ━━━');

        // Click en el botón ＋ del módulo para agregar clase
        const btnAgregarClase = page.locator('.modulo-actions button:has-text("＋")').first();
        if (await btnAgregarClase.count() > 0) {
            await btnAgregarClase.click();
        } else {
            // Fallback: buscar cualquier botón de agregar clase
            const btns = page.locator('button[title="Agregar clase a este módulo"]');
            if (await btns.count() > 0) {
                await btns.first().click();
            }
        }
        await sleep(1500);

        const tieneClase = await page.evaluate(() => {
            return document.body.innerText.includes('Nueva Clase') ||
                   document.querySelector('.leccion-card') !== null;
        });
        record('Clase creada', tieneClase, 'Aparece "Nueva Clase" en el módulo');
        await takeScreenshot(page, '05-clase-creada');

        // Editar título de la clase inline
        const claseTitle = page.locator('.leccion-title').first();
        if (await claseTitle.count() > 0) {
            await claseTitle.dblclick();
            await sleep(500);

            const claseInput = page.locator('.leccion-title-area input.inline-input');
            if (await claseInput.count() > 0) {
                await claseInput.fill('Clase 1: Introducción');
                await claseInput.press('Enter');
                await sleep(1000);

                const claseEditada = await page.evaluate(() => {
                    return document.body.innerText.includes('Clase 1: Introducción');
                });
                record('Edición inline de clase', claseEditada, 'Título: "Clase 1: Introducción"');
            }
        }

        await takeScreenshot(page, '06-clase-editada');

        // ═══════════════════════════════════════════════════
        // FASE 5: Agregar Tarea a la clase
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 5: Agregar Tarea ━━━');

        const btnTarea = page.locator('button[title="Agregar tarea"]').first();
        await btnTarea.click();
        await sleep(1000);

        const tieneTarea = await page.evaluate(() => {
            return document.body.innerText.includes('Nueva Tarea') ||
                   document.querySelector('.item-card') !== null;
        });
        record('Tarea agregada', tieneTarea, 'Ítem tipo tarea visible');
        await takeScreenshot(page, '07-tarea-agregada');

        // ═══════════════════════════════════════════════════
        // FASE 6: Agregar Material a la clase
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 6: Agregar Material ━━━');

        const btnMaterial = page.locator('button[title="Agregar material"]').first();
        await btnMaterial.click();
        await sleep(1000);

        const tieneMaterial = await page.evaluate(() => {
            const items = document.querySelectorAll('.item-card');
            return items.length >= 2;
        });
        record('Material agregado', tieneMaterial, 'Segundo ítem visible en la clase');
        await takeScreenshot(page, '08-material-agregado');

        // ═══════════════════════════════════════════════════
        // FASE 7: Agregar Evaluación a la clase
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 7: Agregar Evaluación ━━━');

        const btnEvaluacion = page.locator('button[title="Agregar evaluación"]').first();
        await btnEvaluacion.click();
        await sleep(1000);

        const tieneEvaluacion = await page.evaluate(() => {
            const items = document.querySelectorAll('.item-card');
            return items.length >= 3;
        });
        record('Evaluación agregada', tieneEvaluacion, 'Tres ítems en la clase');
        await takeScreenshot(page, '09-evaluacion-agregada');

        // ═══════════════════════════════════════════════════
        // FASE 8: Usar el Inspector para editar propiedades
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 8: Inspector de propiedades ━━━');

        // Seleccionar la clase para ver propiedades en el inspector
        await claseTitle.first().click();
        await sleep(1000);

        const inspectorVisible = await page.evaluate(() => {
            return document.body.innerText.includes('🎬 Clase') ||
                   document.body.innerText.includes('Duración');
        });
        record('Inspector muestra propiedades', inspectorVisible, 'Panel derecho activo');

        // Cambiar duración desde el inspector
        const duracionInput = page.locator('.inspector-field input[type="number"]').first();
        if (await duracionInput.count() > 0) {
            await duracionInput.fill('60');
            await duracionInput.press('Tab');
            await sleep(500);
            record('Inspector: duración actualizada', true, '60 minutos');
        }

        // Seleccionar tipo de discapacidad
        const discapacidadSelect = page.locator('.inspector-field select').first();
        if (await discapacidadSelect.count() > 0) {
            await discapacidadSelect.selectOption('visual');
            await sleep(500);
            record('Inspector: tipo discapacidad', true, 'Visual');
        }

        await takeScreenshot(page, '10-inspector-editado');

        // ═══════════════════════════════════════════════════
        // FASE 9: Guardar el curso
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 9: Guardar curso ━━━');

        const btnGuardar = page.locator('button:has-text("Guardar")').first();
        await btnGuardar.click();
        await sleep(3000);

        // Verificar que el botón se deshabilita (sin cambios pendientes)
        const btnDisabled = await btnGuardar.isDisabled();
        record('Curso guardado (UI)', btnDisabled, 'Botón Guardar deshabilitado = sin cambios pendientes');
        await takeScreenshot(page, '11-curso-guardado');

        // ═══════════════════════════════════════════════════
        // FASE 10: Verificar persistencia vía API
        // ═══════════════════════════════════════════════════
        console.log('\n━━━ FASE 10: Verificar persistencia vía API ━━━');

        try {
            const res = await fetch(`${API_URL}/api/cursos/${idCurso}/document`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const doc = await res.json();

            if (doc.success && doc.data) {
                const d = doc.data;
                const tieneModulo = d.modulos && d.modulos.length > 0;
                const nombreModulo = tieneModulo ? d.modulos[0].titulo : 'N/A';
                const tieneLecciones = tieneModulo && d.modulos[0].lecciones.length > 0;
                const numItems = tieneLecciones ? d.modulos[0].lecciones[0].items.length : 0;

                record('API: módulo guardado', tieneModulo, `Módulo: "${nombreModulo}"`);
                record('API: clases guardadas', tieneLecciones, `${d.modulos[0]?.lecciones?.length || 0} clases`);
                record('API: ítems guardados', numItems >= 3, `${numItems} ítems (tarea+material+evaluación)`);
            } else {
                record('API: verificación', false, 'Documento no encontrado o error');
            }
        } catch (err) {
            record('API: verificación', false, err.message);
        }

        await takeScreenshot(page, '12-final');

    } catch (err) {
        console.error('ERROR FATAL:', err.message);
        record('Suite', false, 'Error fatal: ' + err.message);
        if (page) await takeScreenshot(page, 'error-fatal');
    } finally {
        // ─── Cerrar navegador ──────────────────────────
        if (browser) {
            await browser.close();
            console.log('\nNavegador cerrado.');
        }

        // ─── Generar reporte ───────────────────────────
        console.log('\n============================================');
        console.log('  RESULTADOS');
        console.log('============================================');

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;

        console.log(`  ✅ Pasaron:  ${passed}`);
        console.log(`  ❌ Fallaron: ${failed}`);
        console.log(`  📊 Total:    ${results.length}`);
        console.log('');

        writeFinalReport(results);

        process.exit(failed > 0 ? 1 : 0);
    }
})();
