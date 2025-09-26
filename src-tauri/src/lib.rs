use std::fs;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use reqwest;
use base64::{prelude::BASE64_STANDARD, Engine};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![save_memory, minimax_tts])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Serialize, Deserialize)]
struct MinimaxTTSRequest {
    model: String,
    text: String,
    voice_setting: VoiceSetting,
    audio_setting: AudioSetting,
}

#[derive(Serialize, Deserialize)]
struct VoiceSetting {
    voice_id: String,
    speed: f32,
    vol: f32,
    pitch: i32,
}

#[derive(Serialize, Deserialize)]
struct AudioSetting {
    sample_rate: u32,
    bitrate: u32,
    format: String,
}

#[derive(Serialize, Deserialize)]
struct MinimaxTTSResponse {
    audio: Vec<u8>,
}

#[tauri::command]
async fn minimax_tts(
    api_key: String,
    group_id: String,
    model: String,
    text: String,
    voice_id: String,
    speed: f32,
    volume: f32,
    pitch: i32,
    sample_rate: u32,
    audio_format: String,
) -> Result<MinimaxTTSResponse, String> {
    let client = reqwest::Client::new();
    
    let request_body = MinimaxTTSRequest {
        model,
        text,
        voice_setting: VoiceSetting {
            voice_id,
            speed,
            vol: volume,
            pitch,
        },
        audio_setting: AudioSetting {
            sample_rate,
            bitrate: 128000,
            format: audio_format,
        },
    };

    let response = client
        .post("https://api.minimaxi.com/v1/t2a_v2")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("GroupId", group_id)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
        return Err(format!("MiniMax API 错误 {}: {}", status, error_text));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 提取音频数据
    let audio_base64 = response_json
        .get("data")
        .and_then(|data| data.get("audio"))
        .and_then(|audio| audio.as_str())
        .ok_or("响应中未找到音频数据")?;

    // 解码 base64 音频数据
    let audio_bytes = BASE64_STANDARD.decode(audio_base64)
        .map_err(|e| format!("base64 解码失败: {}", e))?;

    Ok(MinimaxTTSResponse {
        audio: audio_bytes,
    })
}

#[tauri::command]
fn save_memory(path: &str, data: String) -> Result<String, String> {
    match fs::write(path, data) {
        Ok(_) => Ok(path.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn show_window(app: &AppHandle) {
    let windows = app.webview_windows();

    windows
        .values()
        .next()
        .expect("Sorry, no window found")
        .set_focus()
        .expect("Can't Bring Window to Focus");
}
