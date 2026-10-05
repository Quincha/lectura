import { MIGRACIONES, partirSentencias } from './schema';
import type { SqlStore } from './store';
import type { ParametroSQL } from './types';

/**
 * Driver nativo disponible únicamente dentro de una ventana Tauri.
 * El import es dinámico para que el bundle de navegador no incluya la API
 * de Tauri ni falle al ejecutarse fuera del shell.
 */
export class TauriStore implements SqlStore {
  readonly motor = 'tauri-sql' as const;
  private versionActual = 0;

  private constructor(private readonly db: TauriSqlDatabase) {}

  static async crear(): Promise<TauriStore> {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    const db = (await Database.load('sqlite:progress.db')) as unknown as TauriSqlDatabase;
    await db.execute('PRAGMA foreign_keys = ON;');
    const store = new TauriStore(db);
    await store.aplicarMigraciones();
    return store;
  }

  private async aplicarMigraciones(): Promise<void> {
    await this.db.execute(
      'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)',
    );

    const filas = await this.db
      .select<{ version: number | null }[]>(
        'SELECT MAX(version) AS version FROM schema_version',
      )
      .catch(() => [] as { version: number | null }[]);

    this.versionActual = Number(filas?.[0]?.version ?? 0);

    for (const m of [...MIGRACIONES].sort((a, b) => a.version - b.version)) {
      if (m.version <= this.versionActual) continue;
      for (const sentencia of partirSentencias(m.sql)) {
        await this.db.execute(sentencia);
      }
      await this.db.execute('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
      this.versionActual = m.version;
    }

    await this.db.execute(
      `INSERT INTO configuracion (clave, valor) VALUES ('tema', 'oscuro')
       ON CONFLICT(clave) DO NOTHING`,
    ).catch(() => undefined);
    await this.db.execute(
      `INSERT INTO configuracion (clave, valor) VALUES ('ppmInicial', '300')
       ON CONFLICT(clave) DO NOTHING`,
    ).catch(() => undefined);
    await this.db.execute(
      `INSERT INTO configuracion (clave, valor) VALUES ('agrupacionInicial', '1')
       ON CONFLICT(clave) DO NOTHING`,
    ).catch(() => undefined);
  }

  async ejecutar(sql: string, params: ParametroSQL[] = []): Promise<void> {
    await this.db.execute(sql, params);
  }

  async consultar<T = Record<string, unknown>>(
    sql: string,
    params: ParametroSQL[] = [],
  ): Promise<T[]> {
    return (await this.db.select<T[]>(sql, params)) ?? [];
  }

  async cerrar(): Promise<void> {
    await this.db.close();
  }
}

interface TauriSqlDatabase {
  execute(sql: string, params?: ParametroSQL[]): Promise<unknown>;
  select<T>(sql: string, params?: ParametroSQL[]): Promise<T>;
  close(): Promise<void>;
}
