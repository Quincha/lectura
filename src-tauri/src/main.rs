// Evita que Windows abra una consola negra junto a la aplicación.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lectura_rapida_lib::run();
}
