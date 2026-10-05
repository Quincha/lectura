-- Migración 001 · esquema inicial de Lectura Rápida
-- Fuente única de verdad: la consume Vite (sql.js y la capa Tauri por @raw)
-- y el plugin tauri-plugin-sql en tiempo de compilación.

CREATE TABLE IF NOT EXISTS sesiones (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha          TEXT    NOT NULL,
  tipo_ejercicio TEXT    NOT NULL
                 CHECK (tipo_ejercicio IN ('rsvp','test','schulte','sangria')),
  ppm_base       REAL,
  comprension    REAL    CHECK (comprension IS NULL OR (comprension >= 0 AND comprension <= 1)),
  ppm_efectivo   REAL,
  palabras       INTEGER,
  duracion_ms    INTEGER NOT NULL,
  agrupacion     INTEGER,
  extras         TEXT
);

CREATE INDEX IF NOT EXISTS ix_sesiones_fecha ON sesiones (fecha DESC);
CREATE INDEX IF NOT EXISTS ix_sesiones_tipo  ON sesiones (tipo_ejercicio, fecha DESC);

CREATE TABLE IF NOT EXISTS respuestas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_id INTEGER NOT NULL REFERENCES sesiones (id) ON DELETE CASCADE,
  pregunta  TEXT    NOT NULL,
  elegida   TEXT    NOT NULL,
  correcta  TEXT    NOT NULL,
  acierta   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_respuestas_sesion ON respuestas (sesion_id);

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
