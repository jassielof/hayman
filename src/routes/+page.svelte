<script lang="ts">
  import { resolve } from '$app/paths';
  import ExportBackupDialog from '$lib/components/ExportBackupDialog.svelte';
  import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
  import { db } from '$lib/db';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import type { Bibliography } from '$lib/types/bibliography';
  import {
    Archive,
    BookOpen,
    BookPlus,
    Copy,
    Download,
    Library,
    Pencil,
    Trash,
  } from '@lucide/svelte';
  import { stateQuery } from 'dexie-svelte-query';

  const bibliographyQuery = stateQuery(() => db.bibliographies.toArray());
  const bibliographyQueryLoading = $derived(bibliographyQuery.isLoading);
  const bibliographies = $derived(bibliographyQuery.current);

  let deleteOpen = $state(false);
  let exportOpen = $state(false);
  let pendingDelete = $state<Bibliography | null>(null);
  let copyFeedback = $state<string | null>(null);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  function requestDelete(bib: Bibliography) {
    pendingDelete = bib;
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await BibliographyService.delete(pendingDelete.metadata.id);
    pendingDelete = null;
  }

  async function copyYaml(bib: Bibliography) {
    await hayagrivaService.export(bib.data, { toClipboard: true });
    copyFeedback = bib.metadata.id;
    setTimeout(() => (copyFeedback = null), 2000);
  }
</script>

{#snippet actions()}
  <div class="flex flex-wrap justify-end gap-2">
    {#if (bibliographies ?? []).length > 0}
      <button
        type="button"
        class="btn btn-outline"
        aria-label="Export backup of bibliographies"
        onclick={() => (exportOpen = true)}
      >
        <Archive class="size-[1.2em]" />
        Export backup
      </button>
    {/if}
    <a
      href={resolve('/bibliography/new')}
      class="btn btn-primary"
      aria-label="Create a new bibliography"
    >
      <BookPlus class="size-[1.2em]" />
      New
    </a>
  </div>
{/snippet}

<ExportBackupDialog
  bind:open={exportOpen}
  bibliographies={bibliographies ?? []}
/>

<ConfirmDialog
  bind:open={deleteOpen}
  title="Delete bibliography?"
  description={pendingDelete
    ? `Are you sure you want to delete "${pendingDelete.metadata.title}"? All entries will be permanently removed.`
    : undefined}
  confirmLabel="Delete"
  destructive={true}
  onConfirm={confirmDelete}
/>

<main class="container mx-auto mt-8 max-w-5xl p-4">
  {#if bibliographyQueryLoading}
    <div
      class="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span class="loading loading-xl loading-spinner" aria-hidden="true"
      ></span>
      <span class="sr-only">Loading bibliographies…</span>
    </div>
  {:else if (bibliographies ?? []).length === 0}
    <section class="grid min-h-[60vh] place-content-center text-center">
      <h2 class="text-2xl font-bold">No bibliographies found</h2>
      <p class="mt-2 mb-4">Create a new one or import it from a YAML file.</p>
      {@render actions()}
    </section>
  {:else}
    <div class="mb-4 flex justify-end">
      {@render actions()}
    </div>

    <div class="overflow-x-auto">
      <ul class="list shadow-md">
        {#each bibliographies as bib (bib.metadata.id)}
          <li
            class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <div class="flex items-center justify-center">
              <Library class="size-6 shrink-0" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h6 class="truncate font-bold">{bib.metadata.title}</h6>
              <p class="text-xs text-muted-foreground">
                Created {formatDate(bib.metadata.createdAt)} · Updated
                {formatDate(bib.metadata.updatedAt)}
              </p>
              <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {bib.metadata.description || 'No description provided.'}
              </p>
            </div>

            <div
              class="col-span-2 flex shrink-0 flex-row items-center justify-end gap-1 sm:col-span-1"
            >
              <a
                href={resolve(`/bibliography/${bib.metadata.id}`)}
                class="btn btn-sm btn-soft"
                aria-label={`View entries in ${bib.metadata.title}`}
              >
                <BookOpen class="size-4" />
              </a>
              <a
                class="btn btn-sm btn-soft"
                href={resolve(`/bibliography/${bib.metadata.id}/edit`)}
                aria-label={`Edit metadata for ${bib.metadata.title}`}
              >
                <Pencil class="size-4" />
              </a>
              <button
                class="btn btn-sm btn-soft"
                aria-label={`Download ${bib.metadata.title} as YAML`}
                onclick={() =>
                  hayagrivaService.export(bib.data, {
                    asFile: true,
                    filename: `${bib.metadata.id}.yaml`,
                  })}
              >
                <Download class="size-4" />
              </button>
              <button
                class="btn btn-sm btn-soft"
                aria-label={`Copy ${bib.metadata.title} YAML to clipboard`}
                onclick={() => copyYaml(bib)}
              >
                <Copy class="size-4" />
              </button>
              <button
                class="btn btn-sm btn-soft btn-error"
                aria-label={`Delete bibliography ${bib.metadata.title}`}
                onclick={() => requestDelete(bib)}
              >
                <Trash class="size-4" />
              </button>
              {#if copyFeedback === bib.metadata.id}
                <span class="text-xs text-primary" role="status">Copied!</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</main>
