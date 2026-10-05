export const PPM_MIN = 150;
export const PPM_MAX = 1000;
export const PPM_PASO = 10;

export function limitarPpm(v: number): number {
  return Math.min(PPM_MAX, Math.max(PPM_MIN, Math.round(v / PPM_PASO) * PPM_PASO));
}

/** Palabras por minuto a partir del número de palabras y el tiempo en ms. */
export function ppmDesde(palabras: number, ms: number): number {
  if (palabras <= 0 || ms <= 0) return 0;
  const minutos = ms / 60000;
  return Math.round(palabras / minutos);
}

/** PPM efectivo = PPM × % de comprensión (null si no hubo cuestionario). */
export function ppmEfectivo(ppm: number, comprension: number | null): number | null {
  if (comprension === null || comprension === undefined) return null;
  return Math.round(ppm * comprension);
}

export function formatoPpm(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return String(Math.round(v));
}

export function formatoPorcentaje(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

/** Milisegundos entre pantallazos. */
export function intervaloMs(ppm: number, agrupacion: number): number {
  return (60000 / Math.max(50, ppm)) * Math.max(1, agrupacion);
}

/** Multiplicador de pausa natural por signos de puntuación. */
export function multiplicadorPuntuacion(palabra: string, activo: boolean): number {
  if (!activo) return 1;
  const limpia = palabra.replace(/[),\]"'»”]+$/g, '');
  if (/[.!?…]{1,}$/.test(limpia)) return 1.65;
  if (/[,:;]$/.test(limpia)) return 1.3;
  return 1;
}
