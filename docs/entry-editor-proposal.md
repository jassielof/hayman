# Entry editor: proposed final TODO

Status: approved and implemented. The guided/YAML editor and configured field profiles are retained, with flatter sections, non-destructive options, searchable field discovery and validation focus. The tests below cover the workflow; an installed screen-reader smoke test remains a manual release check.

## What is making the current form feel complicated

The same border-and-card treatment appears at several nested levels: page, section, title, person list, individual person, publisher and URL. Simple fields expose their complete Hayagriva structure immediately. A title shows a second title label, a short-form input and a verbatim checkbox even when those options are unused. A person row looks like another full form, including a prominent destructive action. Parent references appear before authors and publication details, despite being a less frequent and more complex task. These are presentation and sequencing problems; replacing the schema or adding another component framework would not solve them.

## Recommended layout

Keep one scrollable editor, not a wizard or a tab for every category. Saving and validation remain entry-wide. Use the existing native HTML controls and Bits UI for interactions that need tested keyboard/focus behavior.

```text
Edit reference                         [Guided form] [YAML]
Citation key                           [Auto-generate]
Unsaved changes                         [Cancel] [Save]

Reference
  Type                                  Date
  Title                                 [Title options]

People
  Author
    Name                                [Name details] [Remove]
    Name                                [Name details] [Remove]
    [+ Add author]
  Editor / affiliated people when configured or populated

Publication
  Publisher                             Edition
  Volume              Issue             Pages

Links and identifiers
  URL                                   [Open] [Check format]
  DOI / ISBN / other identifiers

Notes and abstract

Parent publication
  Journal / book containing this entry   [+ Add parent]

Other visible fields
  [Search and add a field…]              [Show unused fields]
```

This is a hierarchy sketch, not a fixed field list. Available fields still follow the entry type and the user's configured profile. A narrow window uses one column. Wide windows use two columns only for genuinely related short fields, never for long titles, names, abstracts or nested references.

## Interaction details

1. **A single visible label and input for ordinary text.** Short-title and verbatim options live behind a small “Title options” disclosure. Existing short/verbatim values open that disclosure automatically. Explain “Preserve capitalization” in ordinary language while retaining the exact Hayagriva `verbatim` representation. The same pattern applies to other formattable strings.
2. **Compact person rows.** Retain accessible Author/Editor/Affiliated group names and stable row identities. Put the name first; move prefix, suffix and alias into “Name details.” Family and given names are the primary structured fields. Remove is a quiet, clearly named action for that person, not a full-width red button. Never infer name order from language, split names silently, or lose a string/object's original data when switching editors.
3. **One level of visual grouping.** Use section headings, spacing and separators for the outer structure. Nested controls keep semantic fieldsets where useful, but not another colored card around every value. Keep strong borders for editable controls and clear focus indicators; decorative section separators can be subtler.
4. **Parent references come after the everyday fields.** Existing parent data is visible automatically, with a compact summary of its title and type. Each parent has an explicit edit disclosure and local heading. Preserve single/list forms, nesting limits and data while expanding/collapsing. Do not duplicate a parent into another bibliography or turn it into a separate catalog identity automatically.
5. **Field discovery is searchable.** Replace the large grid of “Add a field” buttons with a keyboard-operable searchable picker showing field names and their section. Adding one opens the relevant section and focuses its input. Keep a separate “Show unused fields” option for advanced users, and a Settings link for editing persistent field profiles.
6. **Populated data always wins over visibility defaults.** Used fields remain visible when changing type or profile, reopening an entry, or switching from YAML to guided mode. Collapsing options must never clear their values. “My fields” is a preference, not a destructive filter or completeness score.
7. **Clear save and error feedback.** Keep the citation key, unsaved status and Save/Cancel easy to find without a large overlay obscuring fields. Retain Ctrl/Cmd+S. A validation summary links to each offending input, opens any containing disclosure, and moves focus predictably. Requiredness reflects Hayagriva, not a chosen citation style.

## What stays out of this redesign

- No new bibliography schema, automatic field rewriting, cloud synchronization or automatic network requests.
- No automatic identifier lookup while typing. Quick tools remains an explicit, consent-based route; any future form shortcut opens the same reviewed lookup workflow.
- No compulsory wizard, hidden populated values, forced author-name normalization, or new UI-library migration.
- No claim that one default field profile fits every academic discipline.

## Acceptance tests before the form commit

- Repeat the original multi-person typing/focus regression in Author, Editor and Affiliated people, including deletion of a preceding row and structured family-name editing.
- Edit only a title while preserving short form, verbatim, parent data and unknown optional values that the schema supports; switch guided → YAML → guided without data loss.
- Paste YAML with previously hidden fields and nested parents; those fields and relevant options become visible immediately.
- Change entry type/profile, reveal one field, and clear a field without unrelated sections disappearing or focus jumping.
- Test keyboard-only field search, name details, parent disclosure, validation navigation, save shortcut and focus restoration.
- Run axe and contrast checks in Light, Dark and Sepia, plus narrow layouts, 200% text resizing and text-spacing overrides. Check a real installed screen reader before release.

## Suggested implementation order after approval

First flatten labels/cards and add non-destructive text options. Then redesign person rows and parent placement. Finally replace field discovery and improve validation navigation. Keep these as focused commits with regression coverage, preserving the existing field-visibility and persistence contracts throughout.
