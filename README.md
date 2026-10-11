# Hayman

A local-first bibliography workspace built strictly around Hayagriva files.

Hayman supports quick editing of a single linked YAML file as well as projects that search and combine several bibliographies without copying their entries. App-only data such as attachment links, trash, and project membership stays out of portable Hayagriva YAML.

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
