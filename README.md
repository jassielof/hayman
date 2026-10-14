# Hayman

A local-first bibliography workspace built strictly around Hayagriva files.

Hayman supports quick editing of a single linked YAML file as well as projects that search and combine several bibliographies without copying their entries. App-only data such as attachment links, trash, and project membership stays out of portable Hayagriva YAML.

## Library and quick tools

The library separates projects, locally linked YAML files, and Hayman-managed bibliographies. All references searches across them without making extra copies. Linked-file edits preserve comments, schema directives and entry order; unchanged content is not rewritten. If an edit cannot preserve the requested data safely, Hayman refuses it rather than falling back to lossy serialization. Comments attached to removed or replaced nodes are retained as standalone comments at the end of the file.

Quick tools converts pasted or local BibTeX/BibLaTeX into Hayagriva without creating a bibliography. For Zotero or another local manager, export the selected references as BibLaTeX/BibTeX first; this imports reference data, not attachments, collections or annotations. Copy/save the converted YAML or review a selective import into an existing bibliography.

Identifier lookup is optional: each DOI, ISBN or arXiv lookup requires explicit consent and sends only that identifier to Crossref, Open Library or arXiv. Results are validated with Hayagriva and shown for review, never saved automatically. Ordinary editing, conversion and previews remain offline; no account or cloud synchronization is required. See [tool safety and testing](docs/quick-tools.md).

## Citation previews

Citation and bibliography previews run locally using the bundled Hayagriva library; no external compiler is required. Choose a bundled CSL style or upload your own. Customize entry examples in Settings with plain text and citation placeholders such as `{{prose}}`, `{{normal}}`, `{{author}}`, `{{year}}`, `{{full}}`, or `{{normal|pp. 1–5}}`. Existing compiler-source templates are replaced by the default examples.

## Contributing

To build Hayman from source, ensure you have [rust][rust], [bun][bun] and the dependencies for [tauri][tauri] installed.
Then clone the repository and build, with the following commands:

```bash
git clone https://github.com/jassielof/hayman.git
cd hayman
bun install --frozen-lockfile
bun tauri build --no-bundle
```

The compiled binary will then be found in `target/release`.

### Develeoper build

To build and launch in developer mode run the following command:

```bash
bun tauri dev
```

[rust]: https://rustup.rs/
[bun]: https://bun.com/
[tauri]: https://v2.tauri.app/start/prerequisites/
