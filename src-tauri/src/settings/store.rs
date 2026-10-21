use std::fs;
use std::path::PathBuf;
use crate::models::AppSettings;

pub struct SettingsManager {
    file_path: PathBuf,
    settings: AppSettings,
}

impl SettingsManager {
    pub fn new() -> Self {
        let app_dir = dirs_or_local();
        let file_path = app_dir.join("settings.json");
        let settings = Self::load_from_path(&file_path).unwrap_or_default();
        Self {
            file_path,
            settings,
        }
    }

    fn load_from_path(path: &PathBuf) -> Option<AppSettings> {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if let Ok(settings) = serde_json::from_str(&content) {
                    return Some(settings);
                }
            }
        }
        None
    }

    pub fn get(&self) -> AppSettings {
        self.settings.clone()
    }

    pub fn save(&mut self, new_settings: AppSettings) -> Result<(), String> {
        self.settings = new_settings;
        if let Some(parent) = self.file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let serialized = serde_json::to_string_pretty(&self.settings)
            .map_err(|e| format!("Serialization error: {}", e))?;
        fs::write(&self.file_path, serialized)
            .map_err(|e| format!("Failed to write settings to {}: {}", self.file_path.display(), e))?;
        Ok(())
    }
}

fn dirs_or_local() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("Snapse")
    } else {
        PathBuf::from(".snapse")
    }
}
