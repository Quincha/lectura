import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { SqlStore } from './store';
import type { ParametroSQL } from './types';

const NOMBRE_BBDD = 'progress.db';
const IDB_ORIGEN = 'lectura-rapida';
const IDB_ALMACEN = 'archivos';

function rutaWasm(): string {
  const base = import.meta.env.BASE_URL || './';
  return `${base}sql-wasm.wasm`;
}

/* ------------------------------ IndexedDB ------------------------------ */

function abrirIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_ORIGEN, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_ALMACEN)) {
        db.createObjectStore(IDB_ALMACEN);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB no disponible'));
  });
}

async function leerBlob(db: IDBDatabase): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_ALMACEN, 'readonly');
    const req = tx.objectStore(IDB_ALMACEN).get(NOMBRE_BBDD);
    req.onsuccess = () => {
      const v = req.result as ArrayBuffer | Uint8Array | undefined;
      if (!v) return resolve(null);
      resolve(v instanceof Uint8Array ? new Uint8Array(v) : new Uint8Array(v));
    };
    req.onerror = () => reject(req.error ?? new Error('No se pudo leer la BBDD'));
  });
}

async function escribirBlob(db: IDBDatabase, datos: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_ALMACEN, 'readwrite');
    tx.objectStore(IDB_ALMACEN).put(datos, NOMBRE_BBDD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo escribir la BBDD'));
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo escribir la BBDD'));
  });
}

/* ------------------------------- Store --------------------------------- */

export class WasmStore implements SqlStore {
  readonly motor = 'sqljs' as const;

  private constructor(
    private readonly db: Database,
    private readonly idb: IDBDatabase,
    private readonly SQL: SqlJsStatic,
  ) {}

  static async crear(): Promise<WasmStore> {
    const SQL = await initSqlJs({ locateFile: rutaWasm });
    const idb = await abrirIdb();
    const previo = await leerBlob(idb);
    const db = previo && previo.byteLength > 0 ? new SQL.Database(previo) : new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    const store = new WasmStore(db, idb, SQL);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => void store.persistir());
      window.addEventListener('beforeunload', () => void store.persistir());
    }
    return store;
  }

  async ejecutar(sql: string, params: ParametroSQL[] = []): Promise<void> {
    try {
      this.db.run(sql, params as never);
    } catch (e) {
      throw new Error(`SQL: ${(e as Error).message}`);
    }
    this.programarGuardado();
  }

  async consultar<T = Record<string, unknown>>(sql: string, params: ParametroSQL[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      const filas: T[] = [];
      while (stmt.step()) {
        filas.push(stmt.getAsObject() as T);
      }
      return filas;
    } finally {
      stmt.free();
    }
  }

  async cerrar(): Promise<void> {
    await this.persistir();
    this.db.close();
  }

  /* --------------------------- persistencia ---------------------------- */

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  private programarGuardado(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      void this.persistir();
    }, 350);
  }

  async persistir(): Promise<void> {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    try {
      const datos = this.db.export();
      await escribirBlob(this.idb, datos);
    } catch {
      /* el guardado diferido no debe romper la UI */
    }
  }

  /** Exporta la BBDD completa (para «descargar copia»). */
  exportar(): Uint8Array {
    return this.db.export();
  }

  /** Importa un volcado previo y lo deja como estado actual. */
  importar(datos: Uint8Array): void {
    this.db.run('PRAGMA foreign_keys = OFF;');
    this.db.close();
    const nueva = new this.SQL.Database(datos);
    nueva.run('PRAGMA foreign_keys = ON;');
    Object.assign(this, { db: nueva });
    this.programarGuardado();
  }
}
