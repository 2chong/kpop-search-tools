mod catalog;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // 테스트용: KST_CHECK_UPDATE=<결과 파일 경로> 로 실행하면 목록 업데이트 확인만 하고 종료한다
            if let Ok(path) = std::env::var("KST_CHECK_UPDATE") {
                let result = catalog::check_update_blocking(app.handle(), 20_000);
                let _ = std::fs::write(&path, result);
                std::process::exit(0);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            catalog::catalog_load,
            catalog::catalog_check_update,
            catalog::catalog_reset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
