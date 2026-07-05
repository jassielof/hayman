<script lang="ts">
  import { resolve } from '$app/paths';
  import { db } from '$lib/db';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import {
    BookOpen,
    BookPlus,
    Copy,
    Download,
    Library,
    Pencil,
    Trash
  } from '@lucide/svelte';
  import { stateQuery } from 'dexie-svelte-query';

  const bibliographyQuery = stateQuery(() => db.bibliographies.toArray());
  const bibliographyQueryLoading = $derived(bibliographyQuery.isLoading);
  const bibliographies = $derived(bibliographyQuery.current);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }
</script>

{#snippet actions()}
  <div class="gap-4">
    <a
      href={resolve('/bibliography/new')}
      class="btn btn-primary"
      title="Create a new bibliography"
    >
      <BookPlus class="size-[1.2em]" />
      New
    </a>
  </div>
{/snippet}

<main class="container mx-auto mt-8 max-w-5xl p-4">
  {#if bibliographyQueryLoading}
    <div class="flex min-h-[60vh] items-center justify-center">
      <span class="loading loading-xl loading-spinner"></span>
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
      <ul class="list rounded-box bg-base-200 shadow-md">
        {#each bibliographies as bib (bib.metadata.id)}
          <li class="list-row">
            <div class="flex h-full items-center justify-center">
              <Library class="size-[1.2em]" />
            </div>
            <div class="list-col-grow flex flex-col items-start justify-center">
              <h6 class="font-bold">{bib.metadata.title}</h6>
              <time class="text-xs opacity-60">
                Created: {formatDate(bib.metadata.createdAt)}
              </time>
              <time class="text-xs opacity-60">
                Updated: {formatDate(bib.metadata.updatedAt)}
              </time>
              <p class="mt-1 text-sm opacity-80">
                {bib.metadata.description || 'No description provided.'}
              </p>
            </div>

            <div
              class="join join-vertical flex items-center justify-end lg:join-horizontal"
            >
              <a
                href={resolve(`/bibliography/${bib.metadata.id}`)}
                class="btn join-item btn-soft"
                title="View bibliography entries"
              >
                <BookOpen class="size-[1.2em]" />
              </a>
              <a
                class="btn join-item btn-soft"
                href={resolve(`/bibliography/${bib.metadata.id}/edit`)}
                title="Edit metadata"
              >
                <Pencil class="size-[1.2em]" />
              </a>

              <button
                class="btn join-item btn-soft"
                title="Download as YAML file"
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
                title="Copy to clipboard as YAML"
                onclick={() =>
                  hayagrivaService.export(bib.data, { toClipboard: true })}
              >
                <Copy class="size-[1.2em]" />
              </button>

              <button
                class="btn join-item btn-soft btn-error"
                onclick={async () => {
                  if (
                    confirm(
                      `Are you sure you want to delete this bibliography: ${bib.metadata.title}?`
                    )
                  ) {
                    await BibliographyService.delete(bib.metadata.id);
                  }
                }}
                title={`Delete bibliography: ${bib.metadata.title}?`}
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
