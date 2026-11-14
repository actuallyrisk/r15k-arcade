// R15K Arcade – desktop entry point. Release builds use the Windows GUI subsystem, so no console
// window opens next to the game; debug builds keep the console for log output.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    r15k_arcade_lib::run();
}
