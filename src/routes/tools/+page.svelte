<script lang="ts">
  import ImportEntriesDialog from '#lib/components/ImportEntriesDialog.svelte';
  import { tauriBackend } from '#lib/services/tauri-backend.js';
  import { hayagrivaService, toYaml } from '#lib/services/hayagriva.service.js';
  import type { Bibliography } from '#lib/types/bibliography.js';
  import type { Hayagriva } from '@hayman/hayagriva-schema';
  import { onMount } from 'svelte';

  let source = $state('');
  let converted = $state<Hayagriva | undefined>();
  let message = $state('');
  let error = $state('');
  let busy = $state(false);
  let bibliographies = $state<Bibliography[]>([]);
  let destination = $state('');
  let importOpen = $state(false);
  let kind = $state<'doi' | 'isbn' | 'arxiv'>('doi');
  let identifier = $state('');
  let allowNetwork = $state(false);
  const yaml = $derived(converted ? toYaml(converted) : '');
  const provider = $derived(
    kind === 'doi' ? 'Crossref' : kind === 'isbn' ? 'Open Library' : 'arXiv',
  );

  onMount(async () => {
    try {
      bibliographies = await tauriBackend.list();
    } catch (caught) {
      error = String(caught);
    }
  });

  async function convert() {
    busy = true;
    error = '';
    message = '';
    converted = undefined;
    try {
      converted = (await tauriBackend.parseImportContent(source, 'auto')).data;
      message = `Converted ${Object.keys(converted).length} references. Review the YAML before importing.`;
    } catch (caught) {
      error = String(caught);
    } finally {
      busy = false;
    }
  }

  async function readFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    busy = true;
    error = '';
    converted = undefined;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('Choose a bibliography smaller than 10 MiB.');
      source = await file.text();
      message = `Loaded ${file.name}. Select Convert to review its references.`;
    } catch (caught) {
      error = String(caught);
    } finally {
      busy = false;
      input.value = '';
    }
  }

  async function lookup() {
    busy = true;
    error = '';
    message = '';
    converted = undefined;
    try {
      converted = (
        await tauriBackend.lookupIdentifier(kind, identifier, allowNetwork)
      ).data;
      message = `Received metadata from ${provider}. Review it before importing; your bibliographies have not changed.`;
    } catch (caught) {
      error = String(caught);
    } finally {
      busy = false;
      allowNetwork = false;
    }
  }

  async function copy() {
    if (!converted) return;
    try {
      await hayagrivaService.export(converted, { toClipboard: true });
      message = 'Copied Hayagriva YAML.';
    } catch (caught) {
      error = String(caught);
    }
  }
</script>

<main id="main-content" tabindex="-1" class="mx-auto max-w-5xl space-y-6 p-6">
  <h1 class="sr-only">Quick tools</h1>
  <p class="text-sm text-muted-foreground">
    Convert and inspect references without creating a bibliography. Nothing is
    saved until you review and confirm an import.
  </p>

  <section aria-labelledby="convert-heading" class="card space-y-4 p-5">
    <h2 id="convert-heading" class="text-xl font-semibold">
      Convert to Hayagriva
    </h2>
    <p class="text-sm text-muted-foreground">
      Paste BibTeX/BibLaTeX or Hayagriva YAML, or choose a local file. This
      conversion is entirely offline.
    </p>
    <label class="label" for="convert-source">Bibliography source</label>
    <textarea
      id="convert-source"
      class="textarea min-h-48 font-mono"
      bind:value={source}
      oninput={() => (converted = undefined)}
      disabled={busy}
      spellcheck="false"></textarea>
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="btn btn-primary"
        type="button"
        onclick={convert}
        disabled={busy || !source.trim()}>Convert</button
      >
      <label class="label" for="convert-file">Choose bibliography file</label>
      <input
        id="convert-file"
        type="file"
        accept=".bib,.biblatex,.yaml,.yml"
        class="file-input w-auto max-w-full"
        onchange={readFile}
        disabled={busy}
      />
    </div>
    <details>
      <summary class="cursor-pointer text-sm font-medium"
        >Import from Zotero or another local manager</summary
      >
      <p class="mt-2 text-sm text-muted-foreground">
        Export your selected references or collection as BibLaTeX or BibTeX,
        then choose the exported file here. This imports bibliography data, not
        Zotero's database, PDFs, collections or annotations. Your original
        library is never modified.
      </p>
    </details>
  </section>

  <section aria-labelledby="lookup-heading" class="card space-y-4 p-5">
    <h2 id="lookup-heading" class="text-xl font-semibold">
      Look up an identifier
    </h2>
    <p id="lookup-privacy" class="text-sm text-muted-foreground">
      Optional online lookup. Only the identifier is sent to {provider}, not
      your bibliography or files. Requests happen only when you allow and select
      Look up. No account or cloud synchronization is used.
    </p>
    <div class="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <div>
        <label class="label" for="lookup-kind">Identifier type</label><select
          id="lookup-kind"
          class="select"
          bind:value={kind}
          disabled={busy}
          onchange={() => {
            allowNetwork = false;
            converted = undefined;
            message = '';
          }}
          ><option value="doi">DOI</option><option value="isbn">ISBN</option
          ><option value="arxiv">arXiv</option></select
        >
      </div>
      <div>
        <label class="label" for="lookup-id">Identifier</label><input
          id="lookup-id"
          class="input"
          bind:value={identifier}
          disabled={busy}
          oninput={() => {
            allowNetwork = false;
            converted = undefined;
            message = '';
          }}
          aria-describedby="lookup-privacy"
          placeholder={kind === 'doi'
            ? '10.1000/example'
            : kind === 'isbn'
              ? '9780980200447'
              : '2401.12345'}
        />
      </div>
    </div>
    <label class="flex items-start gap-2 text-sm"
      ><input
        type="checkbox"
        class="mt-1"
        bind:checked={allowNetwork}
        disabled={busy}
      />Allow this lookup to contact {provider}</label
    >
    <button
      type="button"
      class="btn btn-outline"
      disabled={busy || !allowNetwork || !identifier.trim()}
      onclick={lookup}>Look up</button
    >
  </section>

  {#if error}<p class="alert alert-error" role="alert">{error}</p>{/if}
  {#if message}<p class="text-sm" role="status">{message}</p>{/if}
  {#if busy}<p class="text-sm text-muted-foreground" role="status">
      Working…
    </p>{/if}

  {#if converted}
    <section aria-labelledby="result-heading" class="card space-y-4 p-5">
      <h2 id="result-heading" class="text-xl font-semibold">
        Hayagriva result
      </h2>
      <label class="label" for="converted-yaml">Converted Hayagriva YAML</label>
      <textarea
        id="converted-yaml"
        class="textarea min-h-64 font-mono"
        readonly
        value={yaml}
        spellcheck="false"></textarea>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline" onclick={copy}
          >Copy YAML</button
        >
        <button
          type="button"
          class="btn btn-outline"
          onclick={() =>
            hayagrivaService.export(converted!, {
              asFile: true,
              filename: 'converted.yaml',
            })}>Save YAML</button
        >
      </div>
      <label class="label" for="import-destination"
        >Import into bibliography</label
      >
      <select id="import-destination" class="select" bind:value={destination}
        ><option value="">Choose a bibliography…</option
        >{#each bibliographies as bibliography (bibliography.metadata.id)}<option
            value={bibliography.metadata.id}
            >{bibliography.metadata.title}</option
          >{/each}</select
      >
      <button
        type="button"
        class="btn btn-primary"
        disabled={!destination || busy}
        onclick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          importOpen = true;
        }}>Review import</button
      >
      <p class="text-xs text-muted-foreground">
        The import tray lets you select references, resolve citation-key
        collisions and review possible duplicates before saving.
      </p>
    </section>
  {/if}
</main>

{#if destination}
  <ImportEntriesDialog
    bind:open={importOpen}
    bibliographyId={destination}
    initialSource={yaml}
    onImported={() => {
      message = 'Imported selected references.';
    }}
  />
{/if}
