<script lang="ts">
  import { SettingsService } from '$lib/services/settings.service';
  import { onMount } from 'svelte';
  import type { AppSettings } from '$lib/types/app-settings';
  import { resolveCitationStyle } from '$lib/utils/citation-style';
  import { RefreshCw } from '@lucide/svelte';

  let {
    settings = $bindable(null as AppSettings | null),
    styleInput = $bindable(''),
    useDefaultStyle = $bindable(true),
    onRender
  }: {
    settings?: AppSettings | null;
    styleInput?: string;
    useDefaultStyle?: boolean;
    onRender?: () => void;
  } = $props();

  onMount(() => {
    SettingsService.get().then((loaded) => {
      settings = loaded;
      if (useDefaultStyle) {
        styleInput = loaded.citation.defaultStyle;
      }
    });
  });

  const resolved = $derived(
    settings
      ? resolveCitationStyle(
          useDefaultStyle ? settings.citation.defaultStyle : styleInput,
          settings
        )
      : null
  );
</script>

<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
  <label class="label flex cursor-pointer items-center gap-2 font-normal">
    <input type="checkbox" class="checkbox" bind:checked={useDefaultStyle} />
    Use default style from settings
    {#if settings}
      <span class="font-mono text-sm">({settings.citation.defaultStyle})</span>
    {/if}
  </label>

  {#if !useDefaultStyle}
    <label class="label" for="citation-style-input">Citation style</label>
    <input
      id="citation-style-input"
      class="input font-mono"
      placeholder="ieee, apa, chicago-author-date, or custom"
      bind:value={styleInput}
    />
    <p class="text-xs text-muted-foreground">
      Enter a built-in Typst style name, or <code class="font-mono">custom</code
      >
      when a CSL file is uploaded in Settings.
    </p>
  {/if}

  {#if settings?.citation.customCslName}
    <p class="text-xs text-muted-foreground">
      Custom CSL: {settings.citation.customCslName}
      {#if resolved?.useCustomCsl}
        (active)
      {/if}
    </p>
  {/if}

  {#if resolved}
    <p class="text-sm">
      Preview style: <span class="font-mono">{resolved.label}</span>
    </p>
  {/if}

  <button
    type="button"
    class="btn btn-outline btn-sm"
    onclick={() => onRender?.()}
  >
    <RefreshCw class="size-4" />
    Render preview
  </button>
</div>
