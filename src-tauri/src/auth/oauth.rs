use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use super::credentials::*;
use super::keyring_store;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserProfile {
    pub email: String,
    pub name: String,
    pub picture: String,
}

#[derive(Debug, serde::Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
}

fn generate_pkce() -> (String, String) {
    let mut rng = rand::rng();
    let verifier_bytes: Vec<u8> = (0..32).map(|_| rng.random::<u8>()).collect();
    let verifier = URL_SAFE_NO_PAD.encode(&verifier_bytes);

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

    (verifier, challenge)
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OrgaLife</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0c0c0f; color: #e5e5e5;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #a3a3a3; }
</style></head>
<body><div class="card">
  <h1>Autenticacion exitosa</h1>
  <p>Podes cerrar esta ventana y volver a OrgaLife.</p>
</div></body></html>"#;

async fn extract_code_from_request(listener: TcpListener) -> Result<String, String> {
    let (mut stream, _) = listener
        .accept()
        .await
        .map_err(|e| format!("accept error: {e}"))?;

    let mut buf = vec![0u8; 4096];
    let n = stream
        .read(&mut buf)
        .await
        .map_err(|e| format!("read error: {e}"))?;

    let request = String::from_utf8_lossy(&buf[..n]);

    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or_else(|| "could not parse HTTP request".to_string())?;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n{}",
        SUCCESS_HTML
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.flush().await;
    drop(stream);

    let url = url::Url::parse(&format!("http://localhost{path}"))
        .map_err(|e| format!("url parse error: {e}"))?;

    if let Some(error) = url.query_pairs().find(|(k, _)| k == "error") {
        return Err(format!("OAuth error: {}", error.1));
    }

    url.query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.into_owned())
        .ok_or_else(|| "no auth code in callback".to_string())
}

async fn exchange_code(
    code: &str,
    redirect_uri: &str,
    verifier: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();

    let mut params = HashMap::new();
    params.insert("code", code);
    params.insert("client_id", GOOGLE_CLIENT_ID);
    params.insert("client_secret", GOOGLE_CLIENT_SECRET);
    params.insert("redirect_uri", redirect_uri);
    params.insert("grant_type", "authorization_code");
    params.insert("code_verifier", verifier);

    let resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("token request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("token exchange failed: {body}"));
    }

    resp.json::<TokenResponse>()
        .await
        .map_err(|e| format!("token parse error: {e}"))
}

async fn fetch_user_profile(access_token: &str) -> Result<UserProfile, String> {
    let client = reqwest::Client::new();

    let resp = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("userinfo request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("userinfo fetch failed: {body}"));
    }

    #[derive(serde::Deserialize)]
    struct GoogleUserInfo {
        email: Option<String>,
        name: Option<String>,
        picture: Option<String>,
    }

    let info: GoogleUserInfo = resp
        .json()
        .await
        .map_err(|e| format!("userinfo parse error: {e}"))?;

    Ok(UserProfile {
        email: info.email.unwrap_or_default(),
        name: info.name.unwrap_or_default(),
        picture: info.picture.unwrap_or_default(),
    })
}

pub async fn start_login() -> Result<UserProfile, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("bind error: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("addr error: {e}"))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{port}");
    let (verifier, challenge) = generate_pkce();

    let auth_url = format!(
        "{GOOGLE_AUTH_URL}?\
         client_id={GOOGLE_CLIENT_ID}&\
         redirect_uri={redirect_uri}&\
         response_type=code&\
         scope={}&\
         code_challenge={challenge}&\
         code_challenge_method=S256&\
         access_type=offline&\
         prompt=consent",
        urlencoded(SCOPES),
    );

    open::that(&auth_url).map_err(|e| format!("could not open browser: {e}"))?;

    let code = extract_code_from_request(listener).await?;

    let tokens = exchange_code(&code, &redirect_uri, &verifier).await?;

    let expires_at = now_secs() + tokens.expires_in;
    let refresh = tokens.refresh_token.as_deref().unwrap_or("");

    keyring_store::store_auth_tokens(&tokens.access_token, refresh, expires_at)?;

    let profile = fetch_user_profile(&tokens.access_token).await?;

    let profile_json =
        serde_json::to_string(&profile).map_err(|e| format!("profile serialize error: {e}"))?;
    keyring_store::store_token("user_profile", &profile_json)?;

    Ok(profile)
}

pub async fn refresh_access_token() -> Result<String, String> {
    let refresh_token =
        keyring_store::get_refresh_token()?.ok_or_else(|| "no refresh token stored".to_string())?;

    let client = reqwest::Client::new();

    let mut params = HashMap::new();
    params.insert("client_id", GOOGLE_CLIENT_ID);
    params.insert("client_secret", GOOGLE_CLIENT_SECRET);
    params.insert("refresh_token", refresh_token.as_str());
    params.insert("grant_type", "refresh_token");

    let resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("refresh request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("refresh failed: {body}"));
    }

    let tokens: TokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("refresh parse error: {e}"))?;

    let expires_at = now_secs() + tokens.expires_in;
    keyring_store::store_token("access_token", &tokens.access_token)?;
    keyring_store::store_token("expires_at", &expires_at.to_string())?;

    Ok(tokens.access_token)
}

/// Devuelve un access_token válido, renovándolo si expiró.
pub async fn get_valid_access_token() -> Result<String, String> {
    let token =
        keyring_store::get_access_token()?.ok_or_else(|| "not authenticated".to_string())?;

    let expires_at = keyring_store::get_expires_at()?.unwrap_or(0);

    if now_secs() >= expires_at.saturating_sub(60) {
        refresh_access_token().await
    } else {
        Ok(token)
    }
}

pub fn check_session() -> Result<Option<UserProfile>, String> {
    let profile_json = match keyring_store::get_token("user_profile")? {
        Some(v) => v,
        None => return Ok(None),
    };

    let profile: UserProfile =
        serde_json::from_str(&profile_json).map_err(|e| format!("profile parse error: {e}"))?;

    Ok(Some(profile))
}

pub fn logout() -> Result<(), String> {
    keyring_store::clear_all_tokens()
}

fn urlencoded(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
