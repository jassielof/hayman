<script lang="ts">
  import { resolve } from '$app/paths';
  import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatEntryDateShort } from '$lib/formatters/date-formatter';
  import { formatEntryType } from '$lib/formatters/entry-type-formatter';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import { ENTRY_TYPE_NAMES, type Hayagriva } from '@hayman/hayagriva-schema';
  import { cn } from '$lib/utils/cn';
  import { DropdownMenu } from 'bits-ui';
  import { SvelteSet } from 'svelte/reactivity';
  import {
    Calendar,
    ChevronDown,
    Copy,
    Eye,
    Hash,
    Pencil,
    Search,
    Trash,
    User,
  } from '@lucide/svelte';

  let {
    entries,
    bibliographyId,
  }: {
    entries: Hayagriva;
    bibliographyId: string;
  } = $props();

  type SortKey = 'id' | 'title' | 'type' | 'date';

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
    <div class="card-body space-y-4 border-b border-border">
      <div class="grid gap-3 md:grid-cols-3">
        <label class="label md:col-span-1">
          <span class="sr-only">Search entries</span>
          <span class="input flex items-center gap-2">
            <Search class="size-4 text-muted-foreground" />
            <input
              class="w-full border-0 bg-transparent p-0 shadow-none focus:ring-0"
              placeholder="Search by ID, title, author…"
              bind:value={search}
            />
          </span>
        </label>

        <div class="label">
          <span class="sr-only">Filter by type</span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              class="select flex w-full items-center justify-between gap-2"
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
              <ChevronDown class="size-4 shrink-0 opacity-60" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                class={cn(
                  'z-50 max-h-64 min-w-[12rem] overflow-y-auto rounded-md border border-border bg-card p-1 shadow-md',
                )}
              >
                <DropdownMenu.Item
                  class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onSelect={() => (typeFilter = '')}
                >
                  All types
                </DropdownMenu.Item>
                <DropdownMenu.Separator class="my-1 h-px bg-border" />
                {#each ENTRY_TYPE_NAMES as typeName (typeName)}
                  {@const { Icon, label } = formatEntryType(typeName)}
                  <DropdownMenu.Item
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onSelect={() => (typeFilter = typeName)}
                  >
                    <Icon class="size-4" />
                    {label}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <label class="label">
          <span class="sr-only">Sort entries</span>
          <select class="select" bind:value={sortKey}>
            <option value="id">Sort by ID</option>
            <option value="title">Sort by title</option>
            <option value="type">Sort by type</option>
            <option value="date">Sort by date</option>
          </select>
        </label>
      </div>

      {#if selected.size > 0}
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted-foreground"
            >{selected.size} selected</span
          >
          <button
            type="button"
            class="btn btn-sm btn-outline"
            onclick={copySelected}
          >
            <Copy class="size-4" />
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
            <Trash class="size-4" />
            Delete selected
          </button>
        </div>
      {/if}
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
            <div class="min-w-0">
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Icon aria-label={label} class="size-4" />
                <span>{label}</span>
              </div>
              <span class="font-mono text-sm">
                <Hash class="inline size-[1.2em]" />
                {id}
              </span>
              <br />
              <span class="text-lg font-semibold">
                {formatFormattableString(entry.title)}
              </span>
              {#if entry.author}
                <br />
                <span class="font-serif italic">
                  <User class="inline size-[1.2em]" />
                  {formatAuthor(entry.author)}
                </span>
              {/if}
              {#if entry.date}
                <br />
                <span class="text-xs">
                  <Calendar class="inline size-[1.2em]" />
                  {formatEntryDateShort(entry.date)}
                </span>
              {/if}
            </div>
            <div class="flex flex-wrap items-center justify-end gap-1">
              <a
                class="btn btn-sm btn-soft"
                href={resolve(`/bibliography/${bibliographyId}/entry/${id}`)}
              >
                <Eye class="size-4" />
                <span class="hidden sm:inline">View</span>
              </a>
              <a
                class="btn btn-sm btn-soft"
                href={resolve(
                  `/bibliography/${bibliographyId}/entry/${id}/edit`,
                )}
              >
                <Pencil class="size-4" />
                <span class="hidden sm:inline">Edit</span>
              </a>
              <button
                type="button"
                class="btn btn-sm btn-soft btn-error"
                onclick={() => requestDelete(id)}
              >
                <Trash class="size-4" />
                <span class="hidden sm:inline">Delete</span>
              </button>
            </div>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>
