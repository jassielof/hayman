<script lang="ts">
  import { resolve } from '$app/paths';
  import ExportBackupDialog from '$lib/components/ExportBackupDialog.svelte';
  import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import { tauriBackend } from '$lib/services/tauri-backend';
  import type { Bibliography } from '$lib/types/bibliography';
  import {
    ArchiveIcon,
    BookOpenIcon,
    BookPlusIcon,
    CopyIcon,
    DownloadIcon,
    LibraryIcon,
    LinkIcon,
    PencilIcon,
    TrashIcon,
  } from '@lucide/svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { onMount } from 'svelte';

  let desktopBibliographies = $state<Bibliography[] | undefined>();
  let desktopError = $state<string | undefined>();
  const bibliographyQueryLoading = $derived(
    desktopBibliographies === undefined,
  );
  const bibliographies = $derived(desktopBibliographies);

  async function refreshDesktop() {
    try {
      desktopBibliographies = await BibliographyService.getAll();
      desktopError = undefined;
    } catch (error) {
      desktopError = String(error);
      desktopBibliographies = [];
    }
  }

  onMount(refreshDesktop);

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
    await refreshDesktop();
  }

  async function linkProjectBibliography() {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Hayagriva bibliography', extensions: ['yml', 'yaml'] },
      ],
    });
    if (!selected) return;
    try {
      await tauriBackend.link(selected);
      await refreshDesktop();
    } catch (error) {
      desktopError = String(error);
    }
  }

  async function copyYaml(bib: Bibliography) {
    await hayagrivaService.export(bib.data, { toClipboard: true });
    copyFeedback = bib.metadata.id;
    setTimeout(() => (copyFeedback = null), 2000);
  }
</script>

{#snippet actions(centered = false)}
  <div
    class="flex flex-wrap gap-2"
    class:justify-center={centered}
    class:justify-end={!centered}
  >
    {#if (bibliographies ?? []).length > 0}
      <button
        type="button"
        class="btn btn-outline"
        aria-label="Export backup of bibliographies"
        onclick={() => (exportOpen = true)}
      >
        <ArchiveIcon class="size-[1.2em]" />
        Export backup
      </button>
    {/if}
    <button
      type="button"
      class="btn btn-outline"
      onclick={linkProjectBibliography}
    >
      <LinkIcon class="size-[1.2em]" />
      Link project file
    </button>
    <a
      href={resolve('/bibliography/new')}
      class="btn btn-primary"
      aria-label="Create a new bibliography"
    >
      <BookPlusIcon class="size-[1.2em]" />
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
  {#if desktopError}
    <div class="alert alert-error mb-4" role="alert">{desktopError}</div>
  {/if}
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
      {@render actions(true)}
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
              <LibraryIcon class="size-6 shrink-0" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h6 class="truncate font-bold">{bib.metadata.title}</h6>
              {#if bib.metadata.storageKind}
                <p
                  class="truncate text-xs font-medium text-primary"
                  title={bib.metadata.filePath}
                >
                  {bib.metadata.storageKind === 'linked'
                    ? 'Linked project file'
                    : 'Managed by Hayman'}
                  · {bib.metadata.filePath}
                </p>
              {/if}
              <p class="text-xs text-muted-foreground">
                Created {formatDate(bib.metadata.createdAt)} · Updated
                {formatDate(bib.metadata.updatedAt)}
              </p>
              <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {bib.metadata.description || 'No description provided.'}
              </p>
            </div>

            <div
              class="col-span-2 flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 sm:col-span-1"
            >
              <a
                href={resolve(`/bibliography/${bib.metadata.id}`)}
                class="btn btn-sm btn-outline"
                aria-label={`View entries in ${bib.metadata.title}`}
              >
                <BookOpenIcon class="size-4" />
                <span>View</span>
              </a>
              <a
                class="btn btn-sm btn-outline"
                href={resolve(`/bibliography/${bib.metadata.id}/edit`)}
                aria-label={`Edit metadata for ${bib.metadata.title}`}
              >
                <PencilIcon class="size-4" />
                <span>Edit</span>
              </a>
              <button
                class="btn btn-sm btn-outline"
                aria-label={`Download ${bib.metadata.title} as YAML`}
                title="Download YAML"
                onclick={() =>
                  hayagrivaService.export(bib.data, {
                    asFile: true,
                    filename: `${bib.metadata.id}.yaml`,
                  })}
              >
                <DownloadIcon class="size-4" />
                <span class="sr-only">Download YAML</span>
              </button>
              <button
                class="btn btn-sm btn-outline"
                aria-label={`Copy ${bib.metadata.title} YAML to clipboard`}
                title="Copy YAML"
                onclick={() => copyYaml(bib)}
              >
                <CopyIcon class="size-4" />
                <span class="sr-only">Copy YAML</span>
              </button>
              <button
                class="btn btn-sm btn-destructive"
                aria-label={`Delete bibliography ${bib.metadata.title}`}
                onclick={() => requestDelete(bib)}
              >
                <TrashIcon class="size-4" />
                <span>Delete</span>
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
