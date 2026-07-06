<script lang="ts">
  import type { Bibliography } from '$lib/types/bibliography';
  import {
    exportBibliographiesArchive,
    type BackupArchiveFormat
  } from '$lib/utils/export-backup';
  import { Archive } from '@lucide/svelte';
  import { Dialog } from 'bits-ui';
  import { SvelteSet } from 'svelte/reactivity';

  let {
    open = $bindable(false),
    bibliographies = []
  }: {
    open?: boolean;
    bibliographies?: Bibliography[];
  } = $props();

  let selected = new SvelteSet<string>();
  let format = $state<BackupArchiveFormat>('zip-yaml');

  $effect(() => {
    if (!open) return;
    selected.clear();
    for (const bib of bibliographies) {
      selected.add(bib.metadata.id);
    }
    format = 'zip-yaml';
  });

  function toggle(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  function toggleAll() {
    if (selected.size === bibliographies.length) {
      selected.clear();
    } else {
      for (const bib of bibliographies) {
        selected.add(bib.metadata.id);
      }
    }
  }

  function exportSelected() {
    const picked = bibliographies.filter((bib) =>
      selected.has(bib.metadata.id)
    );
    exportBibliographiesArchive(picked, format);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
    <Dialog.Content
      class="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg"
    >
      <Dialog.Title class="text-lg font-semibold">Export backup</Dialog.Title>
      <Dialog.Description class="mt-1 text-sm text-muted-foreground">
        Choose bibliographies and archive format. Exports as a ZIP file.
      </Dialog.Description>

      <div class="mt-4 space-y-4">
        <label class="label flex cursor-pointer items-center gap-2 font-normal">
          <input
            type="checkbox"
            class="checkbox"
            checked={selected.size === bibliographies.length &&
              bibliographies.length > 0}
            onchange={toggleAll}
          />
          Select all ({bibliographies.length})
        </label>

        <ul
          class="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3"
        >
          {#each bibliographies as bib (bib.metadata.id)}
            <li>
              <label class="flex cursor-pointer items-center gap-2 font-normal">
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={selected.has(bib.metadata.id)}
                  onchange={() => toggle(bib.metadata.id)}
                />
                <span class="truncate">{bib.metadata.title}</span>
              </label>
            </li>
          {/each}
        </ul>

        <label class="label" for="export-format">Archive format</label>
        <select id="export-format" class="select" bind:value={format}>
          <option value="zip-yaml">ZIP — one YAML file per bibliography</option>
          <option value="zip-json">ZIP — single JSON backup</option>
        </select>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Dialog.Close class="btn btn-outline">Cancel</Dialog.Close>
        <button
          type="button"
          class="btn btn-primary"
          disabled={selected.size === 0}
          onclick={exportSelected}
        >
          <Archive class="size-4" />
          Export {selected.size} selected
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
