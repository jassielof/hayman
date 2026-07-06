<script lang="ts">
  import { resolve } from '$app/paths';
  import { reinitTypstPreview } from '$lib/services/typst-preview.service';
  import { SettingsService } from '$lib/services/settings.service';
  import {
    DEFAULT_APP_SETTINGS,
    FONT_PRESETS,
    type AppSettings
  } from '$lib/types/app-settings';
  import { CircleAlert, Save } from '@lucide/svelte';

  let settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });
  let errorMessage = $state<string | undefined>();
  let savedMessage = $state<string | undefined>();
  let isSubmitting = $state(false);
  let cslFile: FileList | undefined = $state(undefined);

  $effect(() => {
    SettingsService.get().then((loaded) => {
      settings = loaded;
    });
  });

  $effect(() => {
    if (!cslFile || cslFile.length === 0) return;
    const file = cslFile[0];
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      settings.citation.customCslBytes = new Uint8Array(buffer);
      settings.citation.customCslName = file.name;
      cslFile = undefined;
    };
    reader.readAsArrayBuffer(file);
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    errorMessage = undefined;
    savedMessage = undefined;

    try {
      await SettingsService.update({
        fonts: settings.fonts,
        citation: settings.citation
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
  }
</script>

<main class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Settings</h1>

  <form class="space-y-6" onsubmit={handleSubmit}>
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Fonts</legend>
      <p class="text-sm text-muted-foreground">
        Applied across the app and Typst citation previews. Changing fonts
        requires recompiling previews.
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
      <legend class="fieldset-legend">Citation preview</legend>

      <label class="label" for="default-style">Default style</label>
      <input
        id="default-style"
        class="input font-mono"
        placeholder="ieee"
        bind:value={settings.citation.defaultStyle}
      />
      <p class="text-xs text-muted-foreground">
        Built-in Typst style name (e.g. ieee, apa, chicago-author-date, mla) or
        use <code class="font-mono">custom</code> with a CSL file below.
      </p>

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
      <a class="btn btn-outline" href={resolve('/')}>Back to home</a>
    </div>
  </form>
</main>
