//! Explicit, user-authorized metadata lookup. No automatic requests, arbitrary
//! URLs, redirects, credentials, attachment downloads or catalog writes.
use regex::Regex;
use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use url::Url;

type Result<T> = std::result::Result<T, String>;
const MAX_BYTES: usize = 512 * 1024;
static LAST_REQUEST: Mutex<Option<Instant>> = Mutex::new(None);

struct Request {
    url: Url,
    identifier: String,
    kind: String,
    accept: &'static str,
}

fn plan(kind: &str, identifier: &str, allow_network: bool) -> Result<Request> {
    if !allow_network {
        return Err("Allow this lookup to use the network first.".into());
    }
    if identifier.len() > 512 {
        return Err("Identifier is too long.".into());
    }
    let input = identifier.trim();
    let (identifier, mut url, accept) = match kind {
        "doi" => {
            let id = Regex::new(r"(?i)^(https?://(dx\.)?doi\.org/|doi:\s*)")
                .unwrap()
                .replace(input, "")
                .into_owned();
            if !Regex::new(r"^10\.\d{4,9}/\S+$").unwrap().is_match(&id) {
                return Err("Enter a valid DOI.".into());
            }
            (
                id,
                Url::parse("https://api.crossref.org/works/").unwrap(),
                "application/x-bibtex",
            )
        }
        "isbn" => {
            let id: String = input
                .chars()
                .filter(|c| !c.is_whitespace() && *c != '-')
                .collect::<String>()
                .to_ascii_uppercase();
            let digits: Option<Vec<u32>> = id
                .chars()
                .enumerate()
                .map(|(index, c)| {
                    if c == 'X' && index == 9 && id.len() == 10 {
                        Some(10)
                    } else {
                        c.to_digit(10)
                    }
                })
                .collect();
            let valid = digits.is_some_and(|d| match d.len() {
                10 => {
                    d.iter()
                        .enumerate()
                        .map(|(i, n)| n * (10 - i) as u32)
                        .sum::<u32>()
                        % 11
                        == 0
                }
                13 => {
                    (id.starts_with("978") || id.starts_with("979"))
                        && d.iter()
                            .enumerate()
                            .map(|(i, n)| n * if i % 2 == 0 { 1 } else { 3 })
                            .sum::<u32>()
                            % 10
                            == 0
                }
                _ => false,
            });
            if !valid {
                return Err("Enter an ISBN with a valid checksum.".into());
            }
            (
                id,
                Url::parse("https://openlibrary.org/api/books").unwrap(),
                "application/json",
            )
        }
        "arxiv" => {
            let id = Regex::new(r"(?i)^(arxiv:|https://arxiv\.org/abs/)")
                .unwrap()
                .replace(input, "")
                .into_owned();
            if !Regex::new(r"(?i)^(\d{4}\.\d{4,5}|[a-z-]+(\.[a-z]{2})?/\d{7})(v[1-9]\d*)?$")
                .unwrap()
                .is_match(&id)
            {
                return Err("Enter a valid arXiv identifier.".into());
            }
            (
                id,
                Url::parse("https://export.arxiv.org/api/query").unwrap(),
                "application/atom+xml",
            )
        }
        _ => return Err("Choose DOI, ISBN or arXiv.".into()),
    };
    match kind {
        "doi" => {
            url.path_segments_mut()
                .map_err(|_| "Invalid endpoint.")?
                .pop_if_empty()
                .push(&identifier)
                .push("transform");
        }
        "isbn" => {
            url.query_pairs_mut()
                .append_pair("bibkeys", &format!("ISBN:{identifier}"))
                .append_pair("format", "json")
                .append_pair("jscmd", "data");
        }
        "arxiv" => {
            url.query_pairs_mut()
                .append_pair("id_list", &identifier)
                .append_pair("max_results", "1");
        }
        _ => unreachable!(),
    }
    Ok(Request {
        url,
        identifier,
        kind: kind.into(),
        accept,
    })
}

#[tauri::command]
pub async fn lookup_identifier(
    kind: String,
    identifier: String,
    allow_network: bool,
) -> Result<crate::storage::ParsedImport> {
    let request = plan(&kind, &identifier, allow_network)?;
    {
        let mut last = LAST_REQUEST.lock().map_err(|_| "Lookup is unavailable.")?;
        if last.is_some_and(|time| time.elapsed() < Duration::from_secs(3)) {
            return Err("Wait three seconds before another lookup.".into());
        }
        *last = Some(Instant::now());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(20))
        .user_agent(concat!(
            "Hayman/",
            env!("CARGO_PKG_VERSION"),
            " (https://github.com/jassielof/hayman)"
        ))
        .build()
        .map_err(|e| e.to_string())?;
    let mut response = client
        .get(request.url.clone())
        .header(reqwest::header::ACCEPT, request.accept)
        .send()
        .await
        .map_err(
            |_| "Could not contact the metadata provider. Check your connection and try again.",
        )?;
    if !response.status().is_success() {
        return Err(format!(
            "Metadata provider returned HTTP {}. No references were changed.",
            response.status().as_u16()
        ));
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_BYTES as u64)
    {
        return Err("Metadata response was too large.".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Could not read the metadata response.")?
    {
        if bytes.len() + chunk.len() > MAX_BYTES {
            return Err("Metadata response was too large.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let text =
        String::from_utf8(bytes).map_err(|_| "Metadata provider returned non-UTF-8 text.")?;
    decode(&request, &text)
}

fn decode(request: &Request, text: &str) -> Result<crate::storage::ParsedImport> {
    let parsed = if request.kind == "doi" {
        crate::storage::parse_import_content(text.into(), "biblatex".into())?
    } else {
        let data = if request.kind == "isbn" {
            isbn_data(&request.identifier, text)?
        } else {
            arxiv_data(&request.identifier, text)?
        };
        // All online metadata goes through the same official Hayagriva validator
        // as local imports. The frontend only stages the result for review.
        crate::storage::parse_import_content(
            serde_yaml::to_string(&data).map_err(|e| e.to_string())?,
            "yaml".into(),
        )?
    };
    if !parsed.data.as_object().is_some_and(|data| data.len() == 1) {
        return Err(
            "The provider did not return exactly one reference for this identifier.".into(),
        );
    }
    Ok(parsed)
}

fn isbn_data(identifier: &str, text: &str) -> Result<Value> {
    let response: Value =
        serde_json::from_str(text).map_err(|_| "Open Library returned invalid JSON.")?;
    let book = response
        .get(format!("ISBN:{identifier}"))
        .ok_or("No book was found for this ISBN.")?;
    let title = book["title"]
        .as_str()
        .filter(|t| !t.is_empty())
        .ok_or("The book record has no title.")?;
    let mut entry = json!({"type":"book", "title": title, "serial-number": {"isbn":identifier}});
    if let Some(authors) = book["authors"].as_array() {
        let names: Vec<_> = authors.iter().filter_map(|a| a["name"].as_str()).collect();
        if !names.is_empty() {
            entry["author"] = json!(names);
        }
    }
    if let Some(publisher) = book["publishers"]
        .as_array()
        .and_then(|p| p.first())
        .and_then(|p| p["name"].as_str())
    {
        entry["publisher"] = publisher.into();
    }
    if let Some(date) = book["publish_date"].as_str() {
        // Do not invent precision or parse ambiguous natural-language dates.
        if Regex::new(r"^\d{4}(-\d{2}(-\d{2})?)?$")
            .unwrap()
            .is_match(date)
        {
            entry["date"] = date.into();
        } else {
            entry["note"] = format!("Open Library publication date: {date}").into();
        }
    }
    let mut data = serde_json::Map::new();
    data.insert(format!("isbn-{identifier}"), entry);
    Ok(Value::Object(data))
}

#[derive(Deserialize)]
struct Feed {
    #[serde(default)]
    entry: Vec<ArxivEntry>,
}
#[derive(Deserialize)]
struct ArxivEntry {
    title: String,
    #[serde(default)]
    author: Vec<ArxivAuthor>,
    published: String,
    #[serde(default)]
    summary: String,
}
#[derive(Deserialize)]
struct ArxivAuthor {
    name: String,
}

fn arxiv_data(identifier: &str, text: &str) -> Result<Value> {
    let feed: Feed =
        quick_xml::de::from_str(text).map_err(|_| "arXiv returned invalid metadata.")?;
    let paper = feed
        .entry
        .first()
        .ok_or("No paper was found for this arXiv identifier.")?;
    let title = paper.title.split_whitespace().collect::<Vec<_>>().join(" ");
    if title.is_empty() || title == "Error" {
        return Err("No paper was found for this arXiv identifier.".into());
    }
    let mut entry = json!({"type":"article", "title":title, "serial-number":{"arxiv":identifier}, "url":format!("https://arxiv.org/abs/{identifier}")});
    let date = paper
        .published
        .get(..10)
        .filter(|date| Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap().is_match(date))
        .ok_or("arXiv returned an invalid publication date.")?;
    entry["date"] = date.into();
    if !paper.author.is_empty() {
        entry["author"] = json!(
            paper
                .author
                .iter()
                .map(|a| a.name.as_str())
                .collect::<Vec<_>>()
        );
    }
    if !paper.summary.trim().is_empty() {
        entry["abstract"] = paper.summary.trim().into();
    }
    let mut data = serde_json::Map::new();
    data.insert(format!("arxiv-{}", identifier.replace('/', "-")), entry);
    Ok(Value::Object(data))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn consent_and_identifier_validation_precede_requests() {
        assert!(plan("doi", "10.1000/test", false).is_err());
        for (kind, id) in [
            ("doi", "https://localhost/private"),
            ("isbn", "9780980200448"),
            ("arxiv", "../../private"),
            ("url", "https://example.org"),
        ] {
            assert!(plan(kind, id, true).is_err());
        }
    }
    #[test]
    fn doi_lookup_rejects_empty_or_multiple_references() {
        let request = plan("doi", "10.1000/test", true).unwrap();
        assert!(decode(&request, "").is_err());
        assert!(decode(&request, "@book{a,title={A}}\n@book{b,title={B}}").is_err());
        assert!(decode(&request, "@book{a,title={A}}").is_ok());
    }
    #[test]
    fn endpoints_cannot_be_overridden_by_identifier_components() {
        for (kind, id, host) in [
            (
                "doi",
                "10.1000/a?next=https://localhost#x",
                "api.crossref.org",
            ),
            ("isbn", "978-0-9802004-4-7", "openlibrary.org"),
            ("arxiv", "arXiv:2401.12345v2", "export.arxiv.org"),
        ] {
            let request = plan(kind, id, true).unwrap();
            assert_eq!(request.url.scheme(), "https");
            assert_eq!(request.url.host_str(), Some(host));
            assert!(request.url.fragment().is_none());
        }
        assert!(plan("isbn", "0-306-40615-2", true).is_ok());
    }
    #[test]
    fn isbn_metadata_keeps_ambiguous_dates_as_notes() {
        let request = plan("isbn", "9780980200447", true).unwrap();
        let result = decode(&request, r#"{"ISBN:9780980200447":{"title":"Example","authors":[{"name":"Jane Doe"}],"publish_date":"March 2008"}}"#).unwrap();
        let yaml = serde_yaml::to_string(&result).unwrap();
        assert!(yaml.contains("March 2008"));
        assert!(decode(&request, "{}").is_err());
        assert!(decode(&request, "<html>error</html>").is_err());
    }
    #[test]
    fn arxiv_atom_handles_unicode_and_empty_results() {
        let request = plan("arxiv", "2401.12345", true).unwrap();
        let result = decode(&request, r#"<feed xmlns="http://www.w3.org/2005/Atom"><entry><title> Unicode  研究 </title><published>2024-01-17T00:00:00Z</published><author><name>田中</name></author><summary>Abstract</summary></entry></feed>"#).unwrap();
        assert!(serde_yaml::to_string(&result).unwrap().contains("研究"));
        assert!(decode(&request, "<feed/>").is_err());
        assert!(
            decode(
                &request,
                "<feed><entry><title>Bad date</title><published>🦀🦀🦀</published></entry></feed>"
            )
            .is_err()
        );
    }

    #[test]
    #[ignore = "Explicit live-provider smoke check; never run in offline CI"]
    fn live_provider_smoke() {
        for (kind, identifier) in [
            ("doi", "10.1126/science.1157784"),
            ("isbn", "9780980200447"),
            ("arxiv", "2101.00001"),
        ] {
            std::thread::sleep(Duration::from_secs(3));
            let result = tauri::async_runtime::block_on(lookup_identifier(
                kind.into(),
                identifier.into(),
                true,
            ));
            assert!(
                result.is_ok(),
                "{kind}: {}",
                result.err().unwrap_or_default()
            );
        }
    }
}
