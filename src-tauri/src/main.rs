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
    .invoke_handler(tauri::generate_handler![get_machine_id, run_playwright_tests, save_project_to_documents])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
