<script lang="ts">
  import type { BibliographyEntry, URL } from '@hayman/hayagriva-schema';
  import { validateWebUrl } from '$lib/utils/identifier-validation';
  import { BadgeCheckIcon, ExternalLinkIcon } from '@lucide/svelte';
  import DateInput from './DateInput.svelte';
  import { tauriBackend } from '$lib/services/tauri-backend';

  let {
    value = $bindable(),
    label = 'URL',
    placeholder = 'https://example.com',
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

  $effect(() => {
    if (dateValue) {
      value = { value: urlValue!, date: dateValue };
    } else {
      value = urlValue;
    }
  });

  function checkFormat() {
    checkMessage = validateWebUrl(urlValue ?? '').message;
  }

  async function openUrl() {
    const trimmed = urlValue?.trim();
    if (!trimmed) return;
    const validation = validateWebUrl(trimmed);
    if (!validation.valid) {
      checkMessage = validation.message;
      return;
    }
    try {
      await tauriBackend.openExternalUrl(trimmed);
      checkMessage = 'Opened in your default browser.';
    } catch (error) {
      checkMessage = String(error);
    }
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
      <ExternalLinkIcon class="size-4" />
    </button>
    <button
      type="button"
      class="btn btn-outline shrink-0"
      disabled={!urlValue?.trim()}
      onclick={checkFormat}
    >
      <BadgeCheckIcon class="size-4" />
      Validate
    </button>
  </div>
  {#if checkMessage}
    <p class="text-xs text-muted-foreground" role="status">{checkMessage}</p>
  {/if}

  <DateInput bind:value={dateValue} />
</fieldset>
