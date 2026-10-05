import { MIGRACIONES, SQL_SEMILLA_CONFIG, partirSentencias } from './schema';
import type { SqlStore } from './store';

export function esTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let promesa: Promise<SqlStore> | null = null;

export function obtenerStore(): Promise<SqlStore> {
  if (!promesa) promesa = crearStore();
  return promesa;
}

/** Solo para pruebas: reinicia el singleton. */
export function reiniciarSingleton(): void {
  promesa = null;
}

async function crearStore(): Promise<SqlStore> {
  const store: SqlStore = esTauri()
    ? await (await import('./tauriStore')).TauriStore.crear()
    : await (await import('./wasmStore')).WasmStore.crear();
  await migrar(store);
  return store;
}

async function migrar(store: SqlStore): Promise<void> {
  await store.ejecutar('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');

  const filas = await store
    .consultar<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_version')
    .catch(() => [] as { version: number | null }[]);

  let actual = Number(filas?.[0]?.version ?? 0);

  for (const m of [...MIGRACIONES].sort((a, b) => a.version - b.version)) {
    if (m.version <= actual) continue;
    for (const sentencia of partirSentencias(m.sql)) {
      await store.ejecutar(sentencia);
    }
    await store.ejecutar('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
    actual = m.version;
  }

  for (const sentencia of partirSentencias(SQL_SEMILLA_CONFIG)) {
    await store.ejecutar(sentencia);
  }
}
