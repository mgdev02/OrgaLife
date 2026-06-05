use crate::auth::oauth;

const DRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";

pub struct DriveClient {
    http: reqwest::Client,
}

impl DriveClient {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    async fn token(&self) -> Result<String, String> {
        oauth::get_valid_access_token().await
    }

    pub async fn find_app_file(&self, name: &str) -> Result<Option<String>, String> {
        let token = self.token().await?;

        #[derive(serde::Deserialize)]
        struct FileList {
            files: Vec<FileEntry>,
        }
        #[derive(serde::Deserialize)]
        struct FileEntry {
            id: String,
        }

        let resp = self
            .http
            .get(DRIVE_FILES_URL)
            .bearer_auth(&token)
            .query(&[
                ("spaces", "appDataFolder"),
                ("q", &format!("name='{name}'")),
                ("fields", "files(id)"),
                ("pageSize", "1"),
            ])
            .send()
            .await
            .map_err(|e| format!("drive list error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive list failed: {body}"));
        }

        let list: FileList = resp
            .json()
            .await
            .map_err(|e| format!("drive list parse error: {e}"))?;

        Ok(list.files.into_iter().next().map(|f| f.id))
    }

    pub async fn read_file(&self, file_id: &str) -> Result<serde_json::Value, String> {
        let token = self.token().await?;

        let resp = self
            .http
            .get(format!("{DRIVE_FILES_URL}/{file_id}"))
            .bearer_auth(&token)
            .query(&[("alt", "media")])
            .send()
            .await
            .map_err(|e| format!("drive read error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive read failed: {body}"));
        }

        resp.json()
            .await
            .map_err(|e| format!("drive read parse error: {e}"))
    }

    pub async fn create_file(
        &self,
        name: &str,
        content: &serde_json::Value,
    ) -> Result<String, String> {
        let token = self.token().await?;

        let metadata = serde_json::json!({
            "name": name,
            "parents": ["appDataFolder"]
        });

        let boundary = "orgalife_boundary";
        let body = format!(
            "--{boundary}\r\n\
             Content-Type: application/json; charset=UTF-8\r\n\r\n\
             {metadata}\r\n\
             --{boundary}\r\n\
             Content-Type: application/json\r\n\r\n\
             {content}\r\n\
             --{boundary}--"
        );

        #[derive(serde::Deserialize)]
        struct Created {
            id: String,
        }

        let resp = self
            .http
            .post(DRIVE_UPLOAD_URL)
            .bearer_auth(&token)
            .query(&[("uploadType", "multipart")])
            .header(
                "Content-Type",
                format!("multipart/related; boundary={boundary}"),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("drive create error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive create failed: {body}"));
        }

        let created: Created = resp
            .json()
            .await
            .map_err(|e| format!("drive create parse error: {e}"))?;

        Ok(created.id)
    }

    pub async fn update_file(
        &self,
        file_id: &str,
        content: &serde_json::Value,
    ) -> Result<(), String> {
        let token = self.token().await?;

        let resp = self
            .http
            .patch(format!("{DRIVE_UPLOAD_URL}/{file_id}"))
            .bearer_auth(&token)
            .query(&[("uploadType", "media")])
            .header("Content-Type", "application/json")
            .json(content)
            .send()
            .await
            .map_err(|e| format!("drive update error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive update failed: {body}"));
        }

        Ok(())
    }

    pub async fn upsert_file(
        &self,
        name: &str,
        content: &serde_json::Value,
    ) -> Result<String, String> {
        match self.find_app_file(name).await? {
            Some(id) => {
                self.update_file(&id, content).await?;
                Ok(id)
            }
            None => self.create_file(name, content).await,
        }
    }

    pub async fn upload_binary(
        &self,
        name: &str,
        mime_type: &str,
        bytes: &[u8],
    ) -> Result<String, String> {
        let token = self.token().await?;

        let metadata = serde_json::json!({
            "name": name,
            "parents": ["appDataFolder"]
        });

        let boundary = "orgalife_upload_boundary";
        let mut body = Vec::new();
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        body.extend_from_slice(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.extend_from_slice(metadata.to_string().as_bytes());
        body.extend_from_slice(format!("\r\n--{boundary}\r\n").as_bytes());
        body.extend_from_slice(format!("Content-Type: {mime_type}\r\n\r\n").as_bytes());
        body.extend_from_slice(bytes);
        body.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());

        #[derive(serde::Deserialize)]
        struct Created {
            id: String,
        }

        let resp = self
            .http
            .post(DRIVE_UPLOAD_URL)
            .bearer_auth(&token)
            .query(&[("uploadType", "multipart")])
            .header(
                "Content-Type",
                format!("multipart/related; boundary={boundary}"),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("drive upload error: {e}"))?;

        if !resp.status().is_success() {
            let err_body = resp.text().await.unwrap_or_default();
            return Err(format!("drive upload failed: {err_body}"));
        }

        let created: Created = resp
            .json()
            .await
            .map_err(|e| format!("drive upload parse error: {e}"))?;

        Ok(created.id)
    }

    pub async fn download_binary(&self, file_id: &str) -> Result<Vec<u8>, String> {
        let token = self.token().await?;

        let resp = self
            .http
            .get(format!("{DRIVE_FILES_URL}/{file_id}"))
            .bearer_auth(&token)
            .query(&[("alt", "media")])
            .send()
            .await
            .map_err(|e| format!("drive download error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive download failed: {body}"));
        }

        resp.bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("drive download read error: {e}"))
    }

    pub async fn get_file_meta(&self, file_id: &str) -> Result<(String, String), String> {
        let token = self.token().await?;

        #[derive(serde::Deserialize)]
        struct Meta {
            name: String,
            #[serde(rename = "mimeType")]
            mime_type: String,
        }

        let resp = self
            .http
            .get(format!("{DRIVE_FILES_URL}/{file_id}"))
            .bearer_auth(&token)
            .query(&[("fields", "name,mimeType")])
            .send()
            .await
            .map_err(|e| format!("drive meta error: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("drive meta failed: {body}"));
        }

        let meta: Meta = resp
            .json()
            .await
            .map_err(|e| format!("drive meta parse error: {e}"))?;

        Ok((meta.name, meta.mime_type))
    }
}
