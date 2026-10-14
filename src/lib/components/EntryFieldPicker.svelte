<script lang="ts">
  import { Combobox } from 'bits-ui';
  import { onMount } from 'svelte';
  import {
    formatEntryFieldLabel,
    type EntryFieldKey,
  } from '#lib/validators/entry-field-visibility.js';
  let {
    fields,
    onSelect,
  }: {
    fields: readonly EntryFieldKey[];
    onSelect: (field: EntryFieldKey) => void;
  } = $props();
  const uid = $props.id();
  function section(field: EntryFieldKey) {
    if (['author', 'editor', 'affiliated'].includes(field)) return 'People';
    if (['url', 'runtime', 'time-range'].includes(field))
      return 'Links & media';
    if (['serial-number', 'language'].includes(field)) return 'Identifiers';
    if (['abstract', 'note'].includes(field)) return 'Notes';
    if (['archive', 'archive-location', 'call-number'].includes(field))
      return 'Archive';
    return 'Publication';
  }
  let query = $state('');
  let open = $state(false);
  let selected = $state('');
  let portalTarget = $state<HTMLElement>();
  const filtered = $derived(
    fields.filter((field) =>
      `${field} ${formatEntryFieldLabel(field)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  );
  onMount(() => {
    portalTarget =
      document.getElementById(`${uid}-input`)?.closest('main') ?? undefined;
  });
</script>

<div class="min-w-0 space-y-2">
  <label class="label" id={`${uid}-label`} for={`${uid}-input`}
    >Search and add a field</label
  >
  <Combobox.Root
    type="single"
    inputValue={query}
    items={fields.map((field) => ({
      value: field,
      label: formatEntryFieldLabel(field),
    }))}
    bind:open
    bind:value={selected}
    onValueChange={(field) => {
      if (!fields.includes(field as EntryFieldKey)) return;
      open = false;
      query = '';
      selected = '';
      onSelect(field as EntryFieldKey);
    }}
  >
    <div class="flex gap-2">
      <Combobox.Input
        id={`${uid}-input`}
        class="input min-w-0 flex-1"
        placeholder="Search fields…"
        aria-controls={open ? `${uid}-list` : undefined}
        oninput={(event) => {
          query = event.currentTarget.value;
          open = true;
        }}
      />
      <Combobox.Trigger
        class="btn btn-outline"
        aria-label="Show available entry fields">▾</Combobox.Trigger
      >
    </div>
    <Combobox.Portal to={portalTarget}>
      <Combobox.Content
        id={`${uid}-list`}
        aria-labelledby={`${uid}-label`}
        strategy="fixed"
        sideOffset={6}
        class="z-50 max-h-64 w-(--bits-combobox-anchor-width) max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
      >
        <Combobox.Viewport>
          {#each filtered as field (field)}
            <Combobox.Item
              value={field}
              label={formatEntryFieldLabel(field)}
              class="cursor-default rounded px-3 py-2 text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              ><span>{formatEntryFieldLabel(field)}</span><span
                class="ml-3 text-xs text-muted-foreground"
                >{section(field)}</span
              ></Combobox.Item
            >
          {:else}<p class="p-3 text-sm text-muted-foreground" role="status">
              No unused fields match.
            </p>{/each}
        </Combobox.Viewport>
      </Combobox.Content>
    </Combobox.Portal>
  </Combobox.Root>
</div>
