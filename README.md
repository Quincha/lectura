# Lectura Rápida · Entrenador RSVP

Aplicación **100 % local y en español** para entrenar velocidad lectora, comprensión y campo visual.

Cuatro módulos:

| Módulo | Qué entrena |
| --- | --- |
| **Motor RSVP** | Presentación serial rápida (150–1000 PPM) con agrupación de 1 a 4 palabras, anclaje óptico y pausas por puntuación |
| **Test de velocidad** | Lectura cronometrada de textos de longitud conocida + cuestionario de comprensión → **PPM efectivo = PPM × % comprensión** |
| **Gimnasio visual** | Tabla de Schulte 5×5 con punto de fijación y lectura con **sangría visual** (bordes atenuados) |
| **Progreso** | Histórico de 30 días con gráficas, mapa de constancia y tabla de sesiones |

---

## 1. Arranque rápido

```bash
npm install
npm run dev          # SPA en http://localhost:5173
npm run build        # typecheck + bundle de producción
npm run test:e2e     # build + smoke test E2E (Playwright)
```

La aplicación funciona **sin compilación nativa**: en el navegador usa SQLite real
(`sql.js`, WebAssembly) persistido en IndexedDB.

```bash
npx playwright install chromium   # una sola vez, para el smoke test
```

### Aplicación de escritorio (Tauri 2)

```bash
npm run tauri:dev
npm run tauri:build
```

> **Requisito**: el lado Rust necesita el toolchain MSVC. En Windows instala
> *Visual Studio Build Tools 2022* con la carga de trabajo **C++ de escritorio**
> (aporta `link.exe` y el Windows SDK). Hay un ayudante en
> `scripts/preparar-toolchain.ps1` (ejecutar como administrador).
> Sin él, `cargo` falla con `error: linker 'link.exe' not found` — el código
> Rust de `src-tauri/` está completo y listo para compilar en cuanto exista el enlazador.

### Regenerar el icono

```bash
npm run icono        # scripts/generar-icono.mjs + tauri icon
```

---

## 2. Estructura de carpetas

```
C:\lectura
├─ index.html / vite.config.ts / tsconfig.json
├─ icono-fuente.png                  # origen del icono (1024×1024)
├─ scripts/
│  ├─ generar-icono.mjs              # genera el PNG sin dependencias externas
│  └─ preparar-toolchain.ps1         # ayuda para instalar MSVC Build Tools
├─ tests/
│  └─ smoke.mjs                      # E2E con Playwright (25 comprobaciones)
├─ public/
│  └─ sql-wasm.wasm                  # motor SQLite para el navegador
├─ src/
│  ├─ main.tsx · App.tsx             # arranque, rutas (HashRouter) y tema
│  ├─ styles/                        # tokens (dark mode por defecto), base, componentes
│  ├─ i18n/es.ts                     # 100 % de las cadenas del interfaz
│  ├─ data/
│  │   ├─ textos.json                # 3 textos técnicos + 3 preguntas cada uno
│  │   └─ fuentes.ts                 # tipos
│  ├─ db/
│  │   ├─ schema.ts                  # importa el SQL crudo (fuente única)
│  │   ├─ store.ts                   # interfaz SqlStore
│  │   ├─ wasmStore.ts               # sql.js + autosave en IndexedDB
│  │   ├─ tauriStore.ts              # tauri-plugin-sql (import dinámico)
│  │   ├─ factory.ts                 # selección de motor + migraciones
│  │   └─ repo.ts                    # repositorio de dominio (métricas)
│  ├─ lib/                           # texto, ppm, tiempo, anclaje óptico, métricas
│  ├─ hooks/                         # useRsvp, useCronometro, useTeclado
│  ├─ components/                    # ui.tsx (Boton, Tarjeta, Deslizador…) + Shell
│  └─ modulos/
│     ├─ inicio/  rsvp/  test/  gimnasio/  progreso/
└─ src-tauri/
   ├─ Cargo.toml · build.rs · tauri.conf.json
   ├─ capabilities/default.json      # permisos sql:default
   ├─ migrations/001_init.sql        # ← fuente única del esquema
   ├─ icons/                         # generados con `tauri icon`
   └─ src/{main.rs, lib.rs}
```

---

## 3. Base de datos (SQLite)

El esquema vive **una sola vez** en `src-tauri/migrations/001_init.sql` y se
consume por dos camiones:

* `sql.js` (navegador) → `src/db/schema.ts` lo importa como texto.
* `tauri-plugin-sql` → `src-tauri/src/lib.rs` lo embebe con `include_str!`.

```sql
sesiones     (id, fecha, tipo_ejercicio, ppm_base, comprension, ppm_efectivo,
              palabras, duracion_ms, agrupacion, extras)
respuestas   (id, sesion_id → sesiones, pregunta, elegida, correcta, alcierta)
configuracion(clave PK, valor)
schema_version(version PK)          -- creado en tiempo de ejecución
```

* `fecha` se guarda en **ISO local sin desfase** (`YYYY-MM-DDTHH:mm:ss.mmm`) para
  que `substr(fecha,1,10)` agrupe por el día calendario del usuario.
* `tipo_ejercicio` está restringido a `rsvp | test | schulte | sangria`.
* `extras` es JSON libre (números/minuto en Schulte, `textoId` en los tests…).

### Repositorio (`src/db/repo.ts`)

`registrarSesion`, `registrarRespuestas`, `historial`, `serieDiaria`,
`conteoPorTipo`, `resumenTexto`, `mejorSchulte`, `resumen`, `leerConfig`,
`guardarConfig`, `reiniciarHistorial`.

---

## 4. Motor RSVP (módulo crítico)

`src/hooks/useRsvp.ts`

1. **Tokenización** — `lib/texto.ts` limpia comillas tipográficas, colapsa
   espacios/saltos y produce `string[]`.
2. **Temporizador corregido por deriva** — cada disparo se agenda sobre un
   objetivo acumulado (`objetivo += base`), nunca `ahora + base`. A 1000 PPM el
   intervalo base son 60 ms y un `setInterval` perdería milisegundos por segundo.
3. **Intervalo** — `(60 000 / ppm) × agrupacion`, multiplicado por 1,65 en signos
   de corte y 1,30 en coma/punto y coma cuando «Pausas por puntuación» está activo.
4. **Agrupación** — 1/2/3/4 palabras por fotograma; con más de una, la palabra
   central se resalta para fijar la mirada.
5. **Anclaje óptico** — la letra de fijación (40 % de la palabra) se centra con
   `translateX((anchuraDerecha − anchuraIzquierda) / 2)`, medida con `canvas`
   (`lib/metricas.ts`) para no forzar reflujo en cada fotograma.
6. **Registro** — al terminar guarda `sesión` con PPM, palabras, duración y
   agrupación. Atajos: `Espacio`, `←`, `→`, `Esc`.

---

## 5. Verificación

```bash
npm run typecheck
npm run build
npm run test:e2e
```

`tests/smoke.mjs` recorre en Chromium headless: inicio → RSVP (reproducir,
pausar, terminar) → test (cronómetro, 3 preguntas correctas, PPM efectivo) →
tabla de Schulte completa → sangría → progreso (histórico, 2 gráficas, mapa de
30 días) → cambio de tema persistido → ausencia de errores de consola.
