# TODOs

- [ ] Conserve comments from locally linked YAML files. If the user modifies a local YAML file, the comments shouldn't be lost, or the YAML Schema shouldn't be removed, sorting shouldn't happen, it should be reliable and not modify the file.
- [ ] Split the bibliography management into 3 sections:
  - [ ] Projects: These only link to other bibliographies. (links to many YAML files); locally-linked YAML files; and global (Hayman-managed).
  - [ ] Locally-linked bibliographies: These are just links to YAML files that are not managed by Hayman. For example, YAML files on the user's repositories or in their local file system.
  - [ ] Hayman-managed bibliographies: These are the lowest priority on usage, as they are managed and stored by Hayman, the user can still manage them, but their location is within Hayman's data folder. These might be useful for quick bibliographies or ones that the user doesn't want to manage themselves, such as using the web app for normal Typst but using local Hayman for bibliographies, or just testing how a citation or bibliogrphy would look like.
- [ ] Add a place to view all existing entries across all bibliographies (local and global)
- [ ] Add a quick tools section to convert Bib(La)TeX to Hayagriva.
- [ ] Add bibliography fetching from entry identifiers (DOI, ISBN, arXiv, etc.) (this needs to be implemented and grant network access).
  - [ ] It should be possible to get the bibliography from Zotero or other local sources, the user's Zotero could be imported into Hayman (via Hayagriva's BibLaTeX to Hayagriva converter).
- [ ] Improve the entry form's UI, the UX is somewhat fine, but the many nested fields aren't the best, if possible to use a stablished and tested design system fitting for forms.
