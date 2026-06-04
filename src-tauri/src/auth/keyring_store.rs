use keyring::Entry;

const SERVICE: &str = "com.orgalife.app";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| format!("keyring init error: {e}"))
}

pub fn store_token(key: &str, value: &str) -> Result<(), String> {
    entry(key)?
        .set_password(value)
        .map_err(|e| format!("keyring store error: {e}"))
}

pub fn get_token(key: &str) -> Result<Option<String>, String> {
    match entry(key)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("keyring read error: {e}")),
    }
}

pub fn delete_token(key: &str) -> Result<(), String> {
    match entry(key)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("keyring delete error: {e}")),
    }
}

pub fn store_auth_tokens(
    access_token: &str,
    refresh_token: &str,
    expires_at: u64,
) -> Result<(), String> {
    store_token("access_token", access_token)?;
    store_token("refresh_token", refresh_token)?;
    store_token("expires_at", &expires_at.to_string())?;
    Ok(())
}

pub fn get_access_token() -> Result<Option<String>, String> {
    get_token("access_token")
}

pub fn get_refresh_token() -> Result<Option<String>, String> {
    get_token("refresh_token")
}

pub fn get_expires_at() -> Result<Option<u64>, String> {
    match get_token("expires_at")? {
        Some(v) => v
            .parse::<u64>()
            .map(Some)
            .map_err(|e| format!("invalid expires_at: {e}")),
        None => Ok(None),
    }
}

pub fn clear_all_tokens() -> Result<(), String> {
    delete_token("access_token")?;
    delete_token("refresh_token")?;
    delete_token("expires_at")?;
    delete_token("user_profile")?;
    Ok(())
}
