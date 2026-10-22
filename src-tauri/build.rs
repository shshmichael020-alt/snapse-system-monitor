use std::path::PathBuf;

fn main() {
    // Ensure x64 WebView2Loader.dll is present for NSIS packaging
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let nsis_dll = manifest_dir.join("nsis").join("WebView2Loader.dll");

    if !nsis_dll.exists() {
        let _ = std::fs::create_dir_all(manifest_dir.join("nsis"));
        // Search cargo registry for webview2-com-sys x64 DLL
        if let Ok(home) = std::env::var("USERPROFILE") {
            let registry_src = PathBuf::from(home).join(".cargo").join("registry").join("src");
            if registry_src.exists() {
                if let Ok(entries) = std::fs::read_dir(registry_src) {
                    for entry in entries.flatten() {
                        if entry.path().is_dir() {
                            if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                                for sub in sub_entries.flatten() {
                                    let name = sub.file_name().to_string_lossy().to_string();
                                    if name.starts_with("webview2-com-sys") {
                                        let candidate = sub.path().join("x64").join("WebView2Loader.dll");
                                        if candidate.exists() {
                                            let _ = std::fs::copy(&candidate, &nsis_dll);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Ensure libunwind.dll is copied to the target output directory for NSIS packaging
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let out_path = PathBuf::from(out_dir);
        // OUT_DIR is target/.../build/snapse-.../out, so ancestor(3) is the release/debug dir
        if let Some(target_dir) = out_path.ancestors().nth(3) {
            let root_unwind = manifest_dir.join("..").join("libunwind.dll");
            if root_unwind.exists() {
                let _ = std::fs::copy(&root_unwind, target_dir.join("libunwind.dll"));
                let _ = std::fs::copy(&root_unwind, manifest_dir.join("nsis").join("libunwind.dll"));
            }
            let root_webview = manifest_dir.join("..").join("WebView2Loader.dll");
            if root_webview.exists() {
                let _ = std::fs::copy(&root_webview, target_dir.join("WebView2Loader.dll"));
            }
        }
    }

    tauri_build::build();
}
