/* Smoke test E2E (Playwright + Chromium headless) para la SPA de Lectura Rápida. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import process from 'node:process';

const PUERTO = 4173;
const BASE = `http://localhost:${PUERTO}/`;
const pasos = [];
let fallos = 0;

function check(nombre, cond, detalle = '') {
  const ok = Boolean(cond);
  pasos.push({ nombre, ok, detalle });
  if (!ok) fallos++;
  console.log(`${ok ? '  OK  ' : ' FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function servidorListo(url, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* reintentar */
    }
    await esperar(300);
  }
  return false;
}

const servidor = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PUERTO), '--strictPort'],
  { stdio: 'ignore' },
);

try {
  if (!(await servidorListo(BASE))) {
    console.error('No se pudo arrancar `vite preview`.');
    process.exit(1);
  }

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
  const pagina = await contexto.newPage();

  const erroresConsola = [];
  pagina.on('console', (m) => {
    if (m.type() === 'error') erroresConsola.push(m.text());
  });
  pagina.on('pageerror', (e) => erroresConsola.push(`pageerror: ${e.message}`));

  /* ------------------------------ INICIO ------------------------------ */
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('h1', { timeout: 15000 });

  check(
    'Inicio: título principal en español',
    (await pagina.locator('h1').first().innerText()).includes('campo visual'),
  );
  check('Inicio: sin pantalla de error de base de datos', !(await pagina.locator('.vacio strong:has-text("No se pudo acceder")').count()));
  check('Inicio: motor SQLite declarado', (await pagina.locator('.pie__nota').innerText()).includes('sqljs'));
  check('Inicio: sidebar con 5 secciones', (await pagina.locator('.nav__enlace').count()) === 5);

  /* ------------------------------- RSVP ------------------------------- */
  await pagina.click('a[href="#/rsvp"]');
  await pagina.waitForSelector('.escenario');
  check('RSVP: escenario presente', true);

  const palabrasAntes = await pagina.locator('.escenario__contador span').first().innerText();

  // Velocidad al máximo y agrupación de 4 para terminar rápido.
  await pagina.locator('.rsvp-panel input.deslizador').first().fill('1000');
  await pagina.locator('.rsvp-panel .segmentado button').last().click();
  check('RSVP: slider acepta 1000 PPM', (await pagina.locator('.rsvp-panel .control__valor').first().innerText()).includes('1000'));

  await pagina.click('button:has-text("Reproducir")');
  await esperar(700);
  const contadorTras = await pagina.locator('.escenario__contador span').first().innerText();
  check('RSVP: avanza durante la reproducción', palabrasAntes !== contadorTras, `${palabrasAntes} → ${contadorTras}`);

  const palabraVisible = await pagina.locator('.escenario .grupo__palabra, .escenario .palabra').first().isVisible();
  check('RSVP: renderiza palabras en pantalla', palabraVisible);

  await pagina.click('button:has-text("Pausar")');
  check('RSVP: cambia a Pausar', (await pagina.locator('button:has-text("Reproducir")').count()) > 0);

  await pagina.click('button:has-text("Reproducir")');
  await pagina.waitForSelector('.escenario__aviso--fin', { timeout: 30000 });
  check('RSVP: llega al final de la lectura', true);

  /* -------------------------------- TEST ------------------------------- */
  await pagina.click('a[href="#/test"]');
  await pagina.waitForSelector('select#select-texto');
  const palabrasTexto = await pagina.locator('.kpi__valor').first().innerText();
  check('Test: muestra la longitud del texto', Number(palabrasTexto.replace(/\D/g, '')) > 100, `${palabrasTexto} palabras`);

  await pagina.click('button:has-text("Empezar a leer")');
  await esperar(1400);
  check('Test: cronómetro en marcha', /[0-9]+:[0-9]{2}/.test(await pagina.locator('.cronometro').innerText()));

  await pagina.click('button:has-text("Terminé de leer")');
  await pagina.waitForSelector('.pregunta');
  check('Test: 3 preguntas de opción múltiple', (await pagina.locator('.pregunta').count()) === 3);

  // Responder correctamente: 1ª opción correcta (índice 1), 2ª y 3ª (índice 2).
  const correctas = [1, 2, 2];
  const fieldsets = pagina.locator('fieldset.pregunta');
  for (let i = 0; i < correctas.length; i++) {
    await fieldsets.nth(i).locator('.opcion').nth(correctas[i]).click();
  }
  await pagina.click('button:has-text("Comprobar respuestas")');
  await pagina.waitForSelector('.tarjeta:has-text("Resultado")', { timeout: 10000 });
  const kpisResultado = pagina.locator('.tarjeta:has-text("Resultado") .kpi');
  check('Test: muestra PPM efectivo', (await kpisResultado.count()) === 4);

  const comp = await kpisResultado.nth(1).locator('.kpi__valor').innerText();
  check('Test: comprensión del 100% con respuestas correctas', comp.trim() === '100%', comp);

  /* ------------------------------ SCHULTE ----------------------------- */
  await pagina.click('a[href="#/gimnasio"]');
  await pagina.waitForSelector('.schulte-rejilla');
  await pagina.click('button:has-text("Empezar ejercicio")');
  await pagina.waitForSelector('.schulte-celda:not(.schulte-celda--vacia)');

  for (let n = 1; n <= 25; n++) {
    const celdas = await pagina.locator('.schulte-celda:not(.schulte-celda--vacia)').all();
    let pulsada = false;
    for (const celda of celdas) {
      const texto = (await celda.innerText()).trim();
      if (texto === String(n)) {
        await celda.click();
        pulsada = true;
        break;
      }
    }
    if (!pulsada) {
      check(`Schulte: número ${n} localizado`, false);
      break;
    }
  }
  await esperar(400);
  check('Schulte: ejercicio completado', (await pagina.locator('.schulte-ok').count()) > 0);

  /* ------------------------------- SANGRÍA ----------------------------- */
  await pagina.locator('.segmentado button:has-text("Sangría visual")').click();
  await pagina.waitForSelector('.linea');
  const lineas = await pagina.locator('.linea').count();
  const bordes = await pagina.locator('.linea__borde').count();
  check('Sangría: renderiza líneas con bordes atenuados', lineas > 5 && bordes > 0, `${lineas} líneas, ${bordes} bordes`);

  await pagina.click('button:has-text("Empezar a leer")');
  await esperar(1800);
  await pagina.click('button:has-text("Terminé de leer")');
  await esperar(500);
  check(
    'Sangría: registra lectura con resultado',
    (await pagina.locator('.kpi:has-text("Resultado")').count()) > 0,
  );

  /* ------------------------------ PROGRESO ---------------------------- */
  await pagina.click('a[href="#/progreso"]');
  await pagina.waitForSelector('.kpi', { timeout: 15000 });
  const filas = await pagina.locator('table.tabla tbody tr').count();
  check('Progreso: historial con registros', filas >= 3, `${filas} filas`);

  const graficas = await pagina.locator('.grafica svg').count();
  check('Progreso: gráficas Recharts renderizadas', graficas >= 1, `${graficas} SVG`);

  const celdasMapa = await pagina.locator('.mapa .mapa__celda').count();
  check('Progreso: mapa de actividad de 30 días', celdasMapa === 30, `${celdasMapa} celdas`);

  const ppmMedio = await pagina.locator('.kpi:has-text("PPM medio") .kpi__valor').innerText();
  check('Progreso: KPI de PPM medio numérico', /\d/.test(ppmMedio), ppmMedio);

  /* ------------------------------- TEMA -------------------------------- */
  await pagina.locator('.sidebar__pie button').click();
  const tema = await pagina.evaluate(() => document.documentElement.dataset.tema);
  check('Tema: conmutador a claro', tema === 'claro', tema);
  await esperar(1200);
  await pagina.reload({ waitUntil: 'networkidle' });
  const temaTras = await pagina.evaluate(() => document.documentElement.dataset.tema);
  check('Tema: se persiste tras recargar', temaTras === 'claro', temaTras);

  /* ---------------------------- ERRORES -------------------------------- */
  const criticos = erroresConsola.filter(
    (e) => !/favicon|Download the React DevTools|Failed to load resource.*404/i.test(e),
  );
  check('Sin errores de consola', criticos.length === 0, criticos.slice(0, 3).join(' | '));

  await navegador.close();
} catch (e) {
  fallos++;
  console.error('Excepción:', e);
} finally {
  servidor.kill();
}

console.log(`\n${pasos.filter((p) => p.ok).length}/${pasos.length} comprobaciones correctas`);
process.exit(fallos > 0 ? 1 : 0);
