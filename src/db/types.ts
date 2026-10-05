export type TipoEjercicio = 'rsvp' | 'test' | 'schulte' | 'sangria';

export type ParametroSQL = string | number | null;

export interface Sesion {
  id: number;
  fecha: string;
  tipo_ejercicio: TipoEjercicio;
  ppm_base: number | null;
  comprension: number | null;
  ppm_efectivo: number | null;
  palabras: number | null;
  duracion_ms: number;
  agrupacion: number | null;
  extras: string | null;
}

export interface Respuesta {
  id: number;
  sesion_id: number;
  pregunta: string;
  elegida: string;
  correcta: string;
  acierta: number;
}

export interface NuevaSesion {
  fecha: string;
  tipo_ejercicio: TipoEjercicio;
  ppm_base?: number | null;
  comprension?: number | null;
  ppm_efectivo?: number | null;
  palabras?: number | null;
  duracion_ms: number;
  agrupacion?: number | null;
  extras?: Record<string, unknown> | null;
}

export interface ResumenKpi {
  sesiones: number;
  ppmMedio: number | null;
  mejorPpm: number | null;
  ultimaSesion: Sesion | null;
  comprensionMedia: number | null;
}

export interface PuntoDiario {
  dia: string;
  ppm: number | null;
  comprension: number | null;
  sesiones: number;
}

export interface ConteoTipo {
  tipo: TipoEjercicio;
  total: number;
}
