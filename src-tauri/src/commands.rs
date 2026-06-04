use crate::auth::oauth::{self, UserProfile};
use crate::calendar::client::{self, CalendarEvent};
use crate::drive::attachments::{self, AttachmentDownload};
use crate::drive::sync;

#[tauri::command]
pub async fn auth_start_login() -> Result<UserProfile, String> {
    oauth::start_login().await
}

#[tauri::command]
pub async fn auth_check_session() -> Result<Option<UserProfile>, String> {
    oauth::check_session()
}

#[tauri::command]
pub async fn auth_logout() -> Result<(), String> {
    oauth::logout()
}

#[tauri::command]
pub async fn drive_sync_push(data: serde_json::Value) -> Result<(), String> {
    sync::push_state(data).await
}

#[tauri::command]
pub async fn drive_sync_pull() -> Result<Option<serde_json::Value>, String> {
    sync::pull_state().await
}

#[tauri::command]
pub async fn drive_upload_attachment(
    file_name: String,
    mime_type: String,
    data_base64: String,
) -> Result<String, String> {
    attachments::upload_attachment(&file_name, &mime_type, &data_base64).await
}

#[tauri::command]
pub async fn drive_download_attachment(file_id: String) -> Result<AttachmentDownload, String> {
    attachments::download_attachment(&file_id).await
}

/// `range`: `today` | `week` | `month` (calendario primary, zona horaria local).
#[tauri::command]
pub async fn fetch_calendar_events(range: String) -> Result<Vec<CalendarEvent>, String> {
    client::fetch_events(&range).await
}

/// Alias para compatibilidad: solo eventos de hoy.
#[tauri::command]
pub async fn fetch_today_events() -> Result<Vec<CalendarEvent>, String> {
    client::fetch_events("today").await
}
