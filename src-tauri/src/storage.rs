use chrono::Utc;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;
use wait_timeout::ChildExt;

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
pub struct ParsedImport {
    data: Value,
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

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    id: i64,
    bibliography_id: String,
    entry_id: String,
    path: String,
    name: String,
    created_at: String,
    available: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    id: String,
    title: String,
    description: Option<String>,
    bibliography_ids: Vec<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletedEntry {
    entry_id: String,
    data: Value,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashItem {
    id: i64,
    bibliography_id: String,
    entry_id: String,
    data: Value,
    deleted_at: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    database_ok: bool,
    bibliography_count: usize,
    attachment_count: usize,
    problems: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FontSettings {
    sans: String,
    serif: String,
    mono: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorSettings {
    default_mode: String,
    visible_fields: Vec<String>,
    fields_by_type: BTreeMap<String, Vec<String>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySettings {
    density: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPayload {
    id: String,
    fonts: FontSettings,
    citation: Value,
    editor: EditorSettings,
    library: LibrarySettings,
}

const ENTRY_FIELD_KEYS: &[&str] = &[
    "author",
    "editor",
    "affiliated",
    "publisher",
    "issue",
    "volume",
    "edition",
    "chapter",
    "page-range",
    "volume-total",
    "page-total",
    "time-range",
    "runtime",
    "url",
    "serial-number",
    "language",
    "abstract",
    "genre",
    "call-number",
    "location",
    "organization",
    "archive",
    "archive-location",
    "note",
];

fn validate_settings(settings: &SettingsPayload) -> Result<()> {
    if settings.id != "app" {
        return Err("Settings ID must be 'app'.".into());
    }
    if !matches!(settings.editor.default_mode.as_str(), "guided" | "yaml") {
        return Err("Default editor mode must be guided or yaml.".into());
    }
    if !matches!(settings.library.density.as_str(), "comfortable" | "compact") {
        return Err("Library density must be comfortable or compact.".into());
    }
    if [
        &settings.fonts.sans,
        &settings.fonts.serif,
        &settings.fonts.mono,
    ]
    .iter()
    .any(|font| font.trim().is_empty())
    {
        return Err("Font family names cannot be empty.".into());
    }
    if !settings.citation.is_object() {
        return Err("Citation settings must be an object.".into());
    }
    for field in settings
        .editor
        .visible_fields
        .iter()
        .chain(settings.editor.fields_by_type.values().flatten())
    {
        if !ENTRY_FIELD_KEYS.contains(&field.as_str()) {
            return Err(format!("Unknown editor field '{field}'."));
        }
    }
    Ok(())
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderedReference {
    key: String,
    text: String,
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
    fs::create_dir_all(&recovery).map_err(|e| e.to_string())?;
    let db = Connection::open(database).map_err(|e| e.to_string())?;
    initialize_database(&db)?;
    // Recovery files are app-owned. Files without a catalog row can remain
    // after a crash between committing a cleanup and removing the files.
    let mut statement = db
        .prepare("SELECT snapshot_path FROM recovery")
        .map_err(|e| e.to_string())?;
    let known = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<std::collections::HashSet<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(statement);
    if let Ok(files) = fs::read_dir(&recovery) {
        for file in files.flatten() {
            let path = file.path();
            if path.is_file() && !known.contains(&path.to_string_lossy().into_owned()) {
                let _ = fs::remove_file(path);
            }
        }
    }
    Ok(())
}

fn initialize_database(db: &Connection) -> Result<()> {
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
         id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
       CREATE TABLE IF NOT EXISTS attachments(
         id INTEGER PRIMARY KEY, bibliography_id TEXT NOT NULL,
         entry_id TEXT NOT NULL, path TEXT NOT NULL, name TEXT NOT NULL,
         created_at TEXT NOT NULL,
         UNIQUE(bibliography_id,entry_id,path));
       CREATE TABLE IF NOT EXISTS projects(
         id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
         created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
       CREATE TABLE IF NOT EXISTS project_files(
         project_id TEXT NOT NULL, bibliography_id TEXT NOT NULL,
         position INTEGER NOT NULL,
         PRIMARY KEY(project_id,bibliography_id),
         FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
       CREATE TABLE IF NOT EXISTS entry_trash(
         id INTEGER PRIMARY KEY, bibliography_id TEXT NOT NULL,
         entry_id TEXT NOT NULL, data_json TEXT NOT NULL,
         deleted_at TEXT NOT NULL);",
    )
    .map_err(|e| e.to_string())?;
    // Existing desktop profiles predate the recovery metadata required to
    // distinguish relinking from restoring file contents.
    for migration in [
        "ALTER TABLE recovery ADD COLUMN storage_kind TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE recovery ADD COLUMN title TEXT",
        "ALTER TABLE recovery ADD COLUMN description TEXT",
    ] {
        if let Err(error) = db.execute(migration, [])
            && !error.to_string().contains("duplicate column name")
        {
            return Err(error.to_string());
        }
    }
    Ok(())
}

fn db(app: &AppHandle) -> Result<Connection> {
    let db = Connection::open(directories(app)?.3).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
        .map_err(|e| e.to_string())?;
    Ok(db)
}

fn digest(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn bibliography_lock(app: &AppHandle, path: &Path) -> Result<File> {
    let locks = directories(app)?.0.join("locks");
    fs::create_dir_all(&locks).map_err(|e| e.to_string())?;
    let lock_path = locks.join(format!(
        "{}.lock",
        digest(path.as_os_str().as_encoded_bytes())
    ));
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(lock_path)
        .map_err(|e| e.to_string())?;
    file.lock()
        .map_err(|e| format!("Could not lock the bibliography for writing: {e}"))?;
    Ok(file)
}

fn panic_message(payload: &(dyn std::any::Any + Send)) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() {
        s.to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "an internal formatting error occurred".to_string()
    }
}

fn parse_yaml(content: &str) -> Result<Value> {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        hayagriva::io::from_yaml_str(content)
    }))
    .map_err(|e| {
        format!(
            "Hayagriva panicked while validating bibliography: {}",
            panic_message(&*e)
        )
    })?
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
            let library = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                hayagriva::io::from_biblatex_str(content)
            }))
            .map_err(|e| {
                format!(
                    "Hayagriva panicked while parsing BibTeX/BibLaTeX: {}",
                    panic_message(&*e)
                )
            })?
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

fn parse_import_content_value(content: &str, format: &str) -> Result<ParsedImport> {
    let normalized = format.trim().to_ascii_lowercase();
    if matches!(normalized.as_str(), "yaml" | "yml") {
        return parse_import(content, "yaml").map(|data| ParsedImport {
            data,
            source_format: "yaml".into(),
        });
    }
    if matches!(normalized.as_str(), "bib" | "bibtex" | "biblatex") {
        return parse_import(content, "bib").map(|data| ParsedImport {
            data,
            source_format: "biblatex".into(),
        });
    }
    if normalized != "auto" {
        return Err("Import format must be auto, yaml, or biblatex.".into());
    }

    if let Ok(data) = parse_import(content, "yaml") {
        return Ok(ParsedImport {
            data,
            source_format: "yaml".into(),
        });
    }
    parse_import(content, "bib").map(|data| ParsedImport {
        data,
        source_format: "biblatex".into(),
    })
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
    let mut file = tempfile::Builder::new()
        .prefix(".hayman-write-")
        .tempfile_in(parent)
        .map_err(|e| e.to_string())?;
    file.write_all(content).map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    if !path.exists() {
        file.persist(path).map_err(|e| e.error.to_string())?;
        return sync_directory(parent);
    }

    let displaced_file = tempfile::Builder::new()
        .prefix(".hayman-replaced-")
        .tempfile_in(parent)
        .map_err(|e| e.to_string())?;
    let displaced = displaced_file.path().to_path_buf();
    drop(displaced_file);
    fs::rename(path, &displaced).map_err(|e| e.to_string())?;
    if let Err(error) = file.persist(path) {
        let _ = fs::rename(&displaced, path);
        return Err(error.error.to_string());
    }
    fs::remove_file(displaced).map_err(|e| e.to_string())?;
    sync_directory(parent)
}

fn sync_directory(_path: &Path) -> Result<()> {
    // Windows does not permit opening a directory as a File. The file itself
    // is still synced above; Unix also flushes the directory entry rename.
    #[cfg(unix)]
    File::open(_path)
        .and_then(|directory| directory.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
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
    let content = fs::read(&m.file_path)
        .map_err(|e| format!("Could not read bibliography for recovery: {e}"))?;
    let mut target_file = tempfile::Builder::new()
        .prefix(&format!("{}-{stamp}-{reason}-", m.id))
        .suffix(".yml")
        .tempfile_in(recovery)
        .map_err(|e| format!("Could not create recovery snapshot: {e}"))?;
    target_file
        .write_all(&content)
        .and_then(|_| target_file.as_file().sync_all())
        .map_err(|e| format!("Could not persist recovery snapshot: {e}"))?;
    let target = target_file
        .into_temp_path()
        .keep()
        .map_err(|e| format!("Could not retain recovery snapshot: {e}"))?;
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
pub fn backup_catalog_database(app: AppHandle, destination: String) -> Result<()> {
    let destination = PathBuf::from(destination);
    let (root, _, _, source) = directories(&app)?;
    let destination_parent = destination
        .parent()
        .ok_or("Choose a complete destination path for the catalog backup.")?;
    let root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let destination_parent = fs::canonicalize(destination_parent)
        .map_err(|e| format!("Could not access the backup destination: {e}"))?;
    if destination_parent.starts_with(&root) {
        return Err("Choose a backup destination outside Hayman's active data directory.".into());
    }
    let db = db(&app)?;
    db.execute_batch("PRAGMA wal_checkpoint(FULL);")
        .map_err(|e| e.to_string())?;
    let bytes = fs::read(source).map_err(|e| format!("Could not read catalog database: {e}"))?;
    atomic_write(&destination, &bytes).map_err(|e| format!("Could not write catalog backup: {e}"))
}

#[tauri::command]
pub fn check_storage_health(app: AppHandle) -> Result<HealthReport> {
    let db = db(&app)?;
    let integrity: String = db
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut problems = Vec::new();
    if integrity != "ok" {
        problems.push(format!("SQLite integrity check: {integrity}"));
    }
    let mut statement = db
        .prepare(&format!("{SELECT} ORDER BY id"))
        .map_err(|e| e.to_string())?;
    let bibliographies = statement
        .query_map([], row_metadata)
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(statement);
    for bibliography in &bibliographies {
        match fs::read_to_string(&bibliography.file_path) {
            Ok(content) => {
                if let Err(error) = parse_yaml(&content) {
                    problems.push(format!(
                        "{} is not valid Hayagriva: {error}",
                        bibliography.title
                    ));
                }
            }
            Err(error) => problems.push(format!("{} cannot be read: {error}", bibliography.title)),
        }
    }
    let attachment_count: i64 = db
        .query_row("SELECT COUNT(*) FROM attachments", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let missing_attachments: usize = {
        let mut statement = db
            .prepare("SELECT path FROM attachments")
            .map_err(|e| e.to_string())?;
        statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|path| path.ok())
            .filter(|path| !Path::new(path).is_file())
            .count()
    };
    if missing_attachments > 0 {
        problems.push(format!(
            "{missing_attachments} linked attachment files are missing."
        ));
    }
    Ok(HealthReport {
        database_ok: integrity == "ok",
        bibliography_count: bibliographies.len(),
        attachment_count: attachment_count as usize,
        problems,
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
    let _lock = bibliography_lock(&app, &path)?;
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
pub fn parse_import_content(content: String, format: String) -> Result<ParsedImport> {
    parse_import_content_value(&content, &format)
}

#[tauri::command]
pub fn insert_entries(
    app: AppHandle,
    bibliography_id: String,
    entries: Value,
    expected_hash: String,
) -> Result<Bibliography> {
    let incoming = entries
        .as_object()
        .ok_or("Imported entries must be a mapping of citation keys to entries.")?;
    if incoming.is_empty() {
        return Err("Select at least one entry to import.".into());
    }
    parse_yaml(&serde_yaml::to_string(&entries).map_err(|e| e.to_string())?)?;

    let db = db(&app)?;
    let current = metadata(&db, &bibliography_id)?;
    let path = Path::new(&current.file_path);
    let _lock = bibliography_lock(&app, path)?;
    let disk = fs::read(path).map_err(|e| e.to_string())?;
    if digest(&disk) != expected_hash {
        return Err("The bibliography changed outside Hayman. Reload before importing so those changes are not overwritten.".into());
    }

    let mut data = parse_yaml(&String::from_utf8(disk).map_err(|e| e.to_string())?)?;
    let existing = data
        .as_object_mut()
        .ok_or("The current bibliography is not a mapping.")?;
    for (key, entry) in incoming {
        if existing.contains_key(key) {
            return Err(format!("Entry '{key}' already exists."));
        }
        existing.insert(key.clone(), entry.clone());
    }

    let content = serialize_yaml(&data)?;
    let (_, _, recovery, _) = directories(&app)?;
    let saved = snapshot(&db, &recovery, &current, "before-batch-import")?;
    atomic_write(path, content.as_bytes())?;
    let new_hash = digest(content.as_bytes());
    if let Err(error) = db.execute(
        "UPDATE bibliographies SET content_hash=?2,updated_at=?3 WHERE id=?1",
        params![current.id, new_hash, Utc::now().to_rfc3339()],
    ) {
        if let Some((saved, _)) = saved {
            let _ = fs::copy(saved, path);
        }
        return Err(error.to_string());
    }
    get_bibliography(app, current.id)
}

#[tauri::command]
pub fn save_bibliography(
    app: AppHandle,
    bibliography: Bibliography,
    expected_hash: String,
) -> Result<Bibliography> {
    let db = db(&app)?;
    let current = metadata(&db, &bibliography.metadata.id)?;
    let _lock = bibliography_lock(&app, Path::new(&current.file_path))?;
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
    let mut db = db(&app)?;
    let current = metadata(&db, &old_id)?;
    let _lock = bibliography_lock(&app, Path::new(&current.file_path))?;
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
    let saved = snapshot(&db, &recovery, &current, "before-rename")?;
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
    let tx = db.transaction().map_err(|e| e.to_string())?;
    if let Err(error) = tx.execute(
        "UPDATE bibliographies SET id=?2,title=?3,description=?4,file_path=?5,content_hash=?6,updated_at=?7 WHERE id=?1",
        params![old_id,new_id,bibliography.metadata.title,bibliography.metadata.description,
            new_path.to_string_lossy(),digest(content.as_bytes()),Utc::now().to_rfc3339()],
    ) {
        if new_path != old_path {
            let _ = fs::remove_file(&new_path);
        } else if let Some((saved, _)) = &saved {
            let _ = fs::copy(saved, &old_path);
        }
        return Err(error.to_string());
    }
    for table in ["attachments", "project_files", "entry_trash"] {
        if let Err(error) = tx.execute(
            &format!("UPDATE {table} SET bibliography_id=?2 WHERE bibliography_id=?1"),
            params![old_id, new_id],
        ) {
            if new_path != old_path {
                let _ = fs::remove_file(&new_path);
            } else if let Some((saved, _)) = &saved {
                let _ = fs::copy(saved, &old_path);
            }
            return Err(error.to_string());
        }
    }
    if new_path != old_path
        && let Err(error) = fs::remove_file(&old_path)
    {
        let _ = fs::remove_file(&new_path);
        return Err(error.to_string());
    }
    if let Err(error) = tx.commit() {
        if new_path != old_path {
            if let Some((saved, _)) = &saved {
                let _ = fs::copy(saved, &old_path);
            }
            let _ = fs::remove_file(&new_path);
        } else if let Some((saved, _)) = &saved {
            let _ = fs::copy(saved, &old_path);
        }
        return Err(error.to_string());
    }
    get_bibliography(app, new_id.clone())
}

#[tauri::command]
pub fn delete_bibliography(app: AppHandle, id: String) -> Result<DeleteResult> {
    let mut db = db(&app)?;
    let m = metadata(&db, &id)?;
    let _lock = bibliography_lock(&app, Path::new(&m.file_path))?;
    let (_, _, recovery, _) = directories(&app)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let saved = snapshot(&tx, &recovery, &m, "before-delete")?;
    if m.storage_kind == "managed" {
        fs::remove_file(&m.file_path).map_err(|e| e.to_string())?;
    }
    if let Err(e) = tx.execute("DELETE FROM bibliographies WHERE id=?1", [&id]) {
        if m.storage_kind == "managed"
            && let Some((saved, _)) = &saved
        {
            let _ = fs::copy(saved, &m.file_path);
        }
        return Err(e.to_string());
    }
    if let Err(error) = tx.commit() {
        if m.storage_kind == "managed"
            && let Some((saved, _)) = &saved
        {
            let _ = fs::copy(saved, &m.file_path);
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
    let mut db = db(&app)?;
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
    let _lock = bibliography_lock(&app, &original)?;
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
    let previous_content =
        if original.is_file() {
            Some(fs::read(&original).map_err(|e| {
                format!("Could not preserve the current file before restoring: {e}")
            })?)
        } else {
            None
        };
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
        if let Err(error) = db.execute(
            "UPDATE bibliographies SET content_hash=?2,updated_at=?3 WHERE id=?1",
            params![current.id, new_hash, Utc::now().to_rfc3339()],
        ) {
            if !relink_only && let Some(previous) = &previous_content {
                let _ = atomic_write(&original, previous);
            }
            return Err(error.to_string());
        }
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
    let tx = db.transaction().map_err(|e| e.to_string())?;
    if let Err(error) = insert(&tx, &m) {
        if !relink_only {
            if let Some(previous) = &previous_content {
                let _ = atomic_write(&original, previous);
            } else {
                let _ = fs::remove_file(&original);
            }
        }
        return Err(error);
    }
    if m.id != item.0 {
        for table in ["attachments", "project_files", "entry_trash"] {
            if let Err(error) = tx.execute(
                &format!("UPDATE {table} SET bibliography_id=?2 WHERE bibliography_id=?1"),
                params![item.0, m.id],
            ) {
                if !relink_only {
                    if let Some(previous) = &previous_content {
                        let _ = atomic_write(&original, previous);
                    } else {
                        let _ = fs::remove_file(&original);
                    }
                }
                return Err(error.to_string());
            }
        }
    }
    if let Err(error) = tx.commit() {
        if !relink_only {
            if let Some(previous) = &previous_content {
                let _ = atomic_write(&original, previous);
            } else {
                let _ = fs::remove_file(&original);
            }
        }
        return Err(error.to_string());
    }
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
    let paths = paths.into_iter().map(PathBuf::from).collect::<Vec<_>>();
    for path in &paths {
        let parent = path.parent().and_then(|p| fs::canonicalize(p).ok());
        if parent.as_deref() != Some(recovery.as_path()) {
            return Err("Refused to remove a snapshot outside Hayman's recovery directory.".into());
        }
    }
    // Commit catalog removal first. A crash can then leave only harmless,
    // app-owned orphan files, which initialize() cleans on the next launch.
    db.execute("DELETE FROM recovery", [])
        .map_err(|e| e.to_string())?;
    for path in paths {
        if path.exists() {
            let _ = fs::remove_file(&path);
        }
    }
    Ok(())
}

fn attachment_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Attachment> {
    let path: String = row.get(3)?;
    Ok(Attachment {
        id: row.get(0)?,
        bibliography_id: row.get(1)?,
        entry_id: row.get(2)?,
        available: Path::new(&path).is_file(),
        path,
        name: row.get(4)?,
        created_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn list_attachments(
    app: AppHandle,
    bibliography_id: String,
    entry_id: String,
) -> Result<Vec<Attachment>> {
    let db = db(&app)?;
    let mut statement = db
        .prepare(
            "SELECT id,bibliography_id,entry_id,path,name,created_at
             FROM attachments WHERE bibliography_id=?1 AND entry_id=?2
             ORDER BY created_at,id",
        )
        .map_err(|e| e.to_string())?;
    statement
        .query_map(params![bibliography_id, entry_id], attachment_from_row)
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
}

#[tauri::command]
pub fn link_attachment(
    app: AppHandle,
    bibliography_id: String,
    entry_id: String,
    path: String,
) -> Result<Attachment> {
    let path = fs::canonicalize(path).map_err(|e| format!("Could not open attachment: {e}"))?;
    if !path.is_file() {
        return Err("Attachments must be existing files.".into());
    }
    let bibliography = get_bibliography(app.clone(), bibliography_id.clone())?;
    if bibliography.data.get(&entry_id).is_none() {
        return Err(format!("Entry '{entry_id}' was not found."));
    }
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Attachment")
        .to_owned();
    let path = path.to_string_lossy().into_owned();
    let db = db(&app)?;
    db.execute(
        "INSERT INTO attachments(bibliography_id,entry_id,path,name,created_at)
         VALUES(?1,?2,?3,?4,?5)",
        params![
            bibliography_id,
            entry_id,
            path,
            name,
            Utc::now().to_rfc3339()
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "This file is already attached to the entry.".to_owned()
        } else {
            e.to_string()
        }
    })?;
    db.query_row(
        "SELECT id,bibliography_id,entry_id,path,name,created_at FROM attachments WHERE id=?1",
        [db.last_insert_rowid()],
        attachment_from_row,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unlink_attachment(app: AppHandle, attachment_id: i64) -> Result<()> {
    let changed = db(&app)?
        .execute("DELETE FROM attachments WHERE id=?1", [attachment_id])
        .map_err(|e| e.to_string())?;
    if changed == 0 {
        return Err("Attachment was not found.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn open_attachment(app: AppHandle, attachment_id: i64) -> Result<()> {
    let path: String = db(&app)?
        .query_row(
            "SELECT path FROM attachments WHERE id=?1",
            [attachment_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or("Attachment was not found.")?;
    if !Path::new(&path).is_file() {
        return Err("The linked attachment file is missing.".into());
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

fn validated_external_url(value: &str) -> Result<url::Url> {
    let url =
        url::Url::parse(value.trim()).map_err(|_| "Enter a valid absolute URL.".to_owned())?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Only absolute HTTP and HTTPS URLs can be opened.".into());
    }
    Ok(url)
}

#[tauri::command]
pub fn open_external_url(app: AppHandle, url: String) -> Result<()> {
    let url = validated_external_url(&url)?;
    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|e| format!("Could not open the URL in your default browser: {e}"))
}

#[tauri::command]
pub fn rename_entry_metadata(
    app: AppHandle,
    bibliography_id: String,
    old_entry_id: String,
    new_entry_id: String,
) -> Result<()> {
    db(&app)?
        .execute(
            "UPDATE attachments SET entry_id=?3 WHERE bibliography_id=?1 AND entry_id=?2",
            params![bibliography_id, old_entry_id, new_entry_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_entry_metadata(
    app: AppHandle,
    bibliography_id: String,
    deleted_entries: Vec<DeletedEntry>,
) -> Result<Vec<i64>> {
    let mut db = db(&app)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let mut trash_ids = Vec::with_capacity(deleted_entries.len());
    for entry in deleted_entries {
        tx.execute(
            "INSERT INTO entry_trash(bibliography_id,entry_id,data_json,deleted_at)
             VALUES(?1,?2,?3,?4)",
            params![
                bibliography_id,
                entry.entry_id,
                serde_json::to_string(&entry.data).map_err(|e| e.to_string())?,
                Utc::now().to_rfc3339()
            ],
        )
        .map_err(|e| e.to_string())?;
        trash_ids.push(tx.last_insert_rowid());
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(trash_ids)
}

#[tauri::command]
pub fn list_entry_trash(app: AppHandle) -> Result<Vec<TrashItem>> {
    let db = db(&app)?;
    let mut statement = db
        .prepare(
            "SELECT id,bibliography_id,entry_id,data_json,deleted_at
             FROM entry_trash ORDER BY deleted_at DESC,id DESC",
        )
        .map_err(|e| e.to_string())?;
    statement
        .query_map([], |row| {
            let json: String = row.get(3)?;
            let data = serde_json::from_str(&json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            Ok(TrashItem {
                id: row.get(0)?,
                bibliography_id: row.get(1)?,
                entry_id: row.get(2)?,
                data,
                deleted_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
}

#[tauri::command]
pub fn discard_entry_trash(app: AppHandle, trash_ids: Vec<i64>) -> Result<()> {
    let mut db = db(&app)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    for id in trash_ids {
        tx.execute("DELETE FROM entry_trash WHERE id=?1", [id])
            .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

fn project_bibliography_ids(db: &Connection, project_id: &str) -> Result<Vec<String>> {
    let mut statement = db
        .prepare(
            "SELECT project_files.bibliography_id FROM project_files
             INNER JOIN bibliographies ON bibliographies.id=project_files.bibliography_id
             WHERE project_id=?1 ORDER BY position,project_files.bibliography_id",
        )
        .map_err(|e| e.to_string())?;
    statement
        .query_map([project_id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
}

fn project_from_row(db: &Connection, row: &rusqlite::Row<'_>) -> rusqlite::Result<Project> {
    let id: String = row.get(0)?;
    let bibliography_ids = project_bibliography_ids(db, &id).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            0,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::other(error)),
        )
    })?;
    Ok(Project {
        id,
        title: row.get(1)?,
        description: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        bibliography_ids,
    })
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<Project>> {
    let db = db(&app)?;
    let mut statement = db
        .prepare("SELECT id,title,description,created_at,updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    statement
        .query_map([], |row| project_from_row(&db, row))
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
}

#[tauri::command]
pub fn save_project(app: AppHandle, project: Project) -> Result<Project> {
    if project.id.is_empty() || safe_id(&project.id) != project.id {
        return Err(
            "The project ID must contain lowercase letters, numbers, and single hyphens only."
                .into(),
        );
    }
    if project.title.trim().is_empty() {
        return Err("Project title cannot be empty.".into());
    }
    let mut db = db(&app)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let existing_created: Option<String> = tx
        .query_row(
            "SELECT created_at FROM projects WHERE id=?1",
            [&project.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let created_at = existing_created.unwrap_or_else(|| now.clone());
    tx.execute(
        "INSERT INTO projects(id,title,description,created_at,updated_at) VALUES(?1,?2,?3,?4,?5)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,updated_at=excluded.updated_at",
        params![project.id, project.title.trim(), project.description, created_at, now],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "DELETE FROM project_files WHERE project_id=?1",
        [&project.id],
    )
    .map_err(|e| e.to_string())?;
    for (position, bibliography_id) in project.bibliography_ids.iter().enumerate() {
        tx.execute(
            "INSERT INTO project_files(project_id,bibliography_id,position) VALUES(?1,?2,?3)",
            params![project.id, bibliography_id, position as i64],
        )
        .map_err(|e| {
            format!("Could not add bibliography '{bibliography_id}' to the project: {e}")
        })?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    list_projects(app)?
        .into_iter()
        .find(|item| item.id == project.id)
        .ok_or("Project was not found after saving.".into())
}

#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<()> {
    let changed = db(&app)?
        .execute("DELETE FROM projects WHERE id=?1", [&id])
        .map_err(|e| e.to_string())?;
    if changed == 0 {
        return Err("Project was not found.".into());
    }
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
pub fn set_settings(app: AppHandle, settings: SettingsPayload) -> Result<()> {
    validate_settings(&settings)?;
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
pub async fn render_typst(
    main_content: String,
    inputs: BTreeMap<String, String>,
) -> Result<String> {
    tauri::async_runtime::spawn_blocking(move || {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            render_typst_blocking(main_content, inputs)
        }))
        .unwrap_or_else(|panic_info| {
            let detail = panic_message(&*panic_info);
            Err(format!("Typst preview worker failed: {detail}"))
        })
    })
    .await
    .map_err(|e| format!("Typst preview worker failed: {e}"))?
}

fn render_typst_blocking(
    mut main_content: String,
    mut inputs: BTreeMap<String, String>,
) -> Result<String> {
    let temporary = tempfile::tempdir().map_err(|e| e.to_string())?;
    let yaml = inputs
        .remove("yaml")
        .ok_or("Typst preview is missing bibliography data.")?;
    fs::write(temporary.path().join("bibliography.yml"), yaml).map_err(|e| e.to_string())?;
    main_content = main_content
        .replace("bytes(sys.inputs.at(\"yaml\"))", "\"bibliography.yml\"")
        .replace("read(\"bibliography.yml\")", "\"bibliography.yml\"")
        .replace("sys.inputs.at(\"yaml\")", "\"bibliography.yml\"");
    if let Some(csl) = inputs.remove("csl").filter(|value| !value.is_empty()) {
        fs::write(temporary.path().join("style.csl"), csl).map_err(|e| e.to_string())?;
        main_content = main_content
            .replace("bytes(sys.inputs.at(\"csl\"))", "\"style.csl\"")
            .replace("read(\"style.csl\")", "\"style.csl\"")
            .replace("sys.inputs.at(\"csl\")", "\"style.csl\"");
        inputs.insert("csl".into(), "style.csl".into());
    }
    fs::write(temporary.path().join("main.typ"), main_content).map_err(|e| e.to_string())?;

    let output_path = temporary.path().join("preview.svg");
    let diagnostics_path = temporary.path().join("diagnostics.txt");
    let diagnostics = File::create(&diagnostics_path).map_err(|e| e.to_string())?;
    let mut command = Command::new("typst");
    command.args(["compile", "--diagnostic-format", "short", "--format", "svg"]);
    for (key, value) in inputs {
        command.args(["--input", &format!("{key}={value}")]);
    }
    let mut child = command
        .args(["main.typ", "preview.svg"])
        .current_dir(temporary.path())
        .stdout(Stdio::null())
        .stderr(Stdio::from(diagnostics))
        .spawn()
        .map_err(|e| format!("Typst is required but could not be started: {e}"))?;
    let status = match child
        .wait_timeout(Duration::from_secs(30))
        .map_err(|e| e.to_string())?
    {
        Some(status) => status,
        None => {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Typst preview timed out after 30 seconds.".into());
        }
    };
    if !status.success() {
        let diagnostics = fs::read_to_string(diagnostics_path).unwrap_or_default();
        return Err(if diagnostics.trim().is_empty() {
            format!("Typst exited with {status}.")
        } else {
            diagnostics.trim().to_owned()
        });
    }
    fs::read_to_string(output_path).map_err(|e| format!("Could not read Typst SVG output: {e}"))
}

#[tauri::command]
pub async fn render_bibliography(
    yaml: String,
    style_name: String,
    custom_csl: Option<String>,
) -> Result<Vec<RenderedReference>> {
    tauri::async_runtime::spawn_blocking(move || {
        let style_name_clone = style_name.clone();
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            render_bibliography_blocking(yaml, style_name, custom_csl)
        }))
        .unwrap_or_else(|panic_info| {
            let detail = panic_message(&*panic_info);
            Err(format!(
                "Hayagriva was unable to format references with style '{style_name_clone}': {detail}"
            ))
        })
    })
    .await
    .map_err(|e| format!("Bibliography formatting worker failed: {e}"))?
}

fn render_bibliography_blocking(
    yaml: String,
    style_name: String,
    custom_csl: Option<String>,
) -> Result<Vec<RenderedReference>> {
    use hayagriva::archive::{ArchivedStyle, locales};
    use hayagriva::citationberg::{IndependentStyle, Style};
    use hayagriva::{
        BibliographyDriver, BibliographyRequest, BufWriteFormat, CitationItem, CitationRequest,
    };

    let trimmed_yaml = yaml.trim();
    if trimmed_yaml.is_empty() {
        return Ok(Vec::new());
    }

    let library = hayagriva::io::from_yaml_str(trimmed_yaml)
        .map_err(|e| format!("Hayagriva rejected this bibliography: {e}"))?;
    if library.is_empty() {
        return Ok(Vec::new());
    }

    let style = if let Some(csl) = custom_csl.filter(|value| !value.trim().is_empty()) {
        IndependentStyle::from_xml(&csl).map_err(|e| format!("Invalid CSL style: {e}"))?
    } else {
        let trimmed_style = style_name.trim();
        if trimmed_style.is_empty() {
            return Err("Citation style name cannot be empty.".into());
        }
        let archived = ArchivedStyle::by_name(trimmed_style).ok_or_else(|| {
            format!(
                "Hayagriva does not bundle the CSL style '{trimmed_style}'. Check the style name or upload a custom CSL file in Settings."
            )
        })?;
        match archived.get() {
            Style::Independent(style) => style,
            Style::Dependent(_) => {
                return Err("The selected CSL style requires a parent style.".into());
            }
        }
    };
    let locales = locales();
    let mut driver = BibliographyDriver::new();
    for entry in library.iter() {
        driver.citation(CitationRequest::from_items(
            vec![CitationItem::with_entry(entry)],
            &style,
            &locales,
        ));
    }
    let rendered = driver.finish(BibliographyRequest::new(&style, None, &locales));
    let bibliography = rendered
        .bibliography
        .ok_or("The selected CSL style does not define a bibliography.")?;
    bibliography
        .items
        .into_iter()
        .map(|item| {
            let mut text = String::new();
            if let Some(first_field) = item.first_field {
                first_field
                    .write_buf(&mut text, BufWriteFormat::Plain)
                    .map_err(|e| e.to_string())?;
                text.push(' ');
            }
            item.content
                .write_buf(&mut text, BufWriteFormat::Plain)
                .map_err(|e| e.to_string())?;
            Ok(RenderedReference {
                key: item.key,
                text,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{
        EditorSettings, FontSettings, LibrarySettings, Metadata, SettingsPayload, atomic_write,
        digest, initialize_database, panic_message, parse_import, parse_import_content_value,
        render_bibliography, render_bibliography_blocking, safe_id, serialize_yaml, snapshot,
        validate_settings, validated_external_url,
    };

    #[test]
    fn database_schema_migrates_legacy_recovery_and_preserves_relational_invariants() {
        let db = rusqlite::Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE recovery(
               id INTEGER PRIMARY KEY, bibliography_id TEXT NOT NULL,
               original_path TEXT NOT NULL, snapshot_path TEXT NOT NULL,
               content_hash TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL);
             PRAGMA foreign_keys=ON;",
        )
        .unwrap();

        initialize_database(&db).unwrap();
        initialize_database(&db).unwrap();

        let mut statement = db.prepare("PRAGMA table_info(recovery)").unwrap();
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<std::result::Result<Vec<_>, _>>()
            .unwrap();
        assert!(columns.contains(&"storage_kind".to_string()));
        assert!(columns.contains(&"title".to_string()));
        assert!(columns.contains(&"description".to_string()));
        drop(statement);

        db.execute(
            "INSERT INTO projects(id,title,created_at,updated_at) VALUES('research','Research','now','now')",
            [],
        )
        .unwrap();
        db.execute(
            "INSERT INTO project_files(project_id,bibliography_id,position) VALUES('research','library',0)",
            [],
        )
        .unwrap();
        db.execute("DELETE FROM projects WHERE id='research'", [])
            .unwrap();
        let memberships: i64 = db
            .query_row("SELECT COUNT(*) FROM project_files", [], |row| row.get(0))
            .unwrap();
        assert_eq!(memberships, 0);

        db.execute(
            "INSERT INTO attachments(bibliography_id,entry_id,path,name,created_at)
             VALUES('library','entry','paper.pdf','paper.pdf','now')",
            [],
        )
        .unwrap();
        assert!(
            db.execute(
                "INSERT INTO attachments(bibliography_id,entry_id,path,name,created_at)
                 VALUES('library','entry','paper.pdf','paper.pdf','now')",
                [],
            )
            .is_err()
        );
    }

    #[test]
    fn identifiers_are_sanitized() {
        assert_eq!(safe_id("My Research_2026.bib"), "my-research-2026-bib");
    }

    #[test]
    fn settings_boundary_rejects_unknown_editor_fields() {
        let settings = SettingsPayload {
            id: "app".into(),
            fonts: FontSettings {
                sans: "Inter".into(),
                serif: "Georgia".into(),
                mono: "Consolas".into(),
            },
            citation: serde_json::json!({ "defaultStyle": "ieee" }),
            editor: EditorSettings {
                default_mode: "guided".into(),
                visible_fields: vec!["author".into(), "not-a-field".into()],
                fields_by_type: std::collections::BTreeMap::new(),
            },
            library: LibrarySettings {
                density: "comfortable".into(),
            },
        };

        assert!(validate_settings(&settings).is_err());
    }

    #[test]
    fn external_urls_are_limited_to_absolute_http_urls() {
        assert!(validated_external_url("https://example.com/reference").is_ok());
        assert!(validated_external_url("http://localhost:8080").is_ok());
        assert!(validated_external_url("javascript:alert(1)").is_err());
        assert!(validated_external_url("file:///C:/private.txt").is_err());
        assert!(validated_external_url("example.com").is_err());
    }

    #[test]
    fn hashes_detect_changes() {
        assert_ne!(digest(b"one"), digest(b"two"));
    }

    #[test]
    fn atomic_write_replaces_content_without_leaving_work_files() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("library.yml");
        atomic_write(&path, b"first").unwrap();
        atomic_write(&path, b"second").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"second");
        let names = std::fs::read_dir(directory.path())
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect::<Vec<_>>();
        assert_eq!(names, vec![std::ffi::OsString::from("library.yml")]);
    }

    #[test]
    fn recovery_snapshots_never_reuse_a_filename() {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("library.yml");
        let recovery = directory.path().join("recovery");
        std::fs::create_dir(&recovery).unwrap();
        std::fs::write(&source, "entry:\n  type: misc\n").unwrap();
        let db = rusqlite::Connection::open_in_memory().unwrap();
        initialize_database(&db).unwrap();
        let metadata = Metadata {
            id: "library".into(),
            title: "Library".into(),
            description: None,
            created_at: "now".into(),
            updated_at: "now".into(),
            storage_kind: "linked".into(),
            file_path: source.to_string_lossy().into_owned(),
            content_hash: digest(b"entry:\n  type: misc\n"),
        };

        let first = snapshot(&db, &recovery, &metadata, "before-save")
            .unwrap()
            .unwrap();
        let second = snapshot(&db, &recovery, &metadata, "before-save")
            .unwrap()
            .unwrap();

        assert_ne!(first.0, second.0);
        assert_eq!(
            std::fs::read_to_string(first.0).unwrap(),
            "entry:\n  type: misc\n"
        );
        assert_eq!(
            std::fs::read_to_string(second.0).unwrap(),
            "entry:\n  type: misc\n"
        );
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
    fn content_import_detects_yaml_and_biblatex() {
        let yaml = parse_import_content_value("demo:\n  type: article\n", "auto").unwrap();
        assert_eq!(yaml.source_format, "yaml");
        assert!(yaml.data.get("demo").is_some());

        let bib = parse_import_content_value(
            "@article{paper, title={A Paper}, author={Doe, Jane}}",
            "auto",
        )
        .unwrap();
        assert_eq!(bib.source_format, "biblatex");
        assert!(bib.data.get("paper").is_some());
    }

    #[test]
    fn official_hayagriva_accepts_shared_schema_fixture() {
        let fixture = include_str!("../../packages/hayagriva-schema/fixtures/valid-complete.yml");
        let library = hayagriva::io::from_yaml_str(fixture).unwrap();
        assert_eq!(library.len(), 2);
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

    #[test]
    fn hayagriva_renders_full_bibliography_without_typst() {
        let references = tauri::async_runtime::block_on(render_bibliography(
            "paper:\n  type: Article\n  title: A useful paper\n  author: Doe, Jane\n  date: 2026\n"
                .into(),
            "ieee".into(),
            None,
        ))
        .unwrap();
        assert_eq!(references.len(), 1);
        assert_eq!(references[0].key, "paper");
        assert!(references[0].text.contains("A useful paper"));
        assert!(references[0].text.contains("[1]"));
    }

    #[test]
    fn hayagriva_rejects_unknown_style_gracefully() {
        let result = tauri::async_runtime::block_on(render_bibliography(
            "paper:\n  type: Article\n  title: A useful paper\n  author: Doe, Jane\n  date: 2026\n"
                .into(),
            "completely-invalid-csl-style".into(),
            None,
        ));
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(
            error
                .contains("Hayagriva does not bundle the CSL style 'completely-invalid-csl-style'")
        );
    }

    #[test]
    fn hayagriva_catches_style_panics_gracefully() {
        // Author structure that triggers Hayagriva 0.10.1 MLA disambiguation index-out-of-bounds
        let tricky_yaml = r#"
paper1:
  type: article
  title: First Paper
  author:
    - Alpha, One
    - Beta, Two
    - Gamma, Three
    - Delta, Four
  date: 2024
paper2:
  type: article
  title: Second Paper
  author:
    - Alpha, One
    - Beta, Two
    - Gamma, Three
  date: 2024
"#;
        let result = tauri::async_runtime::block_on(render_bibliography(
            tricky_yaml.into(),
            "mla".into(),
            None,
        ));
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Hayagriva was unable to format references with style 'mla'"));
        assert!(error.contains("index out of bounds"));
    }

    #[test]
    fn hayagriva_blocking_helper_handles_empty_inputs() {
        assert!(
            render_bibliography_blocking("".into(), "ieee".into(), None)
                .unwrap()
                .is_empty()
        );
        assert!(
            render_bibliography_blocking("   ".into(), "ieee".into(), None)
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn panic_payload_extraction() {
        let res = std::panic::catch_unwind(|| {
            panic!("static error string");
        });
        assert_eq!(panic_message(&*res.unwrap_err()), "static error string");

        let res2 = std::panic::catch_unwind(|| {
            let vec: Vec<i32> = vec![1, 2, 3];
            let _ = vec[3];
        });
        assert!(panic_message(&*res2.unwrap_err()).contains("index out of bounds"));
    }
}
