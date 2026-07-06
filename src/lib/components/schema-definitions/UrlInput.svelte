<script lang="ts">
  import type { BibliographyEntry, URL } from '$lib/types/hayagriva';
  import { checkUrlReachable } from '$lib/utils/identifier-links';
  import { ExternalLink, Radar } from '@lucide/svelte';
  import DateInput from './DateInput.svelte';

  let {
    value = $bindable(),
    label = 'URL',
    placeholder = 'https://example.com'
  }: {
    value?: URL;
    label?: string;
    placeholder?: string;
  } = $props();

  const uid = $props.id();

  let urlValue = $derived.by(() => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.value;
  });

  let dateValue: BibliographyEntry['date'] = $derived.by(() => {
    if (typeof value === 'string') return undefined;
    if (typeof value === 'object') return value.date;
  });

  let checkMessage = $state<string | undefined>();
  let checking = $state(false);

  $effect(() => {
    if (dateValue) {
      value = { value: urlValue!, date: dateValue };
    } else {
      value = urlValue;
    }
  });

  async function checkReachability() {
    checking = true;
    checkMessage = undefined;
    try {
      checkMessage = await checkUrlReachable(urlValue ?? '');
    } finally {
      checking = false;
    }
  }

  function openUrl() {
    const trimmed = urlValue?.trim();
    if (!trimmed) return;
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  }
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend"> {label} </legend>

  <label class="label" for="{uid}-entry-url">{label}</label>
  <div class="flex gap-2">
    <input
      bind:value={urlValue}
      id="{uid}-entry-url"
      type="url"
      class="input min-w-0 flex-1"
      {placeholder}
      required={dateValue ? true : false}
    />
    <button
      type="button"
      class="btn btn-outline btn-square shrink-0"
      aria-label="Open URL in new tab"
      disabled={!urlValue?.trim()}
      onclick={openUrl}
    >
      <ExternalLink class="size-4" />
    </button>
    <button
      type="button"
      class="btn btn-outline shrink-0"
      disabled={!urlValue?.trim() || checking}
      onclick={checkReachability}
    >
      {#if checking}
        <span class="loading loading-xs loading-spinner"></span>
      {:else}
        <Radar class="size-4" />
      {/if}
      Check
    </button>
  </div>
  {#if checkMessage}
    <p class="text-xs text-muted-foreground" role="status">{checkMessage}</p>
  {/if}

  <DateInput bind:value={dateValue} />
</fieldset>
