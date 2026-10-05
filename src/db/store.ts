import type { ParametroSQL } from './types';

/**
 * Abstracción mínima sobre el motor SQLite subyacente.
 * Dos implementaciones: sql.js (WASM) y tauri-plugin-sql (nativo).
 */
export interface SqlStore {
  readonly motor: 'sqljs' | 'tauri-sql';
  ejecutar(sql: string, params?: ParametroSQL[]): Promise<void>;
  consultar<T = Record<string, unknown>>(sql: string, params?: ParametroSQL[]): Promise<T[]>;
  cerrar(): Promise<void>;
}
