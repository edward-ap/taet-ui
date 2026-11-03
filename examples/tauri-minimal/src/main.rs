#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::{json, Value};
#[tauri::command]
fn echo(window: tauri::WebviewWindow, payload: String) -> Result<Value, String> {
    if window.label() != "main" { return Err("main window only".into()); }
    if payload.len() > 2048 { return Err("payload limit: 2048 bytes".into()); }
    Ok(json!({"payload": payload, "pid": std::process::id()}))
}
fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![echo])
        .setup(|app| {
            tauri::WebviewWindowBuilder::from_config(app.handle(), &app.config().app.windows[0])?
                .on_navigation(|url| (url.scheme()=="tauri" && url.host_str()==Some("localhost") && url.port().is_none()) || (url.scheme()=="http" && url.host_str()==Some("tauri.localhost") && url.port().is_none()))
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!()).expect("build Tæt UI host");
    app.run(|_, _| {});
}
