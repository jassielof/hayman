<script lang="ts">
  import { resolve } from '$app/paths';
  import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatEntryDateShort } from '$lib/formatters/date-formatter';
  import { formatEntryType } from '$lib/formatters/entry-type-formatter';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import { cn } from '$lib/utils/cn';
  import { ENTRY_TYPE_NAMES, type Hayagriva } from '@hayman/hayagriva-schema';
  import {
    CalendarIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronsUpDownIcon,
    CopyIcon,
    EyeIcon,
    HashIcon,
    PencilIcon,
    SearchIcon,
    TrashIcon,
  } from '@lucide/svelte';
  import { Select } from 'bits-ui';
  import { SvelteSet } from 'svelte/reactivity';

  let {
    entries,
    bibliographyId,
  }: {
    entries: Hayagriva;
    bibliographyId: string;
  } = $props();

  type SortKey = 'id' | 'title' | 'type' | 'date';

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'id', label: 'ID' },
    { value: 'title', label: 'Title' },
    { value: 'type', label: 'Type' },
    { value: 'date', label: 'Date' },
  ];

  let search = $state('');
  let typeFilter = $state('');
  let sortKey = $state<SortKey>('id');
  let selected = new SvelteSet<string>();
  let deleteOpen = $state(false);
  let bulkDeleteOpen = $state(false);
  let copyFeedback = $state(false);

  const entryList = $derived(Object.entries(entries));

  const filteredEntries = $derived(
    entryList
      .filter(([id, entry]) => {
        const q = search.trim().toLowerCase();
        if (q) {
          const haystack = [
            id,
            formatFormattableString(entry.title),
            entry.author ? formatAuthor(entry.author) : '',
            entry.type ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (typeFilter && (entry.type ?? '').toLowerCase() !== typeFilter) {
          return false;
        }
        return true;
      })
      .sort(([idA, a], [idB, b]) => {
        switch (sortKey) {
          case 'title':
            return formatFormattableString(a.title).localeCompare(
              formatFormattableString(b.title),
            );
          case 'type':
            return (a.type ?? '').localeCompare(b.type ?? '');
          case 'date':
            return formatEntryDateShort(a.date).localeCompare(
              formatEntryDateShort(b.date),
            );
          default:
            return idA.localeCompare(idB);
        }
      }),
  );

  const allVisibleSelected = $derived(
    filteredEntries.length > 0 &&
      filteredEntries.every(([id]) => selected.has(id)),
  );

  function toggleSelect(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      for (const [id] of filteredEntries) selected.delete(id);
    } else {
      for (const [id] of filteredEntries) selected.add(id);
    }
  }

  let pendingDeleteId = $state<string | null>(null);

  function requestDelete(id: string) {
    pendingDeleteId = id;
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    await BibliographyService.deleteEntry(bibliographyId, pendingDeleteId);
    delete entries[pendingDeleteId];
    selected.delete(pendingDeleteId);
    pendingDeleteId = null;
  }

  async function confirmBulkDelete() {
    for (const id of [...selected]) {
      await BibliographyService.deleteEntry(bibliographyId, id);
      delete entries[id];
    }
    selected.clear();
  }

  async function copySelected() {
    const subset: Hayagriva = {};
    for (const id of selected) {
      if (entries[id]) subset[id] = entries[id];
    }
    await hayagrivaService.export(subset, { toClipboard: true });
    copyFeedback = true;
    setTimeout(() => (copyFeedback = false), 2000);
  }

  const bulkDeleteDescription = $derived(
    [...selected].map((id) => `• ${id}`).join('\n'),
  );
</script>

<ConfirmDialog
  bind:open={deleteOpen}
  title="Delete entry?"
  description={pendingDeleteId
    ? `Are you sure you want to delete "${pendingDeleteId}"? This cannot be undone.`
    : undefined}
  confirmLabel="Delete"
  destructive={true}
  onConfirm={confirmDelete}
/>

<ConfirmDialog
  bind:open={bulkDeleteOpen}
  title="Delete selected entries?"
  description={`The following ${selected.size} entries will be permanently removed:\n${bulkDeleteDescription}`}
  confirmLabel="Delete all"
  destructive={true}
  onConfirm={confirmBulkDelete}
/>

<div class="card mt-4 overflow-hidden shadow-md">
  {#if entryList.length === 0}
    <div class="card-body">
      <p class="text-center text-muted-foreground">
        This bibliography has no entries.
      </p>
    </div>
  {:else}
    <div class="card-body border-b border-border">
      <label class="label mb-0 w-full">
        <span class="sr-only">Search entries</span>
        <span class="input flex items-center gap-2">
          <SearchIcon class="size-4 text-muted-foreground" />
          <input
            class="w-full border-0 bg-transparent p-0 shadow-none focus:ring-0"
            placeholder="Search by ID, title, author…"
            bind:value={search}
          />
        </span>
      </label>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <div class="label mb-0 w-full sm:w-56">
          <span class="sr-only">Filter by type</span>
          <Select.Root type="single" bind:value={typeFilter}>
            <Select.Trigger
              class="select flex w-full items-center justify-between gap-2"
              aria-label="Filter by type"
            >
              {#if typeFilter}
                {@const { Icon, label } = formatEntryType(typeFilter)}
                <span class="flex min-w-0 items-center gap-2">
                  <Icon class="size-4 shrink-0" />
                  <span class="truncate">{label}</span>
                </span>
              {:else}
                <span>All types</span>
              {/if}
              <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                class={cn(
                  'z-50 max-h-72 min-w-(--bits-select-anchor-width) overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-xl',
                  'data-[state=open]:animate-in data-[state=closed]:animate-out',
                )}
                sideOffset={6}
              >
                <Select.ScrollUpButton
                  class="flex h-6 items-center justify-center text-muted-foreground"
                >
                  <ChevronDownIcon class="size-4 rotate-180" />
                </Select.ScrollUpButton>
                <Select.Viewport>
                  <Select.Item
                    value=""
                    label="All types"
                    class="flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {#snippet children({ selected })}
                      <span class="w-4"
                        >{#if selected}<CheckIcon class="size-4" />{/if}</span
                      >
                      All types
                    {/snippet}
                  </Select.Item>
                  {#each ENTRY_TYPE_NAMES as typeName (typeName)}
                    {@const { Icon, label } = formatEntryType(typeName)}
                    <Select.Item
                      value={typeName}
                      {label}
                      class="flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      {#snippet children({ selected })}
                        <span class="w-4"
                          >{#if selected}<CheckIcon class="size-4" />{/if}</span
                        >
                        <Icon class="size-4 text-muted-foreground" />
                        {label}
                      {/snippet}
                    </Select.Item>
                  {/each}
                </Select.Viewport>
                <Select.ScrollDownButton
                  class="flex h-6 items-center justify-center text-muted-foreground"
                >
                  <ChevronDownIcon class="size-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <div class="label mb-0 w-full sm:w-56">
          <span class="sr-only">Sort entries</span>
          <Select.Root type="single" bind:value={sortKey} items={sortOptions}>
            <Select.Trigger
              class="select flex items-center justify-between gap-2"
              aria-label="Sort entries"
            >
              <span>Sort by <Select.Value /></span>
              <ChevronsUpDownIcon class="size-4 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                class="z-50 min-w-(--bits-select-anchor-width) rounded-lg border border-border bg-card p-1.5 shadow-xl"
                sideOffset={6}
              >
                <Select.Viewport>
                  {#each sortOptions as option (option.value)}
                    <Select.Item
                      value={option.value}
                      label={option.label}
                      class="flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent"
                    >
                      {#snippet children({ selected })}
                        <span class="w-4"
                          >{#if selected}<CheckIcon class="size-4" />{/if}</span
                        >
                        {option.label}
                      {/snippet}
                    </Select.Item>
                  {/each}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {#if selected.size > 0}
          <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span class="text-sm text-muted-foreground"
              >{selected.size} selected</span
            >
            <button
              type="button"
              class="btn btn-sm btn-outline"
              onclick={copySelected}
            >
              <CopyIcon class="size-4" />
              Copy YAML
            </button>
            {#if copyFeedback}
              <span class="text-xs text-primary" role="status">Copied!</span>
            {/if}
            <button
              type="button"
              class="btn btn-sm btn-destructive"
              onclick={() => (bulkDeleteOpen = true)}
            >
              <TrashIcon class="size-4" />
              Delete selected
            </button>
          </div>
        {/if}
      </div>
    </div>

    <ul class="divide-y divide-border">
      <li
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-muted/50 p-4 text-xs font-medium uppercase"
      >
        <div class="flex items-center">
          <input
            type="checkbox"
            class="checkbox"
            checked={allVisibleSelected}
            aria-label="Select all visible entries"
            onchange={toggleSelectAll}
          />
        </div>
        <div>Entry</div>
        <div class="text-right">Actions</div>
      </li>

      {#if filteredEntries.length === 0}
        <li class="list-row">
          <p class="text-muted-foreground">No entries match your filters.</p>
        </li>
      {:else}
        {#each filteredEntries as [id, entry] (id)}
          {@const { label, Icon } = formatEntryType(entry.type)}
          <li
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4"
          >
            <div class="flex items-center">
              <input
                type="checkbox"
                class="checkbox"
                checked={selected.has(id)}
                aria-label={`Select ${id}`}
                onchange={() => toggleSelect(id)}
              />
            </div>
            <div class="min-w-0 space-y-1.5">
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Icon aria-label={label} class="size-4" />
                <span>{label}</span>
              </div>
              <div
                class="flex items-center gap-1 font-mono text-sm font-semibold text-foreground/80"
              >
                <HashIcon class="size-4 shrink-0" aria-hidden="true" />
                {id}
              </div>
              <div
                class="font-balanced font-sans text-xl leading-snug font-semibold font-stretch-expanded"
              >
                {formatFormattableString(entry.title)}
              </div>
              {#if entry.author}
                <div class="text-md font-sans leading-relaxed">
                  {formatAuthor(entry.author)}
                </div>
              {/if}
              {#if entry.date}
                <div class="flex items-center gap-1.5 text-xs">
                  <CalendarIcon class="size-4 shrink-0" aria-hidden="true" />
                  {formatEntryDateShort(entry.date)}
                </div>
              {/if}
            </div>
            <div class="flex flex-wrap items-center justify-end gap-1">
              <a
                class="btn btn-sm btn-outline"
                href={resolve(`/bibliography/${bibliographyId}/entry/${id}`)}
              >
                <EyeIcon class="size-4" />
                <span class="hidden sm:inline">View</span>
              </a>
              <a
                class="btn btn-sm btn-outline"
                href={resolve(
                  `/bibliography/${bibliographyId}/entry/${id}/edit`,
                )}
              >
                <PencilIcon class="size-4" />
                <span class="hidden sm:inline">Edit</span>
              </a>
              <button
                type="button"
                class="btn btn-sm btn-destructive"
                onclick={() => requestDelete(id)}
              >
                <TrashIcon class="size-4" />
                <span class="hidden sm:inline">Delete</span>
              </button>
            </div>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>
