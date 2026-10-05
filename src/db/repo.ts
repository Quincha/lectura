import { obtenerStore } from './factory';
import type {
  ConteoTipo,
  NuevaSesion,
  PuntoDiario,
  ResumenKpi,
  Sesion,
  TipoEjercicio,
} from './types';
import { claveDia, diasEntre, ahoraLocalISO, inicioRangoDias } from '@/lib/tiempo';

export interface ResumenTexto {
  textoId: string;
  mejorPpm: number | null;
  mejorEfectivo: number | null;
  intentos: number;
}

/* ----------------------------- escritura ------------------------------ */

export async function registrarSesion(entrada: NuevaSesion): Promise<number> {
  const db = await obtenerStore();
  const extras = entrada.extras ? JSON.stringify(entrada.extras) : null;

  await db.ejecutar(
    `INSERT INTO sesiones
       (fecha, tipo_ejercicio, ppm_base, comprension, ppm_efectivo,
        palabras, duracion_ms, agrupacion, extras)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entrada.fecha,
      entrada.tipo_ejercicio,
      entrada.ppm_base ?? null,
      entrada.comprension ?? null,
      entrada.ppm_efectivo ?? null,
      entrada.palabras ?? null,
      entrada.duracion_ms,
      entrada.agrupacion ?? null,
      extras,
    ],
  );

  const fila = await db.consultar<{ id: number }>('SELECT MAX(id) AS id FROM sesiones');
  return Number(fila?.[0]?.id ?? 0);
}

export interface NuevaRespuesta {
  pregunta: string;
  elegida: string;
  correcta: string;
  acierta: boolean;
}

export async function registrarRespuestas(
  sesionId: number,
  respuestas: NuevaRespuesta[],
): Promise<void> {
  if (!sesionId || respuestas.length === 0) return;
  const db = await obtenerStore();
  for (const r of respuestas) {
    await db.ejecutar(
      `INSERT INTO respuestas (sesion_id, pregunta, elegida, correcta, acierta)
       VALUES (?, ?, ?, ?, ?)`,
      [sesionId, r.pregunta, r.elegida, r.correcta, r.acierta ? 1 : 0],
    );
  }
}

export async function reiniciarHistorial(): Promise<void> {
  const db = await obtenerStore();
  await db.ejecutar('DELETE FROM respuestas');
  await db.ejecutar('DELETE FROM sesiones');
}

/* ------------------------------ lectura ------------------------------- */

export async function historial(dias = 30, limite = 500): Promise<Sesion[]> {
  const db = await obtenerStore();
  const desde = ahoraLocalISO(inicioRangoDias(dias));
  return db.consultar<Sesion>(
    `SELECT * FROM sesiones WHERE fecha >= ? ORDER BY fecha DESC LIMIT ?`,
    [desde, limite],
  );
}

export async function todasLasSesiones(limite = 1000): Promise<Sesion[]> {
  const db = await obtenerStore();
  return db.consultar<Sesion>(`SELECT * FROM sesiones ORDER BY fecha DESC LIMIT ?`, [limite]);
}

export function resumen(sesiones: Sesion[]): ResumenKpi {
  const conPpm = sesiones
    .map((s) => s.ppm_efectivo ?? s.ppm_base)
    .filter((v): v is number => typeof v === 'number');

  const comp = sesiones
    .map((s) => s.comprension)
    .filter((v): v is number => typeof v === 'number');

  return {
    sesiones: sesiones.length,
    ppmMedio: conPpm.length ? Math.round(conPpm.reduce((a, b) => a + b, 0) / conPpm.length) : null,
    mejorPpm: conPpm.length ? Math.max(...conPpm) : null,
    ultimaSesion: sesiones[0] ?? null,
    comprensionMedia: comp.length ? comp.reduce((a, b) => a + b, 0) / comp.length : null,
  };
}

export async function serieDiaria(dias = 30): Promise<PuntoDiario[]> {
  const db = await obtenerStore();
  const desde = ahoraLocalISO(inicioRangoDias(dias));

  const filas = await db.consultar<{
    dia: string;
    sesiones: number;
    ppm: number | null;
    comprension: number | null;
  }>(
    `SELECT substr(fecha, 1, 10) AS dia,
            COUNT(*) AS sesiones,
            AVG(CASE WHEN ppm_efectivo IS NOT NULL THEN ppm_efectivo ELSE ppm_base END) AS ppm,
            AVG(comprension) AS comprension
       FROM sesiones
      WHERE fecha >= ?
      GROUP BY dia
      ORDER BY dia ASC`,
    [desde],
  );

  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const inicio = inicioRangoDias(dias);
  const claves = diasEntre(inicio, new Date());

  return claves.map((dia) => {
    const f = porDia.get(dia);
    return {
      dia,
      sesiones: f ? Number(f.sesiones) : 0,
      ppm: f && f.ppm !== null ? Math.round(Number(f.ppm)) : null,
      comprension: f && f.comprension !== null ? Number(f.comprension) : null,
    };
  });
}

export async function conteoPorTipo(dias = 30): Promise<ConteoTipo[]> {
  const db = await obtenerStore();
  const desde = ahoraLocalISO(inicioRangoDias(dias));
  return db.consultar<ConteoTipo>(
    `SELECT tipo_ejercicio AS tipo, COUNT(*) AS total
       FROM sesiones
      WHERE fecha >= ?
      GROUP BY tipo_ejercicio
      ORDER BY total DESC`,
    [desde],
  );
}

export async function ultimoPpmPorTipo(dias = 90): Promise<Partial<Record<TipoEjercicio, number>>> {
  const sesiones = await historial(dias, 500);
  const resultado: Partial<Record<TipoEjercicio, number>> = {};
  for (const s of sesiones) {
    const v = s.ppm_base ?? s.ppm_efectivo;
    if (v !== null && resultado[s.tipo_ejercicio] === undefined) {
      resultado[s.tipo_ejercicio] = Math.round(v);
    }
  }
  return resultado;
}

export async function resumenTexto(textoId: string): Promise<ResumenTexto> {
  const db = await obtenerStore();
  const filas = await db.consultar<Sesion>(
    `SELECT * FROM sesiones WHERE tipo_ejercicio = 'test' ORDER BY fecha DESC LIMIT 300`,
  );
  const mias = filas.filter((s) => {
    if (!s.extras) return false;
    try {
      return JSON.parse(s.extras)?.textoId === textoId;
    } catch {
      return false;
    }
  });
  const pps = mias.map((s) => s.ppm_base).filter((v): v is number => v !== null);
  const efs = mias.map((s) => s.ppm_efectivo).filter((v): v is number => v !== null);
  return {
    textoId,
    intentos: mias.length,
    mejorPpm: pps.length ? Math.max(...pps) : null,
    mejorEfectivo: efs.length ? Math.max(...efs) : null,
  };
}

export async function mejorSchulte(): Promise<number | null> {
  const db = await obtenerStore();
  const filas = await db.consultar<Sesion>(
    `SELECT * FROM sesiones WHERE tipo_ejercicio = 'schulte' ORDER BY fecha DESC LIMIT 200`,
  );
  const tiempos = filas
    .map((s) => {
      if (!s.extras) return null;
      try {
        const t = JSON.parse(s.extras)?.tiempo_ms;
        return typeof t === 'number' ? t : null;
      } catch {
        return null;
      }
    })
    .filter((v): v is number => v !== null);
  return tiempos.length ? Math.min(...tiempos) : null;
}

/* ---------------------------- configuración --------------------------- */

export async function leerConfig(clave: string): Promise<string | null> {
  const db = await obtenerStore();
  const filas = await db.consultar<{ valor: string }>(
    'SELECT valor FROM configuracion WHERE clave = ?',
    [clave],
  );
  return filas?.[0]?.valor ?? null;
}

export async function guardarConfig(clave: string, valor: string): Promise<void> {
  const db = await obtenerStore();
  await db.ejecutar(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, valor],
  );
}

/* ------------------------------- utilidades --------------------------- */

export function etiquetaDia(dia: string): string {
  return dia.slice(8) + '/' + dia.slice(5, 7);
}

export function mismoDia(iso: string): boolean {
  return claveDia(new Date()) === iso.slice(0, 10);
}
