//! Patch user-owned YAML rather than reserializing it. Preserve untouched nodes
//! and refuse edits if the lossless editor cannot reproduce the requested data.
use serde_json::Value;
use std::str::FromStr;
use yaml_edit::{Document, Mapping, YamlFile, YamlNode};

type Result<T> = std::result::Result<T, String>;

pub fn update(source: &str, before: &Value, after: &Value) -> Result<String> {
    if before == after {
        return Ok(source.to_owned());
    }
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        patch(source, before, after)
    }))
    .map_err(|_| {
        "Could not safely edit this YAML layout. The original file was not changed.".to_owned()
    })?
}

fn patch(source: &str, before: &Value, after: &Value) -> Result<String> {
    let bom = source.starts_with('\u{feff}');
    let text = source.trim_start_matches('\u{feff}');
    let crlf = text.contains("\r\n") && !text.replace("\r\n", "").contains('\n');
    let normalized = if crlf {
        text.replace("\r\n", "\n")
    } else {
        text.to_owned()
    };
    let file = YamlFile::from_str(&normalized)
        .map_err(|e| format!("Cannot safely edit this YAML: {e}"))?;
    if file.documents().count() != 1 {
        return Err("Linked bibliographies must contain exactly one YAML document.".into());
    }
    let mapping = file
        .document()
        .and_then(|d| d.as_mapping())
        .ok_or("Expected a YAML mapping.")?;
    let comments: Vec<_> = file.comments().map(|c| c.content().to_string()).collect();
    merge_mapping(&mapping, before, after)?;
    // Comments attached to a deleted/replaced node must not silently disappear.
    // Keep those as standalone comments at EOF; untouched comments stay in place.
    let mut retained: Vec<_> = file.comments().map(|c| c.content().to_string()).collect();
    let mut missing = Vec::new();
    for comment in comments {
        if let Some(index) = retained.iter().position(|c| c == &comment) {
            retained.remove(index);
        } else {
            missing.push(comment);
        }
    }
    let mut output = file.to_string();
    if !missing.is_empty() {
        if !output.ends_with('\n') {
            output.push('\n');
        }
        output.push_str("# Comments retained from removed or replaced fields:\n");
        for comment in missing {
            output.push_str("# ");
            output.push_str(&comment);
            output.push('\n');
        }
    }
    let actual: Value = serde_yaml::from_str(&output)
        .map_err(|e| format!("Edited YAML was invalid: {e}. The original file was not changed."))?;
    if actual != *after {
        return Err("This YAML layout could not be edited without changing other data. The original file was not changed.".into());
    }
    if crlf {
        output = output.replace('\n', "\r\n");
    }
    if bom {
        output.insert(0, '\u{feff}');
    }
    Ok(output)
}

fn node(value: &Value) -> Result<YamlNode> {
    let wrapper = serde_json::json!({ "value": value });
    let text = serde_yaml::to_string(&wrapper).map_err(|e| e.to_string())?;
    Document::from_str(&text)
        .map_err(|e| e.to_string())?
        .get("value")
        .ok_or("Could not encode YAML value.".into())
}

fn merge_mapping(mapping: &Mapping, before: &Value, after: &Value) -> Result<()> {
    let old = before.as_object().ok_or("Expected old mapping.")?;
    let new = after.as_object().ok_or("Expected new mapping.")?;
    for key in old.keys().filter(|key| !new.contains_key(*key)) {
        mapping.remove(key.as_str());
    }
    for (key, value) in new {
        if old.get(key) == Some(value) {
            continue;
        }
        if let (Some(previous), Some(existing)) = (old.get(key), mapping.get(key.as_str()))
            && merge_node(&existing, previous, value)?
        {
            continue;
        }
        mapping.set(key.as_str(), node(value)?);
    }
    Ok(())
}

fn merge_node(existing: &YamlNode, before: &Value, after: &Value) -> Result<bool> {
    if let Some(mapping) = existing.as_mapping()
        && before.is_object()
        && after.is_object()
    {
        merge_mapping(mapping, before, after)?;
        return Ok(true);
    }
    if let (Some(sequence), Some(old), Some(new)) =
        (existing.as_sequence(), before.as_array(), after.as_array())
    {
        for index in (new.len()..old.len()).rev() {
            sequence.remove(index);
        }
        for (index, value) in new.iter().enumerate() {
            if old.get(index) == Some(value) {
                continue;
            }
            if let (Some(previous), Some(item)) = (old.get(index), sequence.get(index))
                && merge_node(&item, previous, value)?
            {
                continue;
            }
            if index < sequence.len() {
                sequence.set(index, node(value)?);
            } else {
                sequence.push(node(value)?);
            }
        }
        return Ok(true);
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn data(text: &str) -> Value {
        serde_yaml::from_str(text).unwrap()
    }

    #[test]
    fn no_op_preserves_every_byte() {
        let source = "# yaml-language-server: $schema=hayagriva.json\r\n---\r\nz: {type: book, title: 'Original'} # note\r\n";
        assert_eq!(
            update(source, &data(source), &data(source)).unwrap(),
            source
        );
    }

    #[test]
    fn edits_preserve_schema_comments_key_order_and_untouched_formatting() {
        let source = "# yaml-language-server: $schema=hayagriva.json\n# notes\nz:\n  type: book\n  title: Original # title note\n  author: ['Doe, Jane', 'Smith, Alex']\n\na: {type: article, title: 'Untouched'} # leave alone\n";
        let before = data(source);
        let mut after = before.clone();
        after["z"]["title"] = "Updated".into();
        let result = update(source, &before, &after).unwrap();
        assert!(result.starts_with("# yaml-language-server: $schema=hayagriva.json\n# notes\nz:"));
        assert!(result.contains("title note"));
        assert!(result.contains("author: ['Doe, Jane', 'Smith, Alex']"));
        assert!(result.contains("a: {type: article, title: 'Untouched'} # leave alone"));
        assert_eq!(data(&result), after);
    }

    #[test]
    fn appending_and_removing_do_not_sort_and_keep_comments() {
        let source = "z:\n  type: book\n  title: Remove me # important\na:\n  type: article\n";
        let before = data(source);
        let mut after = before.clone();
        after.as_object_mut().unwrap().remove("z");
        after["b"] = serde_json::json!({"type":"book", "title":"New"});
        let result = update(source, &before, &after).unwrap();
        assert!(result.find("a:").unwrap() < result.find("b:").unwrap());
        assert!(result.contains("important"));
        assert_eq!(data(&result), after);
    }

    #[test]
    fn nested_people_parent_and_flow_edits_are_semantically_exact() {
        let source = "z:\n  type: article\n  author:\n    - name: Doe # family\n      given-name: Jane\n    - Smith, Alex # second\n  parent: {type: periodical, title: Journal}\n";
        let before = data(source);
        let mut after = before.clone();
        after["z"]["author"][0]["given-name"] = "Janet".into();
        after["z"]["parent"]["title"] = "Changed journal".into();
        let result = update(source, &before, &after).unwrap();
        assert!(result.contains("# family"));
        assert!(result.contains("# second"));
        assert_eq!(data(&result), after);
    }

    #[test]
    fn preserves_crlf_and_handles_scalar_types() {
        let source = "z:\r\n  type: book\r\n  title: Original\r\n  date: 2024\r\n";
        let before = data(source);
        let mut after = before.clone();
        after["z"]["title"] = "true".into();
        after["z"]["date"] = "2024-03".into();
        let result = update(source, &before, &after).unwrap();
        assert!(!result.replace("\r\n", "").contains('\n'));
        assert_eq!(data(&result), after);
    }

    #[test]
    fn rejects_multiple_documents_and_mismatched_data() {
        let source = "a: 1\n---\nb: 2\n";
        assert!(update(source, &serde_json::json!({}), &serde_json::json!({"a": 2})).is_err());
        assert!(
            update(
                "a: 1\n",
                &serde_json::json!({"b": 1}),
                &serde_json::json!({"b": 2})
            )
            .is_err()
        );
    }
}
