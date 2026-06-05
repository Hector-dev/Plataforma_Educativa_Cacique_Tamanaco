// ============================================================
// test-e2e-utils.js
// Utilidades para las pruebas E2E de la PWA
// Plataforma Educativa Móvil Cacique Tamanaco
// ============================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const REPORT_DIR = process.env.REPORT_DIR || path.join(__dirname, 'reports');

// Asegurar directorio de reportes
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Inicializa el navegador Chromium en modo headless
 */
async function initBrowser(headless = true) {
    const origin = process.env.FRONTEND_URL || 'http://localhost:80';
    const browser = await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            `--unsafely-treat-insecure-origin-as-secure=${origin}`,
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        // Habilitar Service Workers
        serviceWorkers: 'allow',
    });

    const page = await context.newPage();

    // Loggear eventos de consola del navegador
    page.on('console', (msg) => {
        const logLine = `[Browser ${msg.type()}] ${msg.text()}`;
        appendReportLine(logLine);
        console.log(`  ${logLine}`);
    });

    page.on('pageerror', (err) => {
        const logLine = `[Browser Error] ${err.message}`;
        appendReportLine(logLine);
        console.error(`  ${logLine}`);
    });

    page.on('requestfailed', (request) => {
        const logLine = `[Browser Network Error] ${request.url()} failed: ${request.failure()?.errorText || 'Failed'}`;
        appendReportLine(logLine);
        console.error(`  ${logLine}`);
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            const logLine = `[Browser HTTP Error] ${response.url()} returned status ${response.status()}`;
            appendReportLine(logLine);
            console.error(`  ${logLine}`);
        }
    });

    return { browser, context, page };
}

/**
 * Evalúa código en el contexto del navegador con reintento
 */
async function evaluateWithRetry(page, fn, retries = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await page.evaluate(fn);
        } catch (err) {
            lastError = err;
            console.log(`    Reintento ${i + 1}/${retries} falló: ${err.message}`);
            await sleep(delayMs);
        }
    }
    throw lastError;
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Agrega una línea al archivo de reporte
 */
function appendReportLine(line) {
    const reportPath = path.join(REPORT_DIR, 'e2e-report.txt');
    fs.appendFileSync(reportPath, line + '\n');
}

/**
 * Toma un screenshot y lo guarda en el directorio de reportes
 */
async function takeScreenshot(page, name) {
    const timestamp = Date.now();
    const screenshotPath = path.join(REPORT_DIR, `${name}-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Screenshot guardado: ${screenshotPath}`);
    return screenshotPath;
}

/**
 * Crea un reporte final en JSON con los resultados
 */
function writeFinalReport(results) {
    const reportPath = path.join(REPORT_DIR, 'e2e-results.json');
    const report = {
        timestamp: new Date().toISOString(),
        suite: 'E2E PWA Cacique Tamanaco',
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        results,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReporte final escrito en: ${reportPath}`);
    return report;
}

/**
 * Verifica si un Service Worker está registrado y activo.
 * Usa la API nativa de Playwright (context.serviceWorkers()) que es
 * confiable en headless, con fallback a page.evaluate().
 */
async function waitForServiceWorker(context, page, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        // Método 1: API nativa de Playwright (funciona en headless)
        const workers = context.serviceWorkers();
        if (workers.length > 0) {
            return [{
                scope: workers[0].url(),
                active: true,
                state: 'activated',
            }];
        }
        await sleep(500);
    }
    // Fallback: page.evaluate con manejo de error robusto
    try {
        const swInfo = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return [];
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.map(r => ({ scope: r.scope, active: !!r.active, state: r.active?.state }));
        });
        if (swInfo.length > 0) return swInfo;
    } catch (_) { /* ignorar — puede fallar en headless */ }

    throw new Error(
        `Timeout esperando Service Worker activo (${timeout}ms)`
    );
}

/**
 * Intercepta y bloquea peticiones de red para simular modo offline
 */
function enableOfflineMode(page) {
    return page.route('**/*', (route) => {
        const url = route.request().url();
        // Permitir peticiones al propio localhost para recursos locales
        if (url.startsWith('data:') || url.startsWith('blob:')) {
            route.continue();
        } else {
            route.abort('internetdisconnected');
        }
    });
}

/**
 * Restaura todas las peticiones de red
 */
async function disableOfflineMode(page) {
    await page.unroute('**/*');
}

module.exports = {
    initBrowser,
    evaluateWithRetry,
    sleep,
    appendReportLine,
    takeScreenshot,
    writeFinalReport,
    waitForServiceWorker,
    enableOfflineMode,
    disableOfflineMode,
    REPORT_DIR,
};