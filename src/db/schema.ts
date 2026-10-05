import sqlInicial from '../../src-tauri/migrations/001_init.sql?raw';

/**
 * Fuente única de verdad del esquema.
 * El SQL vive en `src-tauri/migrations/001_init.sql` y se importa como texto
 * tanto para sql.js (navegador) como para la capa Tauri, de modo que ambos
 * motores aplican exactamente el mismo DDL.
 */
export interface Migracion {
  version: number;
  nombre: string;
  sql: string;
}

export const MIGRACIONES: Migracion[] = [
  { version: 1, nombre: '001_init', sql: sqlInicial },
];

export const SQL_SEMILLA_CONFIG = `
INSERT INTO configuracion (clave, valor) VALUES ('tema', 'oscuro')
ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion (clave, valor) VALUES ('ppmInicial', '300')
ON CONFLICT(clave) DO NOTHING;
INSERT INTO configuracion (clave, valor) VALUES ('agrupacionInicial', '1')
ON CONFLICT(clave) DO NOTHING;
`;

/** Divide un script SQL completo en sentencias ejecutables una a una. */
export function partirSentencias(script: string): string[] {
  const limpio = script
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !l.startsWith('--'))
    .join('\n');

  const partes: string[] = [];
  let actual = '';
  let dentroComilla: string | null = null;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (dentroComilla) {
      actual += c;
      if (c === dentroComilla) dentroComilla = null;
      continue;
    }
    if (c === "'" || c === '"') {
      dentroComilla = c;
      actual += c;
      continue;
    }
    if (c === ';') {
      partes.push(actual);
      actual = '';
      continue;
    }
    actual += c;
  }
  if (actual.trim()) partes.push(actual);
  return partes.map((p) => p.trim()).filter(Boolean);
}
