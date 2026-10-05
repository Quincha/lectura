import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PUERTO = 4175;
const BASE = `http://localhost:${PUERTO}/`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const servidor = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PUERTO), '--strictPort'],
  { stdio: 'ignore' },
);

for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(BASE);
    if (r.ok) break;
  } catch {}
  await esperar(300);
}

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
await p.goto(BASE, { waitUntil: 'networkidle' });
await esperar(700);
await p.screenshot({ path: 'tests/fotos/01-inicio.png' });

/* ---------------- RSVP ---------------- */
await p.click('a[href="#/rsvp"]');
await esperar(400);
await p.locator('.rsvp-panel input.deslizador').first().fill('420');
await p.click('button:has-text("Reproducir")');
await esperar(900);
await p.screenshot({ path: 'tests/fotos/02-rsvp.png' });

/* Acelerar hasta el final para dejar constancia en el historial. */
await p.locator('.rsvp-panel input.deslizador').first().fill('1000');
await p.locator('.rsvp-panel .segmentado button').last().click();
await p.waitForSelector('.escenario__aviso--fin', { timeout: 40000 });
await esperar(600);

/* ---------------- TEST ---------------- */
await p.click('a[href="#/test"]');
await esperar(400);
await p.click('button:has-text("Empezar a leer")');
await esperar(700);
await p.screenshot({ path: 'tests/fotos/03-test.png' });
await esperar(1500);
await p.click('button:has-text("Terminé de leer")');
await p.waitForSelector('.pregunta');
const fieldsets = p.locator('fieldset.pregunta');
for (const [i, correcta] of [1, 2, 2].entries()) {
  await fieldsets.nth(i).locator('.opcion').nth(correcta).click();
}
await p.click('button:has-text("Comprobar respuestas")');
await p.waitForSelector('.tarjeta:has-text("Resultado")');
await p.screenshot({ path: 'tests/fotos/04-test-resultado.png' });

/* ---------------- SCHULTE ---------------- */
await p.click('a[href="#/gimnasio"]');
await esperar(400);
await p.click('button:has-text("Empezar ejercicio")');
await esperar(300);
await p.screenshot({ path: 'tests/fotos/05-schulte.png' });
for (let n = 1; n <= 25; n++) {
  for (const celda of await p.locator('.schulte-celda:not(.schulte-celda--vacia)').all()) {
    if ((await celda.innerText()).trim() === String(n)) {
      await celda.click();
      break;
    }
  }
}
await p.waitForSelector('.schulte-ok', { timeout: 15000 });
await esperar(500);

/* ---------------- SANGRÍA ---------------- */
await p.locator('.segmentado button:has-text("Sangría visual")').click();
await esperar(400);
await p.screenshot({ path: 'tests/fotos/06-sangria.png' });
await p.click('button:has-text("Empezar a leer")');
await esperar(2000);
await p.click('button:has-text("Terminé de leer")');
await esperar(700);

/* ---------------- PROGRESO ---------------- */
await p.click('a[href="#/progreso"]');
await esperar(1500);
await p.screenshot({ path: 'tests/fotos/07-progreso.png', fullPage: true });

await p.click('.sidebar__pie button');
await esperar(600);
await p.screenshot({ path: 'tests/fotos/08-claro.png' });

await navegador.close();
servidor.kill();
console.log('fotos generadas');
