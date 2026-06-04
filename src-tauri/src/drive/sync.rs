use super::client::DriveClient;

const STATE_FILE: &str = "orgalife_state.json";

pub async fn push_state(data: serde_json::Value) -> Result<(), String> {
    let client = DriveClient::new();
    client.upsert_file(STATE_FILE, &data).await?;
    Ok(())
}

pub async fn pull_state() -> Result<Option<serde_json::Value>, String> {
    let client = DriveClient::new();

    match client.find_app_file(STATE_FILE).await? {
        Some(file_id) => {
            let data = client.read_file(&file_id).await?;
            Ok(Some(data))
        }
        None => Ok(None),
    }
}
