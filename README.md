# Hayman

A Zotero-like manager for Hayagriva. It allows you to manage multiple Hayagriva bibliographies locally (in your browser).

<!-- ## Functional Requirements

### Client-side Only

All operations are performed in the browser, or well, since it's supposed to work offline and as a PWA, all operations are expected to be client-side only, there won't be a backend or anything.

### Bibliography Management

- Each bibliography is a collection of entries in Hayagriva YAML format.
- Support for multiple bibliographies.
- Each bibliography:
  - Can be named and managed independently.
  - Can have the following optional extra metadata, which won't be stored in the YAML file, but in the local DB:
    - `id`: Unique identifier, when importing it defaults to the file name, must be unique, can be edited, it'll be used as the URL slug.
    - `title`: Title of the bibliography, defaults to the normal ID or file name, the ID is kinda like a slugged version of the filename.
    - `description` (optional): Description of the bibliography.
    - `createdAt`: Timestamp of creation.
    - `updatedAt`: Timestamp of last update.
  - The optional metadata should be editable/displayed in the index page.
  - The user should be able to create a new bibliography or select an existing one.
  - If a bibliography is imported, the metadata info should be prompted to the user to add it.
  - If no bibliography exists, the user should be prompted to create/import one.
    - Otherwise, the user should be able to select an existing bibliography, while still being able to create/import more.
    - The user can import by either pasting the YAML content or uploading a `.yaml`/`.yml` file.
    - As nice feature, would be nice if the user could import directly from a URI pointing to a raw YAML file.
    - When importing, if the bibliography ID already exists, the user should be prompted a warning and asked to provide a new ID.
  - Each bibliography ID will be a unique identifier, which can be used to reference it in the URL (e.g., `/bibliography/:id`).

### Entry Management

- Validate entries against the Hayagriva schema.
- Support for setting custom ID patterns for entries, if specified, otherwise, it should default to a sane default, such as `{Type}{Author}{Year}{Title}`.
  - Since the fields can have multiple types of values, then:
    - For the author, if its a single string, then use it directly, if it's an object, then use the last name (if available, otherwise use the given name, and keep falling back to other name parts as needed), if it's an array of strings, use the first element, if it's an array of objects, use the last name of the first object (with the same fallback logic as before).
    - For `Title`: if it's a string use it directly, if it's an object with short/long forms, use the short form.
    - For `Year`, it should use the four-digit year.

#### CRUD operations on entries

- For the creation of entries, you have to consider the Hayagriva schema.
- Also consider that entries are kinda separated in 2 types, top level and parent entries, top leves are required to have at least a type, while parent entries don't need it, it's optional for them.
- Parent entries in the parent field, can be a single entry or an array of entries.
- Each parent can have more nested parents, so the form should handle that well, considering UX/UI.
- For the views, there should be 2 types of views, a code view, where the single entry is rendered as YAML code, if possible with highlighting for YAML, and a detail view, where the content is rendered nicely, for this I have TailwindCSS/DaisyUI components along with TailwindCSS Typography plugin to help making a nice reading experience, again for this consider the parent field case.
- The user should be able to import/paste entries in YAML format, either a single entry or multiple entries at once, it should obviously be validated before adding it to the bibliography.
- The creation and update form, should be shared via a component to avoid code duplication and validation logic.
- For deletion, the user should be prompted a confirmation. In the dialog, it should show which entry/entries are going to be deleted as a list, with ID (which should link to the entry for the user to check it before deleting, it should open in a new tab or window).
- The user should be able to delete one or multiple entries at once.
- The user should have options to copy either a single or multiple entries, as well copying the whole bibliography, in YAML format to the clipboard.

### Import/Export

- Import/export bibliographies in YAML format.
- Export backup of all bibliographies.
- On the entry view, it'd be good to have a button to copy the entry in YAML format to the clipboard, as well as importing entries from the clipboard in YAML format, or from a file.

### Search & Filter

- Search, filter, and sort entries by fields (e.g., author, year, title).
- This should be allowed mainly in the entry list view of a bibliography. Since for the bibliographies is a bit useless, a simple ctrl-f should be enough. If requested later, I can add a search for bibliographies too.

## Non-Functional Requirements

### Local Storage

- Use browser's IndexedDB for persistent client-side storage (internally stored as JSON). With the help of Dexie.js for easier management.

### UI/UX

- Responsive and user-friendly design. This will be done with TailwindCSS and DaisyUI, as well with plugins.
- For design system, I'll try to follow IBM Carbon Design System patterns and guidelines, while still keeping it simple with DaisyUI components.
- Fast performance, regardless of the size of entries, I'll be using Svelte so performance is expected.
- Dark mode support, this happens automatically with DaisyUI, as well with system theme support.
- Keyboard shortcuts for common actions, or simply tab navigation support.
- Accessibility features (e.g., ARIA roles, keyboard navigation).

#### Future features on UI/UX

- On the future, it'll be possible to attach files to entries or notes, these won't have any relation with the bibliography file, but will have its relation within the indexedDB, so each entry can possibly have multiple files attached to it.
  - In this case, the exporting function should work differently, or at least have an specific option for exporting everything including the bib file, to be imported and backed up properly.

### PWA

- It should be a PWA and usable offline.
  - The PWA is kinda already done with SvelteKitPWA vite plugin.
  - Aside of that I'll need to ensure the rest of features with dev tools. -->
