use chrono::Utc;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

type Result<T> = std::result::Result<T, String>;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    id: String,
    title: String,
    description: Option<String>,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    storage_kind: String,
    #[serde(default)]
    file_path: String,
    #[serde(default)]
    content_hash: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Bibliography {
    metadata: Metadata,
    data: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    suggested_id: String,
    suggested_title: String,
    data: Value,
    source_path: String,
    source_format: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    app_data_directory: String,
    managed_bibliographies_directory: String,
    recovery_directory: String,
    database_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryItem {
    id: i64,
    bibliography_id: String,
    original_path: String,
    snapshot_path: String,
    created_at: String,
    reason: String,
    storage_kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    recovery_id: Option<i64>,
}

fn directories(app: &AppHandle) -> Result<(PathBuf, PathBuf, PathBuf, PathBuf)> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok((
        root.clone(),
        root.join("bibliographies"),
        root.join("recovery"),
        root.join("hayman.sqlite3"),
    ))
}

pub fn initialize(app: &AppHandle) -> Result<()> {
    let (_, managed, recovery, database) = directories(app)?;
    fs::create_dir_all(managed).map_err(|e| e.to_string())?;
    fs::create_dir_all(recovery).map_err(|e| e.to_string())?;
    let db = Connection::open(database).map_err(|e| e.to_string())?;
    db.execute_batch(
        "PRAGMA journal_mode=WAL;
       CREATE TABLE IF NOT EXISTS bibliographies(
         id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
         storage_kind TEXT NOT NULL CHECK(storage_kind IN ('managed','linked')),
         file_path TEXT NOT NULL UNIQUE, content_hash TEXT NOT NULL,
         created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
       CREATE TABLE IF NOT EXISTS recovery(
         id INTEGER PRIMARY KEY, bibliography_id TEXT NOT NULL,
         original_path TEXT NOT NULL, snapshot_path TEXT NOT NULL,
         content_hash TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL,
         storage_kind TEXT NOT NULL DEFAULT '', title TEXT, description TEXT);
       CREATE TABLE IF NOT EXISTS settings(
         id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);",
    )
    .map_err(|e| e.to_string())?;
    // Existing desktop profiles predate the recovery metadata required to
    // distinguish relinking from restoring file contents.
    for migration in [
        "ALTER TABLE recovery ADD COLUMN storage_kind TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE recovery ADD COLUMN title TEXT",
        "ALTER TABLE recovery ADD COLUMN description TEXT",
    ] {
        if let Err(error) = db.execute(migration, []) {
            if !error.to_string().contains("duplicate column name") {
                return Err(error.to_string());
            }
        }
    }
    Ok(())
}

fn db(app: &AppHandle) -> Result<Connection> {
    Connection::open(directories(app)?.3).map_err(|e| e.to_string())
}

fn digest(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn parse_yaml(content: &str) -> Result<Value> {
    hayagriva::io::from_yaml_str(content)
        .map_err(|e| format!("Hayagriva rejected this bibliography: {e}"))?;
    serde_yaml::from_str(content).map_err(|e| format!("Invalid YAML: {e}"))
}

fn serialize_yaml(data: &Value) -> Result<String> {
    let content = serde_yaml::to_string(data).map_err(|e| e.to_string())?;
    parse_yaml(&content)?;
    Ok(content)
}

fn parse_import(content: &str, extension: &str) -> Result<Value> {
    match extension {
        "yml" | "yaml" => parse_yaml(content),
        "bib" => {
            let library = hayagriva::io::from_biblatex_str(content)
                .map_err(|e| format!("Could not import BibTeX/BibLaTeX: {e:?}"))?;
            let entries: serde_json::Map<String, Value> = library
                .iter()
                .map(|entry| {
                    serde_json::to_value(entry)
                        .map(|value| (entry.key().to_owned(), value))
                        .map_err(|e| e.to_string())
                })
                .collect::<Result<_>>()?;
            parse_yaml(&serde_yaml::to_string(&Value::Object(entries)).map_err(|e| e.to_string())?)
        }
        _ => Err("Choose a .bib, .yml, or .yaml bibliography file.".into()),
    }
}

fn row_metadata(row: &rusqlite::Row<'_>) -> rusqlite::Result<Metadata> {
    Ok(Metadata {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        storage_kind: row.get(3)?,
        file_path: row.get(4)?,
        content_hash: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

const SELECT: &str = "SELECT id,title,description,storage_kind,file_path,content_hash,created_at,updated_at FROM bibliographies";

fn metadata(db: &Connection, id: &str) -> Result<Metadata> {
    db.query_row(&format!("{SELECT} WHERE id=?1"), [id], row_metadata)
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Bibliography '{id}' was not found."))
}

fn read(mut metadata: Metadata) -> Result<Bibliography> {
    let content = fs::read_to_string(&metadata.file_path)
        .map_err(|e| format!("Could not read {}: {e}", metadata.file_path))?;
    metadata.content_hash = digest(content.as_bytes());
    Ok(Bibliography {
        metadata,
        data: parse_yaml(&content)?,
    })
}

fn safe_id(input: &str) -> String {
    let mut out = String::new();
    for c in input.chars().flat_map(char::to_lowercase) {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.is_empty() && !out.ends_with('-') {
            out.push('-');
        }
    }
    out.trim_matches('-').to_owned()
}

fn unique_id(db: &Connection, stem: &str) -> Result<String> {
    let base = if stem.is_empty() {
        "bibliography"
    } else {
        stem
    };
    for n in 1..10_000 {
        let id = if n == 1 {
            base.into()
        } else {
            format!("{base}-{n}")
        };
        let exists: bool = db
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM bibliographies WHERE id=?1)",
                [&id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if !exists {
            return Ok(id);
        }
    }
    Err("Could not allocate a unique bibliography ID.".into())
}

fn insert(db: &Connection, m: &Metadata) -> Result<()> {
    db.execute(
        "INSERT INTO bibliographies VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        params![
            m.id,
            m.title,
            m.description,
            m.storage_kind,
            m.file_path,
            m.content_hash,
            m.created_at,
            m.updated_at
        ],
    )
    .map_err(|e| format!("Could not register bibliography: {e}"))?;
    Ok(())
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<()> {
    let parent = path
        .parent()
        .ok_or("The bibliography has no parent directory.")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(
        ".{}.hayman-tmp",
        path.file_name().unwrap_or_default().to_string_lossy()
    ));
    let mut file = File::create(&temporary).map_err(|e| e.to_string())?;
    file.write_all(content).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    if !path.exists() {
        return fs::rename(temporary, path).map_err(|e| e.to_string());
    }

    let displaced = parent.join(format!(
        ".{}.hayman-replaced",
        path.file_name().unwrap_or_default().to_string_lossy()
    ));
    if displaced.exists() {
        fs::remove_file(&displaced).map_err(|e| e.to_string())?;
    }
    fs::rename(path, &displaced).map_err(|e| e.to_string())?;
    if let Err(error) = fs::rename(&temporary, path) {
        let _ = fs::rename(&displaced, path);
        return Err(error.to_string());
    }
    fs::remove_file(displaced).map_err(|e| e.to_string())
}

fn snapshot(
    db: &Connection,
    recovery: &Path,
    m: &Metadata,
    reason: &str,
) -> Result<Option<(PathBuf, i64)>> {
    if !Path::new(&m.file_path).exists() {
        return Ok(None);
    }
    let stamp = Utc::now().format("%Y%m%dT%H%M%S%.3fZ");
    let target = recovery.join(format!("{}-{stamp}-{reason}.yml", m.id));
    fs::copy(&m.file_path, &target)
        .map_err(|e| format!("Could not create recovery snapshot: {e}"))?;
    db.execute(
    "INSERT INTO recovery(bibliography_id,original_path,snapshot_path,content_hash,created_at,reason,storage_kind,title,description) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
    params![m.id,m.file_path,target.to_string_lossy(),m.content_hash,Utc::now().to_rfc3339(),reason,m.storage_kind,m.title,m.description]
  ).map_err(|e| e.to_string())?;
    Ok(Some((target, db.last_insert_rowid())))
}

#[tauri::command]
pub fn storage_info(app: AppHandle) -> Result<StorageInfo> {
    let (root, managed, recovery, database) = directories(&app)?;
    Ok(StorageInfo {
        app_data_directory: root.to_string_lossy().into_owned(),
        managed_bibliographies_directory: managed.to_string_lossy().into_owned(),
        recovery_directory: recovery.to_string_lossy().into_owned(),
        database_path: database.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn list_bibliographies(app: AppHandle) -> Result<Vec<Bibliography>> {
    let db = db(&app)?;
    let mut statement = db
        .prepare(&format!("{SELECT} ORDER BY updated_at DESC"))
        .map_err(|e| e.to_string())?;
    statement
        .query_map([], row_metadata)
        .map_err(|e| e.to_string())?
        .map(|m| m.map_err(|e| e.to_string()).and_then(read))
        .collect()
}

#[tauri::command]
pub fn get_bibliography(app: AppHandle, id: String) -> Result<Bibliography> {
    read(metadata(&db(&app)?, &id)?)
}

#[tauri::command]
pub fn create_managed_bibliography(
    app: AppHandle,
    bibliography: Bibliography,
) -> Result<Bibliography> {
    let id = &bibliography.metadata.id;
    if id.is_empty() || id == "new" || safe_id(id) != *id {
        return Err(
            "The ID must contain lowercase letters, numbers, and single hyphens only.".into(),
        );
    }
    let content = serialize_yaml(&bibliography.data)?;
    let (_, managed, _, _) = directories(&app)?;
    let path = managed.join(format!("{id}.yml"));
    if path.exists() {
        return Err("A managed bibliography file with this ID already exists.".into());
    }
    let db = db(&app)?;
    let now = Utc::now().to_rfc3339();
    let m = Metadata {
        id: id.clone(),
        title: bibliography.metadata.title,
        description: bibliography.metadata.description,
        created_at: now.clone(),
        updated_at: now,
        storage_kind: "managed".into(),
        file_path: path.to_string_lossy().into_owned(),
        content_hash: digest(content.as_bytes()),
    };
    atomic_write(&path, content.as_bytes())?;
    if let Err(e) = insert(&db, &m) {
        let _ = fs::remove_file(path);
        return Err(e);
    }
    read(m)
}

#[tauri::command]
pub fn link_bibliography(app: AppHandle, path: String) -> Result<Bibliography> {
    let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    let ext = path
        .extension()
        .and_then(|x| x.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !matches!(ext.as_str(), "yml" | "yaml") {
        return Err("Only .yml or .yaml files can be linked.".into());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data = parse_yaml(&content)?;
    let db = db(&app)?;
    let path_text = path.to_string_lossy().into_owned();
    if let Some(id) = db
        .query_row(
            "SELECT id FROM bibliographies WHERE file_path=?1",
            [&path_text],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return get_bibliography(app, id);
    }
    let stem = path
        .file_stem()
        .and_then(|x| x.to_str())
        .unwrap_or("bibliography");
    let now = Utc::now().to_rfc3339();
    let m = Metadata {
        id: unique_id(&db, &safe_id(stem))?,
        title: stem.replace(['-', '_'], " "),
        description: None,
        created_at: now.clone(),
        updated_at: now,
        storage_kind: "linked".into(),
        file_path: path_text,
        content_hash: digest(content.as_bytes()),
    };
    insert(&db, &m)?;
    Ok(Bibliography { metadata: m, data })
}

#[tauri::command]
pub fn import_bibliography_file(path: String) -> Result<ImportResult> {
    let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let ext = path
        .extension()
        .and_then(|x| x.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let data = parse_import(&content, &ext)?;
    let stem = path
        .file_stem()
        .and_then(|x| x.to_str())
        .unwrap_or("bibliography");
    Ok(ImportResult {
        suggested_id: safe_id(stem),
        suggested_title: stem.replace(['-', '_'], " "),
        data,
        source_path: path.to_string_lossy().into_owned(),
        source_format: ext,
    })
}

#[tauri::command]
pub fn save_bibliography(
    app: AppHandle,
    bibliography: Bibliography,
    expected_hash: String,
) -> Result<Bibliography> {
    let db = db(&app)?;
    let current = metadata(&db, &bibliography.metadata.id)?;
    let disk = fs::read(&current.file_path).map_err(|e| e.to_string())?;
    if digest(&disk) != expected_hash {
        return Err("The bibliography changed outside Hayman. Reload before saving so those changes are not overwritten.".into());
    }
    let content = serialize_yaml(&bibliography.data)?;
    let (_, _, recovery, _) = directories(&app)?;
    let saved = snapshot(&db, &recovery, &current, "before-save")?;
    atomic_write(Path::new(&current.file_path), content.as_bytes())?;
    let new_hash = digest(content.as_bytes());
    if let Err(error) = db.execute(
    "UPDATE bibliographies SET title=?2,description=?3,content_hash=?4,updated_at=?5 WHERE id=?1",
    params![current.id,bibliography.metadata.title,bibliography.metadata.description,new_hash,Utc::now().to_rfc3339()]
  ) {
        if let Some((saved, _)) = saved { let _ = fs::copy(saved, &current.file_path); }
        return Err(error.to_string());
    }
    get_bibliography(app, current.id)
}

#[tauri::command]
pub fn rename_bibliography(
    app: AppHandle,
    old_id: String,
    bibliography: Bibliography,
    expected_hash: String,
) -> Result<Bibliography> {
    let new_id = &bibliography.metadata.id;
    if new_id.is_empty() || new_id == "new" || safe_id(new_id) != *new_id {
        return Err(
            "The ID must contain lowercase letters, numbers, and single hyphens only.".into(),
        );
    }
    let db = db(&app)?;
    let current = metadata(&db, &old_id)?;
    if digest(&fs::read(&current.file_path).map_err(|e| e.to_string())?) != expected_hash {
        return Err("The bibliography changed outside Hayman. Reload before renaming it.".into());
    }
    if old_id != *new_id {
        let collision: bool = db
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM bibliographies WHERE id=?1)",
                [new_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if collision {
            return Err(format!("Bibliography '{new_id}' already exists."));
        }
    }
    let content = serialize_yaml(&bibliography.data)?;
    let (_, _, recovery, _) = directories(&app)?;
    snapshot(&db, &recovery, &current, "before-rename")?;
    let old_path = PathBuf::from(&current.file_path);
    let new_path = if current.storage_kind == "managed" && old_id != *new_id {
        old_path.with_file_name(format!("{new_id}.yml"))
    } else {
        old_path.clone()
    };
    if new_path != old_path && new_path.exists() {
        return Err("A managed bibliography file with the new ID already exists.".into());
    }
    atomic_write(&new_path, content.as_bytes())?;
    if let Err(error) = db.execute(
        "UPDATE bibliographies SET id=?2,title=?3,description=?4,file_path=?5,content_hash=?6,updated_at=?7 WHERE id=?1",
        params![old_id,new_id,bibliography.metadata.title,bibliography.metadata.description,
            new_path.to_string_lossy(),digest(content.as_bytes()),Utc::now().to_rfc3339()],
    ) {
        if new_path != old_path {
            let _ = fs::remove_file(&new_path);
        }
        return Err(error.to_string());
    }
    if new_path != old_path {
        fs::remove_file(old_path).map_err(|e| e.to_string())?;
    }
    get_bibliography(app, new_id.clone())
}

#[tauri::command]
pub fn delete_bibliography(app: AppHandle, id: String) -> Result<DeleteResult> {
    let mut db = db(&app)?;
    let m = metadata(&db, &id)?;
    let (_, _, recovery, _) = directories(&app)?;
    let saved = snapshot(&db, &recovery, &m, "before-delete")?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    if m.storage_kind == "managed" {
        let _ = fs::remove_file(&m.file_path);
    }
    if let Err(e) = tx.execute("DELETE FROM bibliographies WHERE id=?1", [&id]) {
        if m.storage_kind == "managed" {
            if let Some((saved, _)) = &saved {
                let _ = fs::copy(saved, &m.file_path);
            }
        }
        return Err(e.to_string());
    }
    if let Err(error) = tx.commit() {
        if m.storage_kind == "managed" {
            if let Some((saved, _)) = &saved {
                let _ = fs::copy(saved, &m.file_path);
            }
        }
        return Err(error.to_string());
    }
    Ok(DeleteResult {
        recovery_id: saved.map(|(_, id)| id),
    })
}

#[tauri::command]
pub fn list_recovery_snapshots(app: AppHandle) -> Result<Vec<RecoveryItem>> {
    let db = db(&app)?;
    let mut statement = db.prepare(
        "SELECT id,bibliography_id,original_path,snapshot_path,created_at,reason,storage_kind FROM recovery ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    statement
        .query_map([], |row| {
            Ok(RecoveryItem {
                id: row.get(0)?,
                bibliography_id: row.get(1)?,
                original_path: row.get(2)?,
                snapshot_path: row.get(3)?,
                created_at: row.get(4)?,
                reason: row.get(5)?,
                storage_kind: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
}

#[tauri::command]
pub fn restore_recovery_snapshot(app: AppHandle, recovery_id: i64) -> Result<Bibliography> {
    let db = db(&app)?;
    let item = db
        .query_row(
            "SELECT bibliography_id,original_path,snapshot_path,reason,storage_kind,title,description FROM recovery WHERE id=?1",
            [recovery_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                ))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or("Recovery snapshot was not found.")?;
    let original = PathBuf::from(&item.1);
    let existing = metadata(&db, &item.0).ok();
    let (_, managed, _, _) = directories(&app)?;
    let storage_kind = if item.4.is_empty() {
        if original.starts_with(&managed) {
            "managed"
        } else {
            "linked"
        }
    } else {
        item.4.as_str()
    };

    // Restoring a deleted link means restoring only Hayman's catalog pointer.
    // The external project file is authoritative and must never be overwritten
    // as a side effect of relinking it.
    let relink_only = item.3 == "before-delete" && storage_kind == "linked";
    if relink_only && existing.is_some() {
        return get_bibliography(app, item.0);
    }
    let restored_content = if relink_only {
        fs::read(&original).map_err(|e| {
            format!(
                "Could not relink the project bibliography because {} cannot be read: {e}",
                original.display()
            )
        })?
    } else {
        let content =
            fs::read(&item.2).map_err(|e| format!("Could not read recovery snapshot: {e}"))?;
        parse_yaml(&String::from_utf8_lossy(&content))?;
        atomic_write(&original, &content)?;
        content
    };
    parse_yaml(&String::from_utf8_lossy(&restored_content))?;
    let new_hash = digest(&restored_content);
    if let Some(current) = existing {
        db.execute(
            "UPDATE bibliographies SET content_hash=?2,updated_at=?3 WHERE id=?1",
            params![current.id, new_hash, Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
        return get_bibliography(app, current.id);
    }

    let now = Utc::now().to_rfc3339();
    let m = Metadata {
        id: unique_id(&db, &safe_id(&item.0))?,
        title: item.5.unwrap_or_else(|| item.0.replace(['-', '_'], " ")),
        description: item.6,
        created_at: now.clone(),
        updated_at: now,
        storage_kind: storage_kind.into(),
        file_path: item.1,
        content_hash: new_hash,
    };
    insert(&db, &m)?;
    read(m)
}

#[tauri::command]
pub fn clear_recovery_snapshots(app: AppHandle) -> Result<()> {
    let db = db(&app)?;
    let (_, _, recovery, _) = directories(&app)?;
    let recovery = fs::canonicalize(recovery).map_err(|e| e.to_string())?;
    let mut statement = db
        .prepare("SELECT snapshot_path FROM recovery")
        .map_err(|e| e.to_string())?;
    let paths = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(statement);
    for path in paths {
        let path = PathBuf::from(path);
        let parent = path.parent().and_then(|p| fs::canonicalize(p).ok());
        if parent.as_deref() != Some(recovery.as_path()) {
            return Err("Refused to remove a snapshot outside Hayman's recovery directory.".into());
        }
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Could not remove {}: {e}", path.display()))?;
        }
    }
    db.execute("DELETE FROM recovery", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Option<Value>> {
    let value = db(&app)?
        .query_row("SELECT value FROM settings WHERE id=1", [], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;
    value
        .map(|json| serde_json::from_str(&json).map_err(|e| e.to_string()))
        .transpose()
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Value) -> Result<()> {
    let json = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    db(&app)?
        .execute(
            "INSERT INTO settings(id,value) VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
            [json],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn typst_version() -> Result<String> {
    let output = Command::new("typst")
        .arg("--version")
        .output()
        .map_err(|e| format!("Typst is required but could not be started: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_owned());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

#[tauri::command]
pub fn render_typst(
    mut main_content: String,
    mut inputs: BTreeMap<String, String>,
) -> Result<String> {
    let temporary = tempfile::tempdir().map_err(|e| e.to_string())?;
    let yaml = inputs
        .remove("yaml")
        .ok_or("Typst preview is missing bibliography data.")?;
    fs::write(temporary.path().join("bibliography.yml"), yaml).map_err(|e| e.to_string())?;
    main_content = main_content.replace(
        "bytes(sys.inputs.at(\"yaml\"))",
        "read(\"bibliography.yml\")",
    );
    if let Some(csl) = inputs.get("csl").filter(|value| !value.is_empty()).cloned() {
        fs::write(temporary.path().join("style.csl"), csl).map_err(|e| e.to_string())?;
        main_content = main_content.replace("bytes(sys.inputs.at(\"csl\"))", "read(\"style.csl\")");
        inputs.insert("csl".into(), "local-file".into());
    }
    fs::write(temporary.path().join("main.typ"), main_content).map_err(|e| e.to_string())?;

    let mut command = Command::new("typst");
    command.args(["compile", "--diagnostic-format", "short", "--format", "svg"]);
    for (key, value) in inputs {
        command.args(["--input", &format!("{key}={value}")]);
    }
    let child = command
        .args(["main.typ", "-"])
        .current_dir(temporary.path())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Typst is required but could not be started: {e}"))?;
    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_owned());
    }
    String::from_utf8(output.stdout).map_err(|e| format!("Typst returned invalid UTF-8 SVG: {e}"))
}

#[cfg(test)]
mod tests {
    use super::{digest, parse_import, safe_id, serialize_yaml};
    #[test]
    fn identifiers_are_sanitized() {
        assert_eq!(safe_id("My Research_2026.bib"), "my-research-2026-bib");
    }
    #[test]
    fn hashes_detect_changes() {
        assert_ne!(digest(b"one"), digest(b"two"));
    }
    #[test]
    fn biblatex_import_is_valid_hayagriva_yaml() {
        let data = parse_import(
            "@article{example, title={A useful paper}, author={Doe, Jane}, year={2026}}",
            "bib",
        )
        .unwrap();
        assert!(data.get("example").is_some());
        serialize_yaml(&data).unwrap();
    }
    #[test]
    fn yaml_serialization_preserves_entry_order_after_deletion() {
        let mut data: serde_json::Value = serde_yaml::from_str(
            "zeta:\n  type: Book\n  title: Zeta\nalpha:\n  type: Book\n  title: Alpha\nmiddle:\n  type: Book\n  title: Middle\n",
        )
        .unwrap();
        data.as_object_mut().unwrap().shift_remove("alpha");
        let yaml = serialize_yaml(&data).unwrap();
        assert!(yaml.find("zeta:").unwrap() < yaml.find("middle:").unwrap());
    }
}
