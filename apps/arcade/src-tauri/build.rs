// R15K Arcade – Tauri build script: validates tauri.conf.json and the capabilities and prepares
// the context (configuration, ACL, icons, frontend assets) that tauri::generate_context! embeds.
fn main() {
    tauri_build::build();
}
