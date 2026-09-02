<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import BibliographyTypstPreview from '$lib/components/BibliographyTypstPreview.svelte';
  import EntryList from '$lib/components/EntryList.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { cn } from '$lib/utils/cn';
  import { Tabs } from 'bits-ui';
  import { BookPlus } from '@lucide/svelte';
  import { stateQuery } from 'dexie-svelte-query';

  const bibliographyId = page.params.bibliographyId;
  const bibliographyQuery = stateQuery(() =>
    BibliographyService.getOrNull(bibliographyId!),
  );

  const bibliographyQueryLoading = $derived(bibliographyQuery.isLoading);
  const bibliography = $derived(bibliographyQuery.current);
  let tab = $state('entries');
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
      <p role="alert" class="text-error text-lg">Bibliography not found.</p>
      <a class="btn btn-primary" href={resolve('/')}>Back to home</a>
    </div>
  {:else}
    <Breadcrumbs
      items={[
        { label: 'Home', href: '/' },
        { label: bibliography.metadata.title },
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

    <Tabs.Root bind:value={tab} class="w-full">
      <Tabs.List
        class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        <Tabs.Trigger
          value="entries"
          class={cn(
            'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
            'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
          )}
        >
          Entries
        </Tabs.Trigger>
        <Tabs.Trigger
          value="preview"
          class={cn(
            'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
            'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
          )}
        >
          Rendered bibliography
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="entries" class="mt-4">
        <EntryList
          entries={bibliography.data}
          bibliographyId={bibliography.metadata.id}
        />
      </Tabs.Content>

      <Tabs.Content value="preview" class="mt-4">
        <BibliographyTypstPreview
          bibliographyData={bibliography.data}
          active={tab === 'preview'}
        />
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</main>
