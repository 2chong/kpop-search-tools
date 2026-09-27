//! 노래 목록(catalog.json.gz) 읽기와 온라인 업데이트.
//!
//! - 내장본: 설치 폴더의 `resources/catalog.json.gz` (tauri.conf.json bundle.resources)
//! - 내려받은 본: 앱 데이터 폴더의 `catalog/catalog.json.gz` (버전이 더 새로우면 이것을 사용)
//! - manifest: GitHub 저장소 main 브랜치의 `catalog/manifest.json` (고정 주소)
use std::io::Read;
use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

/// 목록 manifest 주소. 저장소를 만든 뒤 사용자 이름을 채운다 (tools/publish_catalog.ps1 도 같은 값을 쓴다).
pub const MANIFEST_URL: &str = "https://raw.githubusercontent.com/2chong/kpop-search-tools/main/catalog/manifest.json";
const SCHEMA: u64 = 1;

#[derive(Serialize)]
pub struct LoadResult {
    pub json: String,
    pub source: &'static str,
    pub version: String,
    pub count: u64,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum CheckResult {
    Updated { version: String, count: u64 },
    Current { version: String },
    Skipped { reason: String },
}

#[derive(Deserialize)]
struct Manifest {
    schema: u64,
    version: String,
    url: String,
    sha256: String,
    size: u64,
    count: u64,
    #[serde(default)]
    min_app_version: String,
}

#[derive(Deserialize)]
struct Head {
    schema: u64,
    version: String,
    count: u64,
}

fn gunzip(bytes: &[u8]) -> Result<String, String> {
    let mut out = String::new();
    flate2::read::GzDecoder::new(bytes).read_to_string(&mut out).map_err(|e| format!("gunzip: {e}"))?;
    Ok(out)
}

fn head_of(json: &str) -> Result<Head, String> {
    let head: Head = serde_json::from_str(json).map_err(|e| format!("json: {e}"))?;
    if head.schema != SCHEMA {
        return Err(format!("schema {} 지원 안 함", head.schema));
    }
    Ok(head)
}

/// "YYYY-MM-DD.N" 비교. 날짜 문자열 → N 정수 순.
fn version_key(v: &str) -> (String, u64) {
    let (d, n) = v.split_once('.').unwrap_or((v, "0"));
    (d.to_string(), n.parse().unwrap_or(0))
}

fn semver_key(v: &str) -> (u64, u64, u64) {
    let mut it = v.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (it.next().unwrap_or(0), it.next().unwrap_or(0), it.next().unwrap_or(0))
}

fn bundled_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resolve("resources/catalog.json.gz", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())
}

fn downloaded_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("catalog").join("catalog.json.gz"))
}

fn read_catalog(path: &PathBuf) -> Result<(String, Head), String> {
    let bytes = std::fs::read(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let json = gunzip(&bytes)?;
    let head = head_of(&json)?;
    Ok((json, head))
}

/// 내장본과 내려받은 본 중 더 새 것을 고른다. 내려받은 파일이 손상됐으면 지운다.
fn best(app: &AppHandle) -> Result<LoadResult, String> {
    let (bjson, bhead) = read_catalog(&bundled_path(app)?)?;
    let dpath = downloaded_path(app)?;
    if dpath.exists() {
        match read_catalog(&dpath) {
            Ok((djson, dhead)) if version_key(&dhead.version) > version_key(&bhead.version) => {
                return Ok(LoadResult { json: djson, source: "downloaded", version: dhead.version, count: dhead.count });
            }
            Ok(_) => {}
            Err(_) => {
                let _ = std::fs::remove_file(&dpath);
            }
        }
    }
    Ok(LoadResult { json: bjson, source: "bundled", version: bhead.version, count: bhead.count })
}

#[tauri::command]
pub fn catalog_load(app: AppHandle) -> Result<LoadResult, String> {
    best(&app)
}

#[tauri::command]
pub fn catalog_reset(app: AppHandle) -> Result<(), String> {
    let p = downloaded_path(&app)?;
    if p.exists() {
        std::fs::remove_file(&p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn check_update_impl(app: &AppHandle, timeout_ms: u64) -> Result<CheckResult, String> {
    let local = best(app)?;
    let app_version = app.package_info().version.to_string();
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .user_agent(format!("kpop-search-tools/{app_version}"))
        .build()
        .map_err(|e| e.to_string())?;
    let skip = |reason: String| Ok(CheckResult::Skipped { reason });

    let resp = match client.get(MANIFEST_URL).send() {
        Ok(r) => r,
        Err(e) => return skip(format!("manifest 요청 실패: {e}")),
    };
    if !resp.status().is_success() {
        return skip(format!("manifest HTTP {}", resp.status()));
    }
    let manifest: Manifest = match resp.text().map_err(|e| e.to_string()).and_then(|t| serde_json::from_str(&t).map_err(|e| e.to_string())) {
        Ok(m) => m,
        Err(e) => return skip(format!("manifest 형식 오류: {e}")),
    };
    if manifest.schema != SCHEMA {
        return skip(format!("manifest schema {} 지원 안 함", manifest.schema));
    }
    if !manifest.min_app_version.is_empty() && semver_key(&app_version) < semver_key(&manifest.min_app_version) {
        return skip(format!("앱 {}은(는) 목록 {}에 너무 오래됨 (필요 {})", app_version, manifest.version, manifest.min_app_version));
    }
    if version_key(&manifest.version) <= version_key(&local.version) {
        return Ok(CheckResult::Current { version: local.version });
    }
    if !manifest.url.starts_with("https://") {
        return skip("manifest url 이 https 가 아님".into());
    }
    let bytes = match client.get(&manifest.url).send().and_then(|r| r.error_for_status()).and_then(|r| r.bytes()) {
        Ok(b) => b,
        Err(e) => return skip(format!("목록 다운로드 실패: {e}")),
    };
    if bytes.len() as u64 != manifest.size {
        return skip(format!("크기 불일치 {} != {}", bytes.len(), manifest.size));
    }
    let digest = hex::encode(Sha256::digest(&bytes));
    if !digest.eq_ignore_ascii_case(&manifest.sha256) {
        return skip("sha256 불일치".into());
    }
    let json = gunzip(&bytes)?;
    let head = head_of(&json)?;
    if head.count != manifest.count || head.version != manifest.version {
        return skip("목록 내용이 manifest 와 다름".into());
    }
    let path = downloaded_path(app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("gz.tmp");
    std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(CheckResult::Updated { version: head.version, count: head.count })
}

#[tauri::command]
pub async fn catalog_check_update(app: AppHandle, timeout_ms: Option<u64>) -> Result<CheckResult, String> {
    let timeout = timeout_ms.unwrap_or(5000).clamp(1000, 60_000);
    tauri::async_runtime::spawn_blocking(move || check_update_impl(&app, timeout))
        .await
        .map_err(|e| e.to_string())?
}
