//! Enumerate family names through DirectWrite, CoreText or Fontconfig.
//! Never return font paths or read font bytes into the frontend.
#[tauri::command]
pub async fn list_system_fonts() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        font_kit::source::SystemSource::new()
            .all_families()
            .map(normalize_families)
            .map_err(|error| format!("Could not list installed fonts: {error}"))
    })
    .await
    .map_err(|error| format!("Font discovery worker failed: {error}"))?
}

fn normalize_families(families: Vec<String>) -> Vec<String> {
    let mut families: Vec<_> = families
        .into_iter()
        .map(|name| name.trim().to_owned())
        .filter(|name| !name.is_empty())
        .collect();
    families.sort_by_key(|name| name.to_lowercase());
    families.dedup_by(|a, b| a.to_lowercase() == b.to_lowercase());
    families
}

#[cfg(test)]
mod tests {
    #[test]
    fn families_are_trimmed_sorted_and_unique() {
        assert_eq!(
            super::normalize_families(vec![
                "游ゴシック".into(),
                " Inter ".into(),
                "inter".into(),
                "".into()
            ]),
            vec!["Inter", "游ゴシック"]
        );
    }

    #[test]
    fn native_font_discovery_works_without_a_window() {
        let families = font_kit::source::SystemSource::new()
            .all_families()
            .unwrap();
        // Minimal headless Linux installations may legitimately have no fonts.
        assert!(families.iter().all(|family| !family.trim().is_empty()));
    }
}
