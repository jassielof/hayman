<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { reinitTypstPreview } from '$lib/services/typst-preview.service';
  import { SettingsService } from '$lib/services/settings.service';
  import { CUSTOM_CSL_STYLE } from '$lib/utils/citation-style';
  import {
    DEFAULT_APP_SETTINGS,
    FONT_PRESETS,
    type AppSettings
  } from '$lib/types/app-settings';
  import { ArrowLeft, CircleAlert, Save } from '@lucide/svelte';

  let settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });
  let errorMessage = $state<string | undefined>();
  let savedMessage = $state<string | undefined>();
  let isSubmitting = $state(false);
  let cslFile: FileList | undefined = $state(undefined);
  let defaultKind = $state<'bundled' | 'custom-csl'>('bundled');
  let bundledDefaultStyle = $state(DEFAULT_APP_SETTINGS.citation.defaultStyle);

  const returnTo = $derived(page.url.searchParams.get('from'));
  const backHref = $derived.by(() => {
    if (returnTo && returnTo.startsWith('/')) {
      return (resolve as (href: string) => string)(returnTo);
    }
    return resolve('/');
  });
  const backLabel = $derived(
    returnTo && returnTo.startsWith('/') ? 'Back' : 'Back to home'
  );

  $effect(() => {
    SettingsService.get().then((loaded) => {
      settings = loaded;
      if (
        loaded.citation.defaultStyle === CUSTOM_CSL_STYLE &&
        loaded.citation.customCsl?.trim()
      ) {
        defaultKind = 'custom-csl';
        bundledDefaultStyle = 'ieee';
      } else {
        defaultKind = 'bundled';
        bundledDefaultStyle =
          loaded.citation.defaultStyle === CUSTOM_CSL_STYLE
            ? 'ieee'
            : loaded.citation.defaultStyle || 'ieee';
      }
    });
  });

  $effect(() => {
    if (!cslFile || cslFile.length === 0) return;
    const file = cslFile[0];
    const reader = new FileReader();
    reader.onload = () => {
      settings.citation.customCsl = String(reader.result ?? '');
      settings.citation.customCslName = file.name;
      defaultKind = 'custom-csl';
      cslFile = undefined;
    };
    reader.readAsText(file);
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    errorMessage = undefined;
    savedMessage = undefined;

    const citation = {
      ...settings.citation,
      defaultStyle:
        defaultKind === 'custom-csl'
          ? CUSTOM_CSL_STYLE
          : bundledDefaultStyle.trim() || 'ieee'
    };

    if (defaultKind === 'custom-csl' && !citation.customCsl?.trim()) {
      errorMessage = 'Upload a CSL file or choose a built-in Typst style.';
      isSubmitting = false;
      return;
    }

    try {
      await SettingsService.update({
        fonts: settings.fonts,
        citation
      });
      await reinitTypstPreview();
      savedMessage = 'Settings saved.';
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : 'Failed to save settings.';
    } finally {
      isSubmitting = false;
    }
  }

  async function clearCsl() {
    await SettingsService.clearCustomCsl();
    settings = await SettingsService.get();
    defaultKind = 'bundled';
    bundledDefaultStyle =
      settings.citation.defaultStyle === CUSTOM_CSL_STYLE
        ? 'ieee'
        : settings.citation.defaultStyle;
  }
</script>

<main class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Settings</h1>

  <form class="space-y-6" onsubmit={handleSubmit}>
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Fonts</legend>
      <p class="text-sm text-muted-foreground">
        Applied across the web UI. Typst previews use the compiler’s default
        fonts.
      </p>

      <label class="label" for="font-sans">Sans-serif</label>
      <select id="font-sans" class="select" bind:value={settings.fonts.sans}>
        {#each FONT_PRESETS.sans as font (font)}
          <option value={font}>{font}</option>
        {/each}
      </select>

      <label class="label" for="font-serif">Serif</label>
      <select id="font-serif" class="select" bind:value={settings.fonts.serif}>
        {#each FONT_PRESETS.serif as font (font)}
          <option value={font}>{font}</option>
        {/each}
      </select>

      <label class="label" for="font-mono">Monospace</label>
      <select id="font-mono" class="select" bind:value={settings.fonts.mono}>
        {#each FONT_PRESETS.mono as font (font)}
          <option value={font}>{font}</option>
        {/each}
      </select>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">Citation preview default</legend>
      <p class="text-sm text-muted-foreground">
        Choose one default for previews. Typst built-in styles and an uploaded
        CSL file are mutually exclusive defaults.
      </p>

      <label class="label flex cursor-pointer items-start gap-2 font-normal">
        <input
          type="radio"
          class="radio mt-0.5"
          name="citation-default-kind"
          checked={defaultKind === 'bundled'}
          onchange={() => (defaultKind = 'bundled')}
        />
        <span>
          Typst built-in style
          <span class="block text-xs text-muted-foreground">
            e.g. ieee, apa, chicago-author-date, mla
          </span>
        </span>
      </label>

      {#if defaultKind === 'bundled'}
        <input
          id="default-style"
          class="input font-mono"
          placeholder="ieee"
          bind:value={bundledDefaultStyle}
        />
      {/if}

      <label class="label mt-3 flex cursor-pointer items-start gap-2 font-normal">
        <input
          type="radio"
          class="radio mt-0.5"
          name="citation-default-kind"
          checked={defaultKind === 'custom-csl'}
          onchange={() => (defaultKind = 'custom-csl')}
        />
        <span>
          Uploaded CSL file
          <span class="block text-xs text-muted-foreground">
            Uses your CSL instead of a Typst bundled style.
          </span>
        </span>
      </label>

      {#if defaultKind === 'custom-csl'}
        <label class="label" for="csl-upload">Custom CSL file</label>
        <div class="flex flex-wrap items-center gap-2">
          <input
            id="csl-upload"
            type="file"
            class="file-input"
            accept=".csl,application/xml,text/xml"
            bind:files={cslFile}
          />
          {#if settings.citation.customCslName}
            <span class="text-sm">{settings.citation.customCslName}</span>
            <button
              type="button"
              class="btn btn-sm btn-outline"
              onclick={clearCsl}
            >
              Clear
            </button>
          {/if}
        </div>
      {:else if settings.citation.customCslName}
        <p class="text-xs text-muted-foreground">
          Stored CSL ({settings.citation.customCslName}) is kept but inactive
          while a built-in style is the default. Switch to “Uploaded CSL file”
          to use it.
        </p>
      {/if}
    </fieldset>

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlert class="size-5" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    {#if savedMessage}
      <div role="status" class="alert alert-warning">
        <span>{savedMessage}</span>
      </div>
    {/if}

    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="loading loading-sm loading-spinner"></span>
        {/if}
        <Save class="size-4" />
        Save settings
      </button>
      <button
        type="button"
        class="btn btn-outline"
        onclick={() => goto(backHref)}
      >
        <ArrowLeft class="size-4" />
        {backLabel}
      </button>
    </div>
  </form>
</main>
