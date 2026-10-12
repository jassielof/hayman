<script lang="ts">
  import { onMount } from 'svelte';
  import { Combobox } from 'bits-ui';
  import type { BundledCitationStyle } from '#lib/services/tauri-backend.js';
  import {
    listBundledCitationStyles,
    findBundledCitationStyle,
    filterBundledCitationStyles,
  } from '#lib/services/bundled-citation-styles.service.js';

  let {
    id,
    value = $bindable('ieee'),
    valid = $bindable(false),
  }: { id: string; value?: string; valid?: boolean } = $props();
  let styles = $state<BundledCitationStyle[]>([]);
  let loading = $state(true);
  let error = $state<string>();
  let open = $state(false);
  let query = $state('');
  let inputValue = $state('');
  let portalTarget = $state<HTMLElement>();
  const selected = $derived(findBundledCitationStyle(styles, value));
  const filtered = $derived(filterBundledCitationStyles(styles, query));
  const items = $derived(
    styles.map((style) => ({ value: style.id, label: style.title })),
  );

  $effect(() => {
    valid = Boolean(selected);
    if (!open) inputValue = selected?.title ?? '';
  });

  async function load() {
    loading = true;
    error = undefined;
    try {
      styles = await listBundledCitationStyles();
    } catch {
      error = 'Could not load bundled styles.';
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    // Keep the popup in its owning landmark for screen-reader navigation.
    portalTarget = document.getElementById(id)?.closest('main') ?? undefined;
    void load();
  });
</script>

<div class="space-y-2">
  <label id={`${id}-label`} class="label" for={id}>Bundled citation style</label
  >
  <Combobox.Root
    type="single"
    value={selected?.id ?? ''}
    onValueChange={(next) => {
      if (styles.some((style) => style.id === next)) value = next;
    }}
    bind:open
    onOpenChange={(nextOpen) => {
      query = '';
      inputValue = nextOpen ? '' : (selected?.title ?? '');
    }}
    {inputValue}
    {items}
    allowDeselect={false}
    disabled={loading || Boolean(error)}
  >
    <div class="flex gap-2">
      <Combobox.Input
        {id}
        class="input min-w-0 flex-1"
        placeholder={loading
          ? 'Loading bundled styles…'
          : 'Search names or aliases…'}
        aria-describedby={`${id}-help`}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-invalid={!loading && !error && !valid}
        oninput={(event) => {
          query = event.currentTarget.value;
          inputValue = query;
          open = true;
        }}
        onkeydown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            open = false;
            query = '';
            inputValue = selected?.title ?? '';
          }
        }}
      />
      <Combobox.Trigger
        class="btn btn-outline"
        aria-label="Show bundled citation styles">▾</Combobox.Trigger
      >
    </div>
    <Combobox.Portal to={portalTarget}>
      <!-- Keep option scrolling inside the portal from moving the document. -->
      <Combobox.Content
        id={`${id}-listbox`}
        aria-labelledby={`${id}-label`}
        class="z-50 max-h-80 w-(--bits-combobox-anchor-width) min-w-64 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-xl"
        strategy="fixed"
        sideOffset={6}
      >
        <Combobox.Viewport>
          {#each filtered as style (style.id)}
            <Combobox.Item
              value={style.id}
              label={style.title}
              class="cursor-default rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              <span class="block">{style.title}</span>
              <span class="block font-mono text-xs text-muted-foreground"
                >{style.names.join(' · ')}</span
              >
            </Combobox.Item>
          {:else}
            <p role="status" class="px-3 py-2 text-sm text-muted-foreground">
              No matching bundled styles.
            </p>
          {/each}
        </Combobox.Viewport>
      </Combobox.Content>
    </Combobox.Portal>
  </Combobox.Root>
  <p id={`${id}-help`} class="text-xs text-muted-foreground">
    Search by name or alias (e.g. APA or MLA), then select a style. Arrow keys
    and Enter work too.
    {#if selected}<span class="block font-mono">Selected: {selected.id}</span
      >{/if}
  </p>
  {#if error}
    <p role="alert" class="text-sm text-destructive">{error}</p>
    <button type="button" class="btn btn-sm btn-outline" onclick={load}
      >Retry loading styles</button
    >
  {:else if !loading && !selected}
    <p role="alert" class="text-sm text-destructive">
      “{value}” is not a bundled Hayagriva style. Choose one from the list.
    </p>
  {/if}
</div>
