# Quick tools and identifier lookup

Open Quick tools from the library home page. Offline conversion accepts pasted BibTeX/BibLaTeX or Hayagriva YAML, or a local bibliography file. It does not create a catalog record. Conversion uses the bundled Hayagriva parser; inspect the result, then copy/save YAML or open the existing selective-import tray.

To transfer references from Zotero or another local reference manager, export the selected items as BibLaTeX or BibTeX. Hayman reads that exported file, not the other application's database. Attachments, annotations and collection membership are not imported, and the original library is never modified.

## Optional network boundary

- Each lookup requires fresh consent identifying the provider. Changing the identifier/provider clears consent; completing or failing a lookup clears it too.
- Only the identifier is sent. No bibliography, source file, attachment, account credential or local path is uploaded. The provider still receives normal connection information such as the user's IP address and Hayman's user agent.
- DOI uses Crossref's BibTeX content-negotiation endpoint; ISBN uses Open Library's Books API; arXiv uses its Atom API. Not every identifier has a record at these providers. In particular, not all DOI registration agencies are Crossref; missing records are errors, not proof that the identifier is invalid.
- URLs are constructed natively from validated identifiers and fixed HTTPS endpoints. Redirects are disabled, responses are limited to 512 KiB, requests time out after 20 seconds, and requests are spaced at least three seconds apart. The webview CSP is not broadened.
- Returned metadata passes through the official Hayagriva import validator. It is staged as YAML for review and never silently overwrites or inserts entries. Citation-key collisions and possible duplicates are handled by the normal import tray.
- Review names, publication dates, entry types and other metadata before importing. Ambiguous Open Library date strings are retained in a note instead of being guessed. This is a metadata aid, not a guarantee of bibliographic correctness.

## Tests

`bun run test:a11y` checks conversion, import review, consent, theme contrast and keyboard/ARIA behavior in Chromium and WebKit using mocked native calls. No online provider is contacted by that suite.

`cargo test --all-targets --all-features` in `src-tauri` runs deterministic parser, identifier-boundary and data-integrity tests. The live provider check is ignored by default, so offline CI remains deterministic. To run it explicitly with public sample identifiers:

```sh
cargo test live_provider_smoke --lib -- --ignored --nocapture
```

The live check only fetches metadata and never writes bibliography files. Provider availability and rate limits can still make it fail.

References: [Crossref content negotiation](https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/), [Open Library Books API](https://openlibrary.org/dev/docs/api/books), [arXiv API manual](https://info.arxiv.org/help/api/user-manual.html).
