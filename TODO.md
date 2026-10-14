# TODOs

- [x] Preserve linked YAML comments, schema directives and ordering while editing. No-op/metadata-only saves retain source bytes and do not rewrite the file. Unsupported layouts fail safely rather than falling back to lossy serialization. Comments on removed/replaced nodes are retained at the end of the file.
- [x] Split bibliography management into three ordered sections:
  - [x] Projects link to multiple bibliographies without copying their entries, including when the library is otherwise empty.
  - [x] Locally linked bibliographies remain user-owned YAML files in their original locations, with explicit Unlink actions.
  - [x] Hayman-managed bibliographies appear last and live in Hayman's data folder, suitable for quick bibliographies and experiments.
- [x] Keep the existing All references view (`/library`) searchable across linked and managed files, with a prominent home-page entry point.
- [x] Add a quick tools section for offline Bib(La)TeX → Hayagriva conversion, YAML copy/save and selective import review.
- [x] Add explicit, consent-based DOI (Crossref), ISBN (Open Library) and arXiv metadata lookup. Validate responses with Hayagriva and stage them for review; never auto-save or enable general webview networking.
  - [x] Import Zotero/other local-manager Bib(La)TeX exports through Quick tools. Original databases, attachment files and annotations are not read or modified.
- [ ] Improve the entry form's UI after reviewing [the detailed entry-editor proposal](docs/entry-editor-proposal.md). Keep existing Bits UI/native controls, flatten nested presentation, preserve populated fields and configurable profiles, and add regression tests before changing the workflow. Implementation is intentionally pending the user's design review.
