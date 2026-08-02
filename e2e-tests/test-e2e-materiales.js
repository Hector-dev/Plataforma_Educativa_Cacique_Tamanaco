// ============================================================
// test-e2e-materiales.js
// Prueba E2E — Docente sube materiales (imagen/video) y
// estudiante los visualiza en el curso
// Plataforma Educativa Móvil Cacique Tamanaco
//
// Flujo probado:
//   1. Login como admin/docente en el navegador
//   2. Abrir el editor del curso
//   3. Crear un material en una clase
//   4. Subir una imagen (PNG) y un video (MP4) desde el editor
//   5. Verificar que el inspector muestra el tipo de recurso
//   6. Guardar el documento del curso
//   7. Login como estudiante y navegar al curso
//   8. Verificar que el material aparece con preview de imagen/video
// ============================================================

const { initBrowser, sleep, takeScreenshot, writeFinalReport, REPORT_DIR } = require('./test-e2e-utils');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:80';
const API_URL     = process.env.API_URL     || 'http://localhost:3000';
const TIMEOUT     = 30000;
const COURSE_ID   = process.env.COURSE_ID   || '1';

// ─── Configuración del test ───────────────────────────────────
const ADMIN = {
  email: 'admin@admin.com',
  password: 'admin',
};
const ESTUDIANTE = {
  email: 'teststudent@example.com',
  password: 'test1234',
};

const ASSETS = {
  png: require('path').join(__dirname, 'assets', 'material-test.png'),
  mp4: require('path').join(__dirname, 'assets', 'material-test.mp4'),
};

(async () => {
  console.log('============================================');
  console.log('  E2E — Materiales de curso (imagen/video)');
  console.log('  Cacique Tamanaco');
  console.log('============================================\n');

  const results = [];
  let browser, page;
  let urlMaterialImagen = null;
  let urlMaterialVideo = null;

  const record = (name, passed, detail = '') => {
    results.push({ name, passed, detail, timestamp: new Date().toISOString() });
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}: ${passed ? 'PASÓ' : 'FALLÓ'}${detail ? ' — ' + detail : ''}`);
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // FASE 1: Login admin en el navegador
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 1: Login admin ━━━');

    const initResult = await initBrowser(true);
    browser = initResult.browser;
    page = initResult.page;

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(1500);

    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.locator('button[type="submit"]').click();
    await sleep(3000);

    const loginOk = await page.evaluate(() => {
      const loginForm = document.querySelector('input[type="email"]');
      const autenticado = !loginForm || document.body.innerText.includes('Dashboard') ||
        document.body.innerText.includes('Bienvenido') || document.body.innerText.includes('Cursos');
      return autenticado;
    });
    record('Login admin', loginOk, loginOk ? 'Sesión iniciada' : 'Login falló');

    await takeScreenshot(page, 'm1-admin-login');

    // ═══════════════════════════════════════════════════════════
    // FASE 2: Abrir el editor del curso
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 2: Abrir editor del curso ━━━');

    await page.goto(`${FRONTEND_URL}/cursos/${COURSE_ID}/editor`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(3500);

    const editorVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Guardar') ||
             document.body.innerText.includes('Agregar Módulo') ||
             document.body.innerText.includes('Inspector');
    });
    record('Editor del curso abierto', editorVisible, editorVisible ? 'Editor renderizado' : 'No se ve el editor');
    await takeScreenshot(page, 'm2-editor');

    // Si no hay módulos, crear uno para poder agregar clases con materiales
    const tieneModulos = await page.evaluate(() => document.body.innerText.includes('📁'));
    if (!tieneModulos) {
      const btnAddModulo = page.locator('.btn-add-module').first();
      if (await btnAddModulo.count() > 0) {
        await btnAddModulo.click();
        await sleep(1000);
      }
      const btnAgregarClase = page.locator('button[title="Agregar clase a este módulo"]').first();
      if (await btnAgregarClase.count() > 0) {
        await btnAgregarClase.click();
        await sleep(1000);
      }
    }

    // Asegurar que existe al menos una clase con botón de agregar material
    const btnAgregarMaterial = page.locator('button[title="Agregar material"]').first();
    const hayBtnMaterial = await btnAgregarMaterial.count() > 0;
    record('Botón "Agregar material" disponible', hayBtnMaterial,
      hayBtnMaterial ? 'Lección lista para agregar material' : 'No hay botón 📎 (faltan módulos/clases)');

    if (!hayBtnMaterial) throw new Error('No hay lección donde agregar un material');

    // ═══════════════════════════════════════════════════════════
    // FASE 3: Crear un material y subir imagen
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 3: Crear material y subir imagen ━━━');

    await btnAgregarMaterial.click();
    await sleep(1500);

    // Seleccionar el item de material recién creado (el último agregado)
    const itemMaterial = page.locator('.item-card').last();
    if (await itemMaterial.count() > 0) {
      await itemMaterial.click();
      await sleep(800);
    }
    const itemSeleccionado = await itemMaterial.count() > 0;
    record('Item de material creado', itemSeleccionado, itemSeleccionado ? 'Seleccionado en el editor' : 'No se creó el item');

    // Subir la imagen PNG
    const fileInput = page.locator('input.material-file-input').first();
    const hayFileInput = await fileInput.count() > 0;
    record('Campo de subida visible en inspector', hayFileInput,
      hayFileInput ? 'Input file renderizado' : 'No aparece el input de archivo');

    if (!hayFileInput) throw new Error('No se encontró el input de archivo de material');

    await fileInput.setInputFiles(ASSETS.png);
    await sleep(3000);

    // Verificar que el inspector muestra el tipo detectado (imagen)
    const msgOkImagen = await page.evaluate(() => {
      const ok = document.querySelector('.material-upload-msg.ok');
      return ok ? ok.textContent?.trim() : null;
    });
    record('Imagen subida (tipo detectado)', msgOkImagen?.includes('imagen') || false,
      msgOkImagen ? `Inspector: ${msgOkImagen}` : 'No se confirmó la subida de imagen');

    // Capturar la URL del material
    urlMaterialImagen = await page.evaluate(() => {
      const sel = document.querySelector('.inspector input[ng-reflect-model]');
      const inputs = Array.from(document.querySelectorAll('.inspector input'));
      const urlInput = inputs.find((i) => (i.value || '').includes('/uploads/materiales/'));
      return urlInput ? urlInput.value : null;
    });
    record('URL del material asignada', !!urlMaterialImagen, urlMaterialImagen || 'Sin URL');

    await takeScreenshot(page, 'm3-imagen-subida');

    // ═══════════════════════════════════════════════════════════
    // FASE 4: Subir video
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 4: Subir video ━━━');

    // Agregar otro material y subir video (seleccionar el último item creado)
    const btnAgregarMaterial2 = page.locator('button[title="Agregar material"]').first();
    await btnAgregarMaterial2.click();
    await sleep(1500);
    const itemMaterial2 = page.locator('.item-card').last();
    await itemMaterial2.click();
    await sleep(800);

    const fileInput2 = page.locator('input.material-file-input').first();
    await fileInput2.setInputFiles(ASSETS.mp4);
    await sleep(3000);

    const msgOkVideo = await page.evaluate(() => {
      const ok = document.querySelector('.material-upload-msg.ok');
      return ok ? ok.textContent?.trim() : null;
    });
    record('Video subido (tipo detectado)', msgOkVideo?.includes('video') || false,
      msgOkVideo ? `Inspector: ${msgOkVideo}` : 'No se confirmó la subida de video');

    urlMaterialVideo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('.inspector input'));
      const urlInput = inputs.find((i) => (i.value || '').includes('.mp4'));
      return urlInput ? urlInput.value : null;
    });

    await takeScreenshot(page, 'm4-video-subido');

    // ═══════════════════════════════════════════════════════════
    // FASE 5: Guardar el documento del curso
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 5: Guardar documento ━━━');

    const btnGuardar = page.locator('button:has-text("💾 Guardar"), button:has-text("Guardar")').first();
    const hayBtnGuardar = await btnGuardar.count() > 0;
    if (hayBtnGuardar) {
      await btnGuardar.click();
      await sleep(4000);
    }
    const guardadoOk = await page.evaluate(() => {
      return document.body.innerText.includes('● Guardado') ||
             !document.body.innerText.includes('● Sin guardar');
    });
    record('Documento guardado', guardadoOk, guardadoOk ? 'Estado: Guardado' : 'Sigue con cambios sin guardar');

    await takeScreenshot(page, 'm5-guardado');

    // ═══════════════════════════════════════════════════════════
    // FASE 6: Verificación en BD de los materiales
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 6: Persistencia en BD ━━━');

    // Consultar la BD directamente (el login usa cookies HttpOnly, no token JWT en body)
    try {
      const dbOut = require('child_process').execSync(
        `docker exec cacique-postgres psql -U cacique_admin -d cacique_tamanaco_db -t -A -c ` +
        `"SELECT count(*) FROM materiales_curso mc JOIN clases c ON c.id_clase = mc.id_clase WHERE c.id_curso = ${COURSE_ID} AND mc.url_recurso IS NOT NULL AND mc.url_recurso != ''"`,
        { encoding: 'utf8' }
      ).trim();
      const nConUrl = parseInt(dbOut, 10) || 0;
      record('Materiales con URL en BD', nConUrl >= 2,
        `${nConUrl} material(es) con URL persistidos en materiales_curso`);
    } catch (err) {
      record('Materiales con URL en BD', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // FASE 6.5: Docente/admin ve y descarga los materiales (preview)
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 6.5: Docente visualiza materiales (preview) ━━━');

    await page.goto(`${FRONTEND_URL}/cursos/${COURSE_ID}/preview`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(4000);

    // Expandir todas las lecciones para que los items sean visibles
    await page.evaluate(() => {
      document.querySelectorAll('.lesson-header').forEach((h) => {
        const chevron = h.querySelector('.lesson-chevron');
        if (chevron && !chevron.classList.contains('rotated')) h.click();
      });
    });
    await sleep(1500);

    const botonesDocente = await page.evaluate(() => document.body.innerText);
    record('Docente: botones de material visibles',
      botonesDocente.includes('Ver video') || botonesDocente.includes('Ver imagen') || botonesDocente.includes('Descargar recurso'),
      botonesDocente.includes('Descargar recurso') ? '📄 Descargar recurso presente' :
        (botonesDocente.includes('Ver video') ? '🎬 Ver video presente' : '🖼️ Ver imagen presente'));

    await takeScreenshot(page, 'm5b-docente-materiales');

    // ═══════════════════════════════════════════════════════════
    // FASE 7: Estudiante visualiza los materiales
    // ═══════════════════════════════════════════════════════════
    console.log('\n━━━ FASE 7: Estudiante visualiza materiales ━━━');

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(1500);

    // Logout implícito: recargar limpia el estado, pero forzamos login del estudiante
    await page.evaluate(() => localStorage.clear());
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(1500);

    await page.fill('input[type="email"]', ESTUDIANTE.email);
    await page.fill('input[type="password"]', ESTUDIANTE.password);
    await page.locator('button[type="submit"]').click();
    await sleep(3000);

    const loginEstudiante = await page.evaluate(() => !document.querySelector('input[type="email"]'));
    record('Login estudiante', loginEstudiante, loginEstudiante ? 'Sesión iniciada' : 'Login falló');

    // Navegar a la vista de estudiar del curso
    await page.goto(`${FRONTEND_URL}/cursos/${COURSE_ID}/estudiar`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(4000);

    const cursoVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Clase') ||
             document.body.innerText.includes('material') ||
             document.body.innerText.includes('Ver video') ||
             document.body.innerText.includes('Ver imagen');
    });
    record('Curso visible para estudiante', cursoVisible, cursoVisible ? 'Contenido del curso renderizado' : 'No se ve el curso');

    // Expandir todas las lecciones para que los items sean visibles
    await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('.lesson-header'));
      headers.forEach((h) => {
        const btn = h;
        const chevron = btn.querySelector('.lesson-chevron');
        if (chevron && !chevron.classList.contains('rotated')) btn.click();
      });
    });
    await sleep(1500);

    // Verificar preview de imagen (elemento <img> con src de /uploads/materiales/)
    const previewImagen = await page.evaluate(() => {
      const img = document.querySelector('.material-preview img');
      return img ? (img.getAttribute('src') || '') : null;
    });
    record('Preview de imagen renderizado', !!previewImagen, previewImagen || 'Sin img de preview');

    // Verificar preview de video (elemento <video> con src de /uploads/materiales/)
    const previewVideo = await page.evaluate(() => {
      const v = document.querySelector('.material-preview video');
      return v ? (v.getAttribute('src') || '') : null;
    });
    record('Preview de video renderizado', !!previewVideo, previewVideo || 'Sin video de preview');

    // Verificar que los botones de acción cambian según el tipo
    const botones = await page.evaluate(() => document.body.innerText);
    record('Botones de acción por tipo',
      botones.includes('Ver video') && botones.includes('Ver imagen'),
      '🎬 Ver video y 🖼️ Ver imagen presentes');

    // Recuperar URLs reales de los previews renderizados
    if (previewImagen) urlMaterialImagen = previewImagen;
    if (previewVideo) urlMaterialVideo = previewVideo;

    await takeScreenshot(page, 'm6-estudiante-materiales');

    // Verificar accesibilidad del archivo vía nginx (sin auth, estático)
    if (urlMaterialImagen) {
      const resImg = await fetch(`${FRONTEND_URL}${urlMaterialImagen}`);
      record('Archivo imagen servido (nginx)', resImg.ok && (resImg.headers.get('content-type') || '').includes('image'),
        `${resImg.status} ${resImg.headers.get('content-type')}`);
    }
    if (urlMaterialVideo) {
      const resVideo = await fetch(`${FRONTEND_URL}${urlMaterialVideo}`);
      record('Archivo video servido (nginx)', resVideo.ok && (resVideo.headers.get('content-type') || '').includes('video'),
        `${resVideo.status} ${resVideo.headers.get('content-type')}`);
    }

  } catch (err) {
    console.error('ERROR FATAL:', err.message);
    record('Suite', false, 'Error fatal: ' + err.message);
    if (page) await takeScreenshot(page, 'm-error-fatal');
  } finally {
    if (browser) {
      await browser.close();
      console.log('\nNavegador cerrado.');
    }

    console.log('\n============================================');
    console.log('  RESULTADOS');
    console.log('============================================');

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`  ✅ Pasaron:  ${passed}`);
    console.log(`  ❌ Fallaron: ${failed}`);
    console.log(`  📊 Total:    ${results.length}`);
    console.log('');

    writeFinalReport(results);

    process.exit(failed > 0 ? 1 : 0);
  }
})();
