/* Genera el PNG de origen de la aplicación (sin dependencias externas). */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const S = 1024;
const SUP = 4;
const RADIO = S * 0.225;

const C_A = [91, 140, 255]; // #5b8cff
const C_B = [139, 92, 246]; // #8b5cf6

const BOLT = [
  [0.55, 0.07],
  [0.3, 0.55],
  [0.47, 0.55],
  [0.4, 0.93],
  [0.73, 0.43],
  [0.54, 0.43],
  [0.65, 0.07],
];

const BOLT_ESCALADO = BOLT.map(([x, y]) => [
  (x - 0.515) * 0.78 * S + S / 2,
  (y - 0.5) * 0.78 * S + S / 2,
]);

function dentroDePoligono(px, py, poly) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      dentro = !dentro;
    }
  }
  return dentro;
}

function enCuadroRedondeado(x, y) {
  if (x < 0 || y < 0 || x > S || y > S) return false;
  const cx = Math.min(Math.max(x, RADIO), S - RADIO);
  const cy = Math.min(Math.max(y, RADIO), S - RADIO);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= RADIO * RADIO;
}

function mezcla(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const rgba = Buffer.alloc(S * S * 4);
const paso = 1 / SUP;

for (let py = 0; py < S; py++) {
  for (let px = 0; px < S; px++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    for (let sy = 0; sy < SUP; sy++) {
      for (let sx = 0; sx < SUP; sx++) {
        const x = px + (sx + 0.5) * paso;
        const y = py + (sy + 0.5) * paso;
        if (!enCuadroRedondeado(x, y)) continue;

        const t = Math.min(1, Math.max(0, (x + y) / (2 * S)));
        let [cr, cg, cb] = mezcla(C_A, C_B, t);
        if (dentroDePoligono(x, y, BOLT_ESCALADO)) {
          cr = 255;
          cg = 255;
          cb = 255;
        }
        r += cr;
        g += cg;
        b += cb;
        a += 255;
      }
    }

    const muestras = SUP * SUP;
    const i = (py * S + px) * 4;
    if (a === 0) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      rgba[i + 3] = 0;
    } else {
      const divisor = a / 255;
      rgba[i] = Math.round(r / divisor);
      rgba[i + 1] = Math.round(g / divisor);
      rgba[i + 2] = Math.round(b / divisor);
      rgba[i + 3] = Math.round(a / muestras);
    }
  }
}

/* ------------------------------- PNG ---------------------------------- */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, datos) {
  const t = Buffer.from(tipo, 'ascii');
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, datos])), 0);
  return Buffer.concat([longitud, t, datos, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const filas = Buffer.alloc(S * (1 + S * 4));
for (let y = 0; y < S; y++) {
  const destino = y * (1 + S * 4);
  filas[destino] = 0; // filtro None
  rgba.copy(filas, destino + 1, y * S * 4, (y + 1) * S * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(filas, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync('icono-fuente.png', png);
console.log(`icono-fuente.png escrito (${png.length} bytes, ${S}x${S})`);
