<script lang="ts">
  import { SettingsService } from '$lib/services/settings.service';
  import { onMount } from 'svelte';
  import type { AppSettings } from '$lib/types/app-settings';
  import {
    describeSettingsDefaultCitation,
    hasCustomCsl,
    resolvePreviewCitationStyle,
    usesCustomCslDefault,
  } from '$lib/utils/citation-style';
  import { RefreshCwIcon } from '@lucide/svelte';
  import { DEFAULT_ENTRY_CITATION_BODY } from '$lib/typst/templates';

  let {
    settings = $bindable(null as AppSettings | null),
    styleInput = $bindable('ieee'),
    useDefaultStyle = $bindable(true),
    overrideKind = $bindable('bundled' as 'bundled' | 'custom-csl'),
    showEntryBodyControls = false,
    useEntryBodyOverride = $bindable(false),
    entryPreviewBody = $bindable(DEFAULT_ENTRY_CITATION_BODY),
    onRender,
  }: {
    settings?: AppSettings | null;
    styleInput?: string;
    useDefaultStyle?: boolean;
    overrideKind?: 'bundled' | 'custom-csl';
    showEntryBodyControls?: boolean;
    useEntryBodyOverride?: boolean;
    entryPreviewBody?: string;
    onRender?: () => void;
  } = $props();

  onMount(() => {
    SettingsService.get().then((loaded) => {
      settings = loaded;
      if (useDefaultStyle) return;
      if (overrideKind === 'bundled' && !styleInput.trim()) {
        styleInput =
          loaded.citation.defaultStyle === 'custom'
            ? 'ieee'
            : loaded.citation.defaultStyle || 'ieee';
      }
    });
  });

  const settingsDefaultLabel = $derived(
    settings ? describeSettingsDefaultCitation(settings) : null,
  );

  const settingsUsesCustomCsl = $derived(
    settings ? usesCustomCslDefault(settings) : false,
  );

  const resolved = $derived(
    settings
      ? resolvePreviewCitationStyle(settings, {
          useSettingsDefault: useDefaultStyle,
          overrideKind,
          bundledStyle: styleInput,
        })
      : null,
  );

  const customCslAvailable = $derived(
    settings ? hasCustomCsl(settings) : false,
  );
</script>

<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
  <p class="text-sm font-medium">Preview style source</p>

  <label class="label flex cursor-pointer items-start gap-2 font-normal">
    <input
      type="radio"
      class="radio mt-0.5"
      name="preview-style-source"
      checked={useDefaultStyle}
      onchange={() => (useDefaultStyle = true)}
    />
    <span>
      Settings default
      {#if settingsDefaultLabel}
        <span class="block text-xs text-muted-foreground">
          {#if settingsUsesCustomCsl}
            Uploaded CSL: <span class="font-mono">{settingsDefaultLabel}</span>
          {:else}
            Typst built-in:
            <span class="font-mono">{settingsDefaultLabel}</span>
          {/if}
        </span>
      {/if}
    </span>
  </label>

  <label class="label flex cursor-pointer items-start gap-2 font-normal">
    <input
      type="radio"
      class="radio mt-0.5"
      name="preview-style-source"
      checked={!useDefaultStyle}
      onchange={() => (useDefaultStyle = false)}
    />
    <span>Override for this preview</span>
  </label>

  {#if !useDefaultStyle}
    <div class="ml-6 space-y-2 border-l border-border pl-4">
      <label class="label flex cursor-pointer items-center gap-2 font-normal">
        <input
          type="radio"
          class="radio"
          name="preview-override-kind"
          checked={overrideKind === 'bundled'}
          onchange={() => (overrideKind = 'bundled')}
        />
        Typst built-in style
      </label>

      {#if overrideKind === 'bundled'}
        <input
          id="citation-style-input"
          class="input font-mono"
          placeholder="ieee, apa, chicago-author-date, mla"
          bind:value={styleInput}
        />
      {/if}

      <label class="label flex cursor-pointer items-center gap-2 font-normal">
        <input
          type="radio"
          class="radio"
          name="preview-override-kind"
          checked={overrideKind === 'custom-csl'}
          disabled={!customCslAvailable}
          onchange={() => (overrideKind = 'custom-csl')}
        />
        Uploaded CSL from settings
        {#if settings?.citation.customCslName}
          <span class="font-mono text-xs"
            >({settings.citation.customCslName})</span
          >
        {/if}
      </label>

      {#if !customCslAvailable}
        <p class="text-xs text-muted-foreground">
          Upload a CSL file in Settings to preview it here.
        </p>
      {/if}
    </div>
  {/if}

  {#if resolved}
    <p class="text-sm">
      Active preview:
      <span class="font-mono">{resolved.label}</span>
      {#if resolved.useCustomCsl}
        <span class="text-xs text-muted-foreground">(custom CSL)</span>
      {:else}
        <span class="text-xs text-muted-foreground">(Typst built-in)</span>
      {/if}
    </p>
  {/if}

  {#if showEntryBodyControls}
    <details class="rounded-md border border-border bg-card/60 p-3">
      <summary class="cursor-pointer text-sm font-medium">
        Entry example source
      </summary>
      <div class="mt-3 space-y-2">
        <label class="label flex cursor-pointer items-start gap-2 font-normal">
          <input
            type="checkbox"
            class="checkbox mt-0.5"
            bind:checked={useEntryBodyOverride}
          />
          <span>
            Override for this preview
            <span class="block text-xs text-muted-foreground">
              Otherwise the source saved in Settings, or Hayman’s default, is
              used.
            </span>
          </span>
        </label>
        {#if useEntryBodyOverride}
          <textarea
            class="textarea min-h-44 font-mono text-xs"
            aria-label="Entry preview Typst source"
            bind:value={entryPreviewBody}></textarea>
        {/if}
      </div>
    </details>
  {/if}

  <button
    type="button"
    class="btn btn-outline btn-sm"
    onclick={() => onRender?.()}
  >
    <RefreshCwIcon class="size-4" />
    Render preview
  </button>
</div>
