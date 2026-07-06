<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import BibliographyTypstPreview from '$lib/components/BibliographyTypstPreview.svelte';
  import EntryList from '$lib/components/EntryList.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { BookPlus } from '@lucide/svelte';
  import { stateQuery } from 'dexie-svelte-query';

  const bibliographyId = page.params.bibliographyId;
  const bibliographyQuery = stateQuery(() =>
    BibliographyService.getOrNull(bibliographyId!)
  );

  const bibliographyQueryLoading = $derived(bibliographyQuery.isLoading);
  const bibliography = $derived(bibliographyQuery.current);
</script>

<main class="mx-auto flex w-full max-w-5xl flex-col p-4">
  {#if bibliographyQueryLoading}
    <div
      class="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span class="loading loading-xl loading-spinner" aria-hidden="true"
      ></span>
      <span class="sr-only">Loading bibliography…</span>
    </div>
  {:else if bibliography === null || bibliography === undefined}
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p role="alert" class="text-lg text-error">Bibliography not found.</p>
      <a class="btn btn-primary" href={resolve('/')}>Back to home</a>
    </div>
  {:else}
    <Breadcrumbs
      items={[
        { label: 'Home', href: '/' },
        { label: bibliography.metadata.title }
      ]}
    />

    <div class="flex flex-col gap-2 md:flex-row">
      <div class="mb-2 flex-auto">
        <h1 class="truncate text-2xl font-bold">
          {bibliography.metadata.title}
        </h1>
        {#if bibliography.metadata.description}
          <p class="truncate text-sm opacity-70">
            {bibliography.metadata.description}
          </p>
        {/if}
      </div>
      <div class="flex flex-auto items-end justify-end md:items-start">
        <a
          class="btn btn-primary"
          href={resolve(`/bibliography/${bibliography.metadata.id}/entry/`)}
        >
          <BookPlus class="size-[1.2em]" />
          New entry
        </a>
      </div>
    </div>

    <EntryList
      entries={bibliography.data}
      bibliographyId={bibliography.metadata.id}
    />

    <BibliographyTypstPreview bibliographyData={bibliography.data} />
  {/if}
</main>
