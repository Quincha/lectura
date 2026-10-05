import { MIGRACIONES } from './schema';

export function loadSqliteMigrations() {
  return MIGRACIONES.map((m) => ({ version: m.version, sql: m.sql }));
}
