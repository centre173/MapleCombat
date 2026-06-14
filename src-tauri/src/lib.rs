use tauri_plugin_dialog::DialogExt;

#[cfg(target_os = "windows")]
fn suppress_native_window_border(window: &tauri::WebviewWindow) {
    use std::ffi::c_void;

    const DWMWA_BORDER_COLOR: u32 = 34;
    const DWMWA_COLOR_NONE: u32 = 0xFFFF_FFFE;

    #[link(name = "dwmapi")]
    unsafe extern "system" {
        fn DwmSetWindowAttribute(
            hwnd: *mut c_void,
            attribute: u32,
            value: *const c_void,
            value_size: u32,
        ) -> i32;
    }

    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    unsafe {
        DwmSetWindowAttribute(
            hwnd.0,
            DWMWA_BORDER_COLOR,
            (&DWMWA_COLOR_NONE as *const u32).cast(),
            std::mem::size_of::<u32>() as u32,
        );
    }
}

/// 與舊版 MapleCombat 相同的契約：跳出另存新檔對話框，
/// 使用者取消時回傳 Ok(false)，成功寫入回傳 Ok(true)。
#[tauri::command]
async fn save_export_file(
    app: tauri::AppHandle,
    default_file_name: String,
    contents: String,
) -> Result<bool, String> {
    // async command 在 async runtime 執行緒上跑，blocking 對話框不會卡住主執行緒
    let picked = app
        .dialog()
        .file()
        .add_filter("JSON 檔案", &["json"])
        .set_file_name(&default_file_name)
        .blocking_save_file();

    let Some(path) = picked else {
        return Ok(false);
    };
    let path = path
        .into_path()
        .map_err(|error| format!("無法取得儲存路徑：{error}"))?;
    std::fs::write(&path, contents).map_err(|error| format!("寫入檔案失敗：{error}"))?;
    Ok(true)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;

                if let Some(window) = app.get_webview_window("main") {
                    if let Some(icon) = app.default_window_icon().cloned() {
                        window.set_icon(icon)?;
                    }
                    suppress_native_window_border(&window);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![save_export_file])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
