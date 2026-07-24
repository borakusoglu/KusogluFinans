use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;

const DEFAULT_API_URL: &str = "https://k-depo.com/modules/kdeponumbering/api.php";
const CLIENT_HEADER: &str = "finance-desktop";

fn api_url() -> String {
    DEFAULT_API_URL.to_string()
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|error| format!("HTTP istemcisi olusturulamadi: {error}"))
}

fn parse_response(status: reqwest::StatusCode, text: &str) -> Result<Value, String> {
    let json: Value =
        serde_json::from_str(text).map_err(|error| format!("Sunucu yaniti okunamadi: {error}"))?;
    if !status.is_success() || json.get("success").and_then(Value::as_bool) == Some(false) {
        return Err(json
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Tahsilat islemi basarisiz")
            .to_string());
    }
    Ok(json)
}

async fn api_get(action: &str, extra: &[(&str, &str)]) -> Result<Value, String> {
    let mut params = vec![("action", action)];
    params.extend_from_slice(extra);
    let response = client()?
        .get(api_url())
        .header("X-Kdepo-Client", CLIENT_HEADER)
        .query(&params)
        .send()
        .await
        .map_err(|error| format!("K-Depo baglanti hatasi: {error}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Sunucu yaniti okunamadi: {error}"))?;
    parse_response(status, &text)
}

async fn api_post(action: &str, form: HashMap<String, String>) -> Result<Value, String> {
    let params = [("action", action)];
    let response = client()?
        .post(api_url())
        .header("X-Kdepo-Client", CLIENT_HEADER)
        .query(&params)
        .form(&form)
        .send()
        .await
        .map_err(|error| format!("K-Depo baglanti hatasi: {error}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Sunucu yaniti okunamadi: {error}"))?;
    parse_response(status, &text)
}

pub async fn get_collections(status: &str) -> Result<Value, String> {
    api_get("get_tahsilat_queue", &[("status", status)]).await
}

pub async fn update_collection(collection: &Value, edited_by: &str) -> Result<Value, String> {
    let mut form = HashMap::new();
    if let Some(object) = collection.as_object() {
        for (key, value) in object {
            let text = value
                .as_str()
                .map(ToString::to_string)
                .unwrap_or_else(|| value.to_string());
            form.insert(key.clone(), text);
        }
    }
    form.insert("edited_by".to_string(), edited_by.trim().to_string());
    api_post("update_tahsilat_queue", form).await
}

pub async fn delete_collection(id: u32, reason: &str, deleted_by: &str) -> Result<Value, String> {
    let mut form = HashMap::new();
    form.insert("id_tahsilat".to_string(), id.to_string());
    form.insert("delete_reason".to_string(), reason.trim().to_string());
    form.insert("deleted_by".to_string(), deleted_by.trim().to_string());
    api_post("delete_tahsilat_queue", form).await
}

pub async fn mark_printed(ids: &[u32], printed_by: &str) -> Result<Value, String> {
    let mut form = HashMap::new();
    form.insert(
        "ids".to_string(),
        serde_json::to_string(ids).map_err(|error| error.to_string())?,
    );
    form.insert("printed_by".to_string(), printed_by.trim().to_string());
    api_post("mark_tahsilat_queue_printed", form).await
}

pub async fn send_collection(id: u32, sent_by: &str) -> Result<Value, String> {
    let mut form = HashMap::new();
    form.insert("id_tahsilat".to_string(), id.to_string());
    form.insert("sent_by".to_string(), sent_by.trim().to_string());
    api_post("send_tahsilat_queue", form).await
}
