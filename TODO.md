# TODOs

- [x] Preserve linked YAML comments, schema directives and ordering while editing. No-op/metadata-only saves retain source bytes and do not rewrite the file. Unsupported layouts fail safely rather than falling back to lossy serialization. Comments on removed/replaced nodes are retained at the end of the file.
- [ ] Split the bibliography management into 3 sections:
  - [ ] Projects: These only link to other bibliographies. (links to many YAML files); locally-linked YAML files; and global (Hayman-managed).
  - [ ] Locally-linked bibliographies: These are just links to YAML files that are not managed by Hayman. For example, YAML files on the user's repositories or in their local file system.
  - [ ] Hayman-managed bibliographies: These are the lowest priority on usage, as they are managed and stored by Hayman, the user can still manage them, but their location is within Hayman's data folder. These might be useful for quick bibliographies or ones that the user doesn't want to manage themselves, such as using the web app for normal Typst but using local Hayman for bibliographies, or just testing how a citation or bibliogrphy would look like.
- [ ] Add a place to view all existing entries across all bibliographies (local and global)
- [x] Add a quick tools section for offline Bib(La)TeX → Hayagriva conversion, YAML copy/save and selective import review.
- [x] Add explicit, consent-based DOI (Crossref), ISBN (Open Library) and arXiv metadata lookup. Validate responses with Hayagriva and stage them for review; never auto-save or enable general webview networking.
  - [x] Import Zotero/other local-manager Bib(La)TeX exports through Quick tools. Original databases, attachment files and annotations are not read or modified.
- [ ] Improve the entry form's UI, the UX is somewhat fine, but the many nested fields aren't the best, if possible to use a stablished and tested design system fitting for forms.
