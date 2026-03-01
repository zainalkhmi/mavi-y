#[tauri::command]
fn get_machine_id() -> String {
    use std::process::Command;
    let output = Command::new("reg")
        .args(&["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
        .output();
    
    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            if line.contains("MachineGuid") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    return parts[parts.len() - 1].to_string();
                }
            }
        }
    }
    "UNKNOWN_HWID".to_string()
}

#[tauri::command]
fn save_project_to_documents(file_name: String, data: Vec<u8>) -> Result<String, String> {
    use std::env;
    use std::fs;
    use std::path::PathBuf;

    let user_profile = env::var("USERPROFILE").map_err(|e| format!("USERPROFILE not found: {}", e))?;

    let mut dir = PathBuf::from(user_profile);
    dir.push("Documents");
    dir.push("MAVI_Projects");

    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut file_path = dir;
    file_path.push(file_name);

    fs::write(&file_path, data).map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
struct LocalManualFile {
    name: String,
    path: String,
    size: u64,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "type")]
    file_type: String,
}

#[tauri::command]
fn list_local_manuals(app: tauri::AppHandle) -> Result<Vec<LocalManualFile>, String> {
    use std::fs;
    use std::path::PathBuf;

    let mut manuals_dir = PathBuf::from(app.path().app_data_dir().map_err(|e| format!("App data dir error: {}", e))?);
    manuals_dir.push("local_manuals");

    // Backward compatible: if app-local dir is empty/missing, fallback to project local_manuals
    if !manuals_dir.exists() {
        manuals_dir = PathBuf::from("..");
        manuals_dir.push("local_manuals");
    }

    if !manuals_dir.exists() {
        return Ok(vec![]);
    }

    let mut result = Vec::new();
    let entries = fs::read_dir(&manuals_dir).map_err(|e| format!("Failed to read local_manuals: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Directory entry error: {}", e))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let meta = fs::metadata(&path).map_err(|e| format!("Metadata read error: {}", e))?;
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid UTF-8 filename")?
            .to_string();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let created = meta.created().ok().and_then(|t| t.elapsed().ok()).map(|_| "".to_string()).unwrap_or_default();
        let modified = meta.modified().ok().and_then(|t| t.elapsed().ok()).map(|_| "".to_string()).unwrap_or_default();

        // Best effort RFC3339-ish replacement if filesystem time conversion is unavailable.
        let created_at = if created.is_empty() { "".to_string() } else { created };
        let updated_at = if modified.is_empty() { "".to_string() } else { modified };

        result.push(LocalManualFile {
            name,
            path: path.to_string_lossy().to_string(),
            size: meta.len(),
            created_at,
            updated_at,
            file_type: ext,
        });
    }

    Ok(result)
}

#[tauri::command]
fn read_local_manual_file(app: tauri::AppHandle, file_name: String) -> Result<Vec<u8>, String> {
    use std::fs;
    use std::path::PathBuf;

    let safe_file_name: String = file_name.chars().filter(|c| *c != '/' && *c != '\\').collect();
    if safe_file_name.trim().is_empty() {
        return Err("Invalid file name".to_string());
    }

    let mut manuals_dir = PathBuf::from(app.path().app_data_dir().map_err(|e| format!("App data dir error: {}", e))?);
    manuals_dir.push("local_manuals");

    if !manuals_dir.exists() {
        manuals_dir = PathBuf::from("..");
        manuals_dir.push("local_manuals");
    }

    let file_path = manuals_dir.join(safe_file_name);
    if !file_path.exists() || !file_path.is_file() {
        return Err("File not found in local_manuals".to_string());
    }

    fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn delete_local_manual(app: tauri::AppHandle, file_name: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;

    let safe_file_name: String = file_name.chars().filter(|c| *c != '/' && *c != '\\').collect();
    if safe_file_name.trim().is_empty() {
        return Err("Invalid file name".to_string());
    }

    let mut manuals_dir = PathBuf::from(app.path().app_data_dir().map_err(|e| format!("App data dir error: {}", e))?);
    manuals_dir.push("local_manuals");

    if !manuals_dir.exists() {
        manuals_dir = PathBuf::from("..");
        manuals_dir.push("local_manuals");
    }

    let file_path = manuals_dir.join(safe_file_name);
    if file_path.exists() && file_path.is_file() {
        fs::remove_file(file_path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn run_playwright_tests(handle: tauri::AppHandle, tags: Option<String>) -> Result<String, String> {
    use std::process::Command;
    use std::env;
    
    let cwd = env::current_dir().unwrap_or_default();
    let cmd = if cfg!(target_os = "windows") { "npx.cmd" } else { "npx" };
    
    // Construct arguments. If tags are provided, use --grep to filter tests.
    let mut args = vec!["playwright", "test", "--config", "playwright.config.js"];
    if let Some(ref t) = tags {
        if !t.is_empty() {
            args.push("--grep");
            args.push(t);
        }
    }
    
    // Playwright needs to run from the project root (where package.json and playwright.config.js are)
    // CWD is currently src-tauri, so we move up one level.
    let output = Command::new(cmd)
        .current_dir("..")
        .args(&args)
        .output();
    
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(format!("Tests passed!\nCWD: {:?}\nTags: {:?}\n\n{}", cwd, tags, stdout))
            } else {
                Err(format!("Tests failed or errored!\nCWD: {:?}\nTags: {:?}\n\nSTDOUT:\n{}\n\nSTDERR:\n{}", cwd, tags, stdout, stderr))
            }
        },
        Err(e) => Err(format!("Failed to execute process: {}\nCWD: {:?}\nTags: {:?}", e, cwd, tags))
    }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      get_machine_id,
      run_playwright_tests,
      save_project_to_documents,
      list_local_manuals,
      read_local_manual_file,
      delete_local_manual
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
