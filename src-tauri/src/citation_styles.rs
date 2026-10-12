use hayagriva::archive::ArchivedStyle;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct BundledCitationStyle {
    id: &'static str,
    title: &'static str,
    names: &'static [&'static str],
}

/// Query the compiled Hayagriva archive, not a separately maintained UI list.
#[tauri::command]
pub fn list_bundled_citation_styles() -> Vec<BundledCitationStyle> {
    let mut styles: Vec<_> = ArchivedStyle::all()
        .iter()
        .map(|style| BundledCitationStyle {
            id: style.names()[0],
            title: style.display_name(),
            names: style.names(),
        })
        .collect();
    styles.sort_by_key(|style| style.title.to_lowercase());
    styles
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_covers_the_archive_and_every_identifier_resolves() {
        let styles = list_bundled_citation_styles();
        assert_eq!(styles.len(), ArchivedStyle::all().len());
        let mut identifiers = std::collections::HashSet::new();
        for style in &styles {
            assert!(!style.title.is_empty());
            assert!(identifiers.insert(style.id));
            let archived = ArchivedStyle::by_name(style.id).unwrap();
            for name in style.names {
                assert_eq!(ArchivedStyle::by_name(name), Some(archived));
            }
        }
        assert!(
            styles
                .windows(2)
                .all(|pair| pair[0].title.to_lowercase() <= pair[1].title.to_lowercase())
        );
        for alias in ["ieee", "apa", "mla", "chicago-author-date"] {
            assert!(styles.iter().any(|style| style.names.contains(&alias)));
        }
    }
}
