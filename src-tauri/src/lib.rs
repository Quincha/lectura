use tauri_plugin_sql::{Migration, MigrationKind};

/// Migraciones aplicadas por `tauri-plugin-sql` al abrir `progress.db`.
///
/// El SQL se incluye desde `src-tauri/migrations/001_init.sql`, que es el mismo
/// archivo que la capa web importa como texto (`src/db/schema.ts`), de modo que
/// ambos motores comparten una única fuente de verdad del esquema.
fn migraciones() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "esquema inicial: sesiones, respuestas y configuración",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:progress.db", migraciones())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
