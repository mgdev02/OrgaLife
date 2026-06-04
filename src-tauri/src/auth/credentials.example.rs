/// Plantilla de credenciales OAuth2 — NO commitear `credentials.rs` con valores reales.
///
/// Copiá este archivo:
///   cp src-tauri/src/auth/credentials.example.rs src-tauri/src/auth/credentials.rs
/// y reemplazá los placeholders con tu Client ID y Client Secret de Google Cloud.

/// Client ID de la app de escritorio (Google Cloud Console → Credenciales).
pub const GOOGLE_CLIENT_ID: &str = "TU_CLIENT_ID.apps.googleusercontent.com";

/// Client Secret de la app de escritorio (misma pantalla de credenciales).
pub const GOOGLE_CLIENT_SECRET: &str = "TU_CLIENT_SECRET";

pub const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
pub const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
pub const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v3/userinfo";

pub const SCOPES: &str = "openid email profile \
    https://www.googleapis.com/auth/drive.appdata \
    https://www.googleapis.com/auth/calendar.events.readonly";
