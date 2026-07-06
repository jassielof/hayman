<script lang="ts">
  import { resolve } from '$app/paths';
  import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
  import { db } from '$lib/db';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import type { Bibliography } from '$lib/types/bibliography';
  import {
    BookOpen,
    BookPlus,
    Copy,
    Download,
    Library,
    Pencil,
    Trash,
    Archive
  } from '@lucide/svelte';
  import { stateQuery } from 'dexie-svelte-query';

  const bibliographyQuery = stateQuery(() => db.bibliographies.toArray());
  const bibliographyQueryLoading = $derived(bibliographyQuery.isLoading);
  const bibliographies = $derived(bibliographyQuery.current);

  let deleteOpen = $state(false);
  let pendingDelete = $state<Bibliography | null>(null);
  let copyFeedback = $state<string | null>(null);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  function exportAllBackup() {
    const payload = JSON.stringify(bibliographies ?? [], null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hayagriva-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
</script>

{#snippet actions()}
  <div class="flex flex-wrap justify-end gap-2">
    {#if (bibliographies ?? []).length > 0}
      <button
        type="button"
        class="btn btn-outline"
        aria-label="Export backup of all bibliographies"
        onclick={exportAllBackup}
      >
      <!-- TODO: This should export it as an compressed archive, either way, the user should be able to select which ones to export/backup, and which format, either as Zip or Tarball. -->
        <Archive class="size-[1.2em]" />
        Export all
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
          <li class="list-row">
            <div class="flex h-full items-center justify-center">
              <Library class="size-[1.2em]" aria-hidden="true" />
            </div>
            <div class="list-col-grow flex flex-col items-start justify-center">
              <h6 class="font-bold">{bib.metadata.title}</h6>
              <time class="text-xs text-muted-foreground">
                Created: {formatDate(bib.metadata.createdAt)}
              </time>
              <time class="text-xs text-muted-foreground">
                Updated: {formatDate(bib.metadata.updatedAt)}
              </time>
              <p class="mt-1 text-sm text-muted-foreground">
                {bib.metadata.description || 'No description provided.'}
              </p>
            </div>

            <div class="join join-vertical lg:join-horizontal">
              <a
                href={resolve(`/bibliography/${bib.metadata.id}`)}
                class="btn join-item btn-soft"
                aria-label={`View entries in ${bib.metadata.title}`}
              >
                <BookOpen class="size-[1.2em]" />
              </a>
              <a
                class="btn join-item btn-soft"
                href={resolve(`/bibliography/${bib.metadata.id}/edit`)}
                aria-label={`Edit metadata for ${bib.metadata.title}`}
              >
                <Pencil class="size-[1.2em]" />
              </a>

              <!-- TODO: The layout of these buttons just looks ugly, it's all vertical, and there's too much blank space between the bibliography and the buttons -->
              <button
                class="btn join-item btn-soft"
                aria-label={`Download ${bib.metadata.title} as YAML`}
                onclick={() =>
                  hayagrivaService.export(bib.data, {
                    asFile: true,
                    filename: `${bib.metadata.id}.yaml`
                  })}
              >
                <Download class="size-[1.2em]" />
              </button>

              <button
                class="btn join-item btn-soft"
                aria-label={`Copy ${bib.metadata.title} YAML to clipboard`}
                onclick={() => copyYaml(bib)}
              >
                <Copy class="size-[1.2em]" />
              </button>
              {#if copyFeedback === bib.metadata.id}
                <span class="text-xs text-primary" role="status">Copied!</span>
              {/if}

              <button
                class="btn join-item btn-soft btn-error"
                aria-label={`Delete bibliography ${bib.metadata.title}`}
                onclick={() => requestDelete(bib)}
              >
                <Trash class="size-[1.2em]" />
              </button>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</main>
