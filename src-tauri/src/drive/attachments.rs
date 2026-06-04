use super::client::DriveClient;
use base64::{engine::general_purpose::STANDARD, Engine};

pub fn safe_drive_name(original: &str) -> String {
    let clean: String = original
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .take(80)
        .collect();
    let stem = if clean.is_empty() { "comprobante" } else { clean.as_str() };
    format!("orgalife_receipt_{stem}")
}

pub async fn upload_attachment(
    file_name: &str,
    mime_type: &str,
    data_base64: &str,
) -> Result<String, String> {
    let bytes = STANDARD
        .decode(data_base64.trim())
        .map_err(|e| format!("base64 decode error: {e}"))?;

    if bytes.is_empty() {
        return Err("archivo vacío".to_string());
    }

    if bytes.len() > 25 * 1024 * 1024 {
        return Err("archivo demasiado grande (máx. 25 MB)".to_string());
    }

    let drive_name = safe_drive_name(file_name);
    let mime = if mime_type.is_empty() {
        "application/octet-stream"
    } else {
        mime_type
    };

    DriveClient::new()
        .upload_binary(&drive_name, mime, &bytes)
        .await
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentDownload {
    pub file_name: String,
    pub mime_type: String,
    pub data_base64: String,
}

pub async fn download_attachment(file_id: &str) -> Result<AttachmentDownload, String> {
    let client = DriveClient::new();
    let (name, mime) = client.get_file_meta(file_id).await.unwrap_or((
        "comprobante".to_string(),
        "application/octet-stream".to_string(),
    ));
    let bytes = client.download_binary(file_id).await?;
    Ok(AttachmentDownload {
        file_name: name,
        mime_type: mime,
        data_base64: STANDARD.encode(bytes),
    })
}
