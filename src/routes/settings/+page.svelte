<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { SettingsService } from '$lib/services/settings.service';
  import { CUSTOM_CSL_STYLE } from '$lib/utils/citation-style';
  import { DEFAULT_ENTRY_CITATION_BODY } from '$lib/typst/templates';
  import {
    formatFontFamilyLabel,
    listAvailableFonts,
  } from '$lib/utils/available-fonts';
  import {
    DEFAULT_APP_SETTINGS,
    type AppSettings,
  } from '$lib/types/app-settings';
  import { ArrowLeft, CircleAlert, Save } from '@lucide/svelte';

  let settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });
  let errorMessage = $state<string | undefined>();
  let savedMessage = $state<string | undefined>();
  let isSubmitting = $state(false);
  let cslFile: FileList | undefined = $state(undefined);
  let defaultKind = $state<'bundled' | 'custom-csl'>('bundled');
  let bundledDefaultStyle = $state(DEFAULT_APP_SETTINGS.citation.defaultStyle);
  let availableFonts = $state<Record<'sans' | 'serif' | 'mono', string[]>>({
    sans: [DEFAULT_APP_SETTINGS.fonts.sans],
    serif: [DEFAULT_APP_SETTINGS.fonts.serif],
    mono: [DEFAULT_APP_SETTINGS.fonts.mono],
  });
  let fontsLoading = $state(true);
  let customizeEntryPreviewBody = $state(false);
  let entryPreviewBody = $state(DEFAULT_ENTRY_CITATION_BODY);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void goto(resolve('/'));
    }
  }

  $effect(() => {
    let cancelled = false;

    SettingsService.get().then(async (loaded) => {
      if (cancelled) return;
      settings = loaded;
      customizeEntryPreviewBody = Boolean(
        loaded.citation.entryPreviewBody?.trim(),
      );
      entryPreviewBody =
        loaded.citation.entryPreviewBody || DEFAULT_ENTRY_CITATION_BODY;
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

      fontsLoading = true;
      try {
        const fonts = await listAvailableFonts({ current: loaded.fonts });
        if (!cancelled) availableFonts = fonts;
      } finally {
        if (!cancelled) fontsLoading = false;
      }
    });

    return () => {
      cancelled = true;
    };
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
          : bundledDefaultStyle.trim() || 'ieee',
      entryPreviewBody: customizeEntryPreviewBody
        ? entryPreviewBody.trim() || DEFAULT_ENTRY_CITATION_BODY
        : undefined,
    };

    if (defaultKind === 'custom-csl' && !citation.customCsl?.trim()) {
      errorMessage = 'Upload a CSL file or choose a built-in Typst style.';
      isSubmitting = false;
      return;
    }

    try {
      await SettingsService.update({
        fonts: settings.fonts,
        citation,
      });
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
        System stacks plus app-bundled webfonts (when loaded). Typst previews
        use the compiler’s own font set.
      </p>

      {#if fontsLoading}
        <p class="text-sm text-muted-foreground">Loading font options…</p>
      {/if}

      <label class="label" for="font-sans">Sans-serif</label>
      <select
        id="font-sans"
        class="select"
        bind:value={settings.fonts.sans}
        disabled={fontsLoading}
      >
        {#each availableFonts.sans as font (font)}
          <option value={font}>{formatFontFamilyLabel(font)}</option>
        {/each}
      </select>

      <label class="label" for="font-serif">Serif</label>
      <select
        id="font-serif"
        class="select"
        bind:value={settings.fonts.serif}
        disabled={fontsLoading}
      >
        {#each availableFonts.serif as font (font)}
          <option value={font}>{formatFontFamilyLabel(font)}</option>
        {/each}
      </select>

      <label class="label" for="font-mono">Monospace</label>
      <select
        id="font-mono"
        class="select"
        bind:value={settings.fonts.mono}
        disabled={fontsLoading}
      >
        {#each availableFonts.mono as font (font)}
          <option value={font}>{formatFontFamilyLabel(font)}</option>
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

      <label
        class="label mt-3 flex cursor-pointer items-start gap-2 font-normal"
      >
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

      <details class="rounded-md border border-border bg-card/60 p-3">
        <summary class="cursor-pointer text-sm font-medium">
          Entry preview example
        </summary>
        <div class="mt-3 space-y-2">
          <label
            class="label flex cursor-pointer items-start gap-2 font-normal"
          >
            <input
              type="checkbox"
              class="checkbox mt-0.5"
              bind:checked={customizeEntryPreviewBody}
            />
            <span>
              Use custom Typst source
              <span class="block text-xs text-muted-foreground">
                Replaces the default citation examples in entry previews.
              </span>
            </span>
          </label>
          {#if customizeEntryPreviewBody}
            <textarea
              class="textarea min-h-52 font-mono text-xs"
              aria-label="Default entry preview Typst source"
              bind:value={entryPreviewBody}></textarea>
          {/if}
        </div>
      </details>
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
      <button type="button" class="btn btn-outline" onclick={goBack}>
        <ArrowLeft class="size-4" />
        Back
      </button>
    </div>
  </form>
</main>
