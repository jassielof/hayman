<script lang="ts">
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { tauriBackend } from '$lib/services/tauri-backend';
  import { duplicateFingerprint } from '$lib/utils/duplicate-detection';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import type { Hayagriva, TopLevelEntry } from '@hayman/hayagriva-schema';
  import {
    ClipboardPasteIcon,
    FileUpIcon,
    ImportIcon,
    PlusIcon,
    XIcon,
  } from '@lucide/svelte';
  import { tick } from 'svelte';

  type ImportRow = {
    key: string;
    originalKey: string;
    entry: TopLevelEntry;
    selected: boolean;
    sourceFormat: string;
    duplicate: boolean;
  };

  let {
    open = $bindable(false),
    bibliographyId,
    onImported,
  }: {
    open?: boolean;
    bibliographyId: string;
    onImported?: () => void | Promise<void>;
  } = $props();

  let source = $state('');
  let format = $state<'auto' | 'yaml' | 'biblatex'>('auto');
  let rows = $state<ImportRow[]>([]);
  let existing = $state<Hayagriva>({});
  let message = $state<string | undefined>();
  let busy = $state(false);
  let files: FileList | undefined = $state(undefined);
  let dialogElement: HTMLDivElement | undefined = $state(undefined);

  $effect(() => {
    if (!open) return;
    void tick().then(() => dialogElement?.focus());
    BibliographyService.get(bibliographyId).then(
      (bibliography) => (existing = bibliography.data),
      (error) => (message = String(error)),
    );
  });

  $effect(() => {
    if (!files?.length) return;
    const pending = [...files];
    files = undefined;
    void addFiles(pending);
  });

  function nextAvailableKey(candidate: string): string {
    const base = candidate.trim() || 'entry';
    const used = new Set([
      ...Object.keys(existing),
      ...rows.map((row) => row.key),
    ]);
    if (!used.has(base)) return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  function matchesExisting(entry: TopLevelEntry): boolean {
    const fingerprints = new Set(duplicateFingerprint(entry));
    if (fingerprints.size === 0) return false;
    return [...Object.values(existing), ...rows.map((row) => row.entry)].some(
      (candidate) =>
        duplicateFingerprint(candidate).some((value) =>
          fingerprints.has(value),
        ),
    );
  }

  function stage(data: Hayagriva, sourceFormat: string) {
    const additions = Object.entries(data).map(([originalKey, entry]) => ({
      key: nextAvailableKey(originalKey),
      originalKey,
      entry,
      selected: true,
      sourceFormat,
      duplicate: matchesExisting(entry),
    }));
    rows = [...rows, ...additions];
    message = `Added ${additions.length} ${additions.length === 1 ? 'entry' : 'entries'} to the import tray.`;
  }

  async function addSource() {
    if (!source.trim()) return;
    busy = true;
    message = undefined;
    try {
      const parsed = await tauriBackend.parseImportContent(source, format);
      stage(parsed.data, parsed.sourceFormat);
      source = '';
    } catch (error) {
      message = String(error);
    } finally {
      busy = false;
    }
  }

  async function pasteSource() {
    source = await navigator.clipboard.readText();
    await addSource();
  }

  async function addFiles(selectedFiles: File[]) {
    busy = true;
    message = undefined;
    try {
      for (const file of selectedFiles) {
        const content = await file.text();
        const selectedFormat = file.name.toLowerCase().endsWith('.bib')
          ? 'biblatex'
          : 'yaml';
        const parsed = await tauriBackend.parseImportContent(
          content,
          selectedFormat,
        );
        stage(parsed.data, parsed.sourceFormat);
      }
    } catch (error) {
      message = String(error);
    } finally {
      busy = false;
    }
  }

  function updateKey(index: number, value: string) {
    rows[index].key = value.trim();
  }

  async function importSelected() {
    const selected = rows.filter((row) => row.selected);
    const keys = selected.map((row) => row.key);
    if (selected.length === 0) {
      message = 'Select at least one entry.';
      return;
    }
    if (keys.some((key) => !key)) {
      message = 'Every selected entry needs a citation key.';
      return;
    }
    if (new Set(keys).size !== keys.length) {
      message = 'Citation keys must be unique.';
      return;
    }
    if (keys.some((key) => existing[key])) {
      message = 'A selected citation key already exists in this bibliography.';
      return;
    }

    busy = true;
    message = undefined;
    try {
      await BibliographyService.importEntries(
        bibliographyId,
        Object.fromEntries(
          selected.map((row) => [row.key, row.entry]),
        ) as Hayagriva,
      );
      rows = [];
      open = false;
      await onImported?.();
    } catch (error) {
      message = String(error);
    } finally {
      busy = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget && !busy) open = false;
    }}
  >
    <div
      bind:this={dialogElement}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-entries-title"
      class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
      onkeydown={(event) => {
        if (event.key === 'Escape' && !busy) open = false;
      }}
    >
      <header class="flex items-start justify-between gap-4">
        <div>
          <h2 id="import-entries-title" class="text-xl font-semibold">
            Import references
          </h2>
          <p class="text-sm text-muted-foreground">
            Add any number of Hayagriva YAML and BibTeX/BibLaTeX sources, then
            choose what to import.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-square"
          aria-label="Close import dialog"
          disabled={busy}
          onclick={() => (open = false)}
        >
          <XIcon class="size-5" />
        </button>
      </header>

      <div
        class="mt-5 grid gap-3 rounded-lg border border-border bg-muted/30 p-4"
      >
        <label class="label" for="import-source">Paste bibliography data</label>
        <textarea
          id="import-source"
          class="textarea min-h-36 font-mono"
          placeholder={'paper:\n  type: article\n  title: …\n\nor @article{paper, …}'}
          bind:value={source}></textarea>
        <div class="flex flex-wrap gap-2">
          <select
            class="select w-auto"
            aria-label="Import format"
            bind:value={format}
          >
            <option value="auto">Detect format</option>
            <option value="yaml">Hayagriva YAML</option>
            <option value="biblatex">BibTeX/BibLaTeX</option>
          </select>
          <button
            type="button"
            class="btn btn-primary"
            disabled={busy || !source.trim()}
            onclick={addSource}
          >
            <PlusIcon class="size-4" /> Add source
          </button>
          <button
            type="button"
            class="btn btn-outline"
            disabled={busy}
            onclick={pasteSource}
          >
            <ClipboardPasteIcon class="size-4" /> Paste and add
          </button>
          <label class="btn btn-outline" for="batch-import-files">
            <FileUpIcon class="size-4" /> Add files
            <input
              id="batch-import-files"
              class="sr-only"
              type="file"
              multiple
              accept=".yaml,.yml,.bib,application/yaml"
              bind:files
            />
          </label>
        </div>
      </div>

      {#if message}
        <p
          class="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm"
          role="status"
        >
          {message}
        </p>
      {/if}

      {#if rows.length > 0}
        <div class="mt-5 overflow-x-auto rounded-lg border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/70 text-xs text-muted-foreground uppercase">
              <tr>
                <th class="p-3">Include</th>
                <th class="p-3">Citation key</th>
                <th class="p-3">Reference</th>
                <th class="p-3">Source</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each rows as row, index (`${row.originalKey}-${index}`)}
                <tr
                  class:bg-warning={row.duplicate}
                  class:text-warning-foreground={row.duplicate}
                >
                  <td class="p-3 align-top">
                    <input
                      class="checkbox"
                      type="checkbox"
                      aria-label={`Include ${row.key}`}
                      bind:checked={row.selected}
                    />
                  </td>
                  <td class="min-w-48 p-3 align-top">
                    <input
                      class="input input-sm font-mono"
                      aria-label={`Citation key for ${row.originalKey}`}
                      value={row.key}
                      oninput={(event) =>
                        updateKey(index, event.currentTarget.value)}
                    />
                    {#if row.key !== row.originalKey}
                      <p class="mt-1 text-xs text-muted-foreground">
                        Renamed from {row.originalKey}
                      </p>
                    {/if}
                  </td>
                  <td class="p-3 align-top">
                    <p class="font-medium">
                      {formatFormattableString(row.entry.title) || 'Untitled'}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {row.entry.type}{row.entry.author
                        ? ` · ${formatAuthor(row.entry.author)}`
                        : ''}
                    </p>
                    {#if row.duplicate}
                      <p
                        class="mt-1 text-xs font-medium text-warning-foreground"
                      >
                        Possible duplicate; review before importing.
                      </p>
                    {/if}
                  </td>
                  <td class="p-3 align-top text-xs text-muted-foreground"
                    >{row.sourceFormat}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <footer
        class="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4"
      >
        <button
          type="button"
          class="btn btn-ghost"
          disabled={busy}
          onclick={() => (open = false)}>Cancel</button
        >
        <button
          type="button"
          class="btn btn-primary"
          disabled={busy || rows.every((row) => !row.selected)}
          onclick={importSelected}
        >
          <ImportIcon class="size-4" />
          Import {rows.filter((row) => row.selected).length || ''} selected
        </button>
      </footer>
    </div>
  </div>
{/if}
