# Hayman

A local-first bibliography workspace built strictly around Hayagriva files.

Hayman supports quick editing of a single linked YAML file as well as projects that search and combine several bibliographies without copying their entries. App-only data such as attachment links, trash, and project membership stays out of portable Hayagriva YAML.

## Prerequisites

Install Typst to enable citation previews. Editing and validation continue to work without it.

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
