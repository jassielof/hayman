<script lang="ts">
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import type { Bibliography } from '$lib/types/bibliography';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatEntryDateShort } from '$lib/formatters/date-formatter';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import { ENTRY_TYPE_NAMES } from '@hayman/hayagriva-schema';
  import { SearchIcon } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let bibliographies = $state<Bibliography[]>([]);
  let loading = $state(true);
  let errorMessage = $state<string | undefined>();
  let search = $state('');
  let type = $state('');

  onMount(async () => {
    try {
      bibliographies = await BibliographyService.getAll();
    } catch (error) {
      errorMessage = String(error);
    } finally {
      loading = false;
    }
  });

  const entries = $derived(
    bibliographies.flatMap((bibliography) =>
      Object.entries(bibliography.data).map(([entryId, entry]) => ({
        bibliography,
        entryId,
        entry,
      })),
    ),
  );
  const filtered = $derived(
    entries.filter(({ bibliography, entryId, entry }) => {
      if (type && entry.type?.toLowerCase() !== type) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        bibliography.metadata.title,
        entryId,
        entry.type,
        formatFormattableString(entry.title),
        entry.author ? formatAuthor(entry.author) : '',
        formatEntryDateShort(entry.date),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    }),
  );
</script>

<main class="mx-auto w-full max-w-6xl p-6">
  <Breadcrumbs
    items={[{ label: 'Home', href: '/' }, { label: 'All references' }]}
  />
  <header class="mb-5">
    <p class="text-xs font-semibold tracking-wider text-primary uppercase">
      Local library
    </p>
    <h1 class="text-3xl font-bold">All references</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Search across every managed and linked Hayagriva file.
    </p>
  </header>
  {#if errorMessage}<div class="alert alert-error" role="alert">
      {errorMessage}
    </div>{/if}
  <div class="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
    <label class="input flex items-center gap-2"
      ><SearchIcon class="size-4" /><input
        class="w-full border-0 bg-transparent"
        placeholder="Title, author, key, year, or file…"
        bind:value={search}
      /></label
    >
    <select class="select" aria-label="Filter by entry type" bind:value={type}>
      <option value="">All types</option>
      {#each ENTRY_TYPE_NAMES as entryType (entryType)}<option value={entryType}
          >{entryType}</option
        >{/each}
    </select>
  </div>
  {#if loading}
    <div class="grid min-h-80 place-content-center">
      <span class="loading loading-xl loading-spinner"></span>
    </div>
  {:else}
    <p class="mb-2 text-xs text-muted-foreground">
      {filtered.length} of {entries.length} entry occurrences
    </p>
    <div class="list">
      {#each filtered as item (`${item.bibliography.metadata.id}:${item.entryId}`)}
        <a
          class="grid gap-1 p-3 hover:bg-accent sm:grid-cols-[minmax(0,1fr)_14rem]"
          href={resolve(
            `/bibliography/${item.bibliography.metadata.id}/entry/${item.entryId}`,
          )}
        >
          <span class="min-w-0">
            <span class="block truncate font-serif text-lg font-semibold"
              >{formatFormattableString(item.entry.title) || item.entryId}</span
            >
            <span class="block truncate text-sm italic"
              >{item.entry.author
                ? formatAuthor(item.entry.author)
                : 'Unknown author'}</span
            >
          </span>
          <span class="min-w-0 text-xs text-muted-foreground sm:text-right">
            <span class="block truncate font-mono">{item.entryId}</span>
            <span class="block truncate"
              >{item.bibliography.metadata.title}</span
            >
          </span>
        </a>
      {:else}
        <p class="p-8 text-center text-muted-foreground">
          No references match these filters.
        </p>
      {/each}
    </div>
  {/if}
</main>
