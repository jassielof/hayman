<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import BibliographyMetadataForm from '$lib/components/BibliographyMetadataForm.svelte';
  import ValidationErrorList from '$lib/components/ValidationErrorList.svelte';
  import {
    BibliographyService,
    formatValidationErrorMessage,
    type ValidationIssue,
  } from '$lib/services/bibliography.service';
  import {
    hayagrivaService,
    HayagrivaStructureError,
  } from '$lib/services/hayagriva.service';
  import type { Bibliography } from '$lib/types/bibliography';
  import { parseAndValidateHayagriva } from '$lib/validators/parse-and-validate';
  import { CircleAlert, ClipboardPaste, Link } from '@lucide/svelte';
  import { FileInput } from '@lucide/svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { tauriBackend } from '$lib/services/tauri-backend';

  let newBibliography: Bibliography = $state({
    data: {},
    metadata: {
      id: '',
      title: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  let files: FileList | undefined = $state(undefined);
  let isLoading = $state(false);
  let validationIssues = $state<ValidationIssue[]>([]);
  let errorMessage = $state(undefined as string | undefined);

  $effect(() => {
    if (files && files.length > 0) {
      isLoading = true;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = hayagrivaService.import(reader.result as string);
          const validation = parseAndValidateHayagriva(imported);
          if (!validation.valid) {
            validationIssues = validation.errors ?? [];
            errorMessage = 'Imported YAML has validation errors.';
            newBibliography.data = imported;
          } else {
            newBibliography.data = imported;
            validationIssues = [];
            errorMessage = undefined;
          }
        } catch (error) {
          errorMessage =
            error instanceof HayagrivaStructureError
              ? error.message
              : 'Failed to parse YAML';
          files = undefined;
          console.error('Error parsing YAML:', error);
        } finally {
          isLoading = false;
        }
      };
      reader.onerror = () => {
        errorMessage = 'Failed to read the file.';
        files = undefined;
        isLoading = false;
      };
      reader.readAsText(files[0]);
    }
  });

  let isSubmitting = $state(false);
  let importUrl = $state('');
  let isFetchingUrl = $state(false);

  async function handleNativeImport() {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'Bibliography',
          extensions: ['yml', 'yaml', 'bib'],
        },
      ],
    });
    if (!selected) return;
    isLoading = true;
    errorMessage = undefined;
    validationIssues = [];
    try {
      const imported = await tauriBackend.importFile(selected);
      newBibliography.data = imported.data;
      newBibliography.metadata.id = imported.suggestedId;
      newBibliography.metadata.title = imported.suggestedTitle.replace(
        /\b\w/g,
        (letter) => letter.toUpperCase(),
      );
      const validation = parseAndValidateHayagriva(imported.data);
      if (!validation.valid) {
        validationIssues = validation.errors ?? [];
        errorMessage = 'The converted bibliography has validation errors.';
      }
    } catch (error) {
      errorMessage = String(error);
    } finally {
      isLoading = false;
    }
  }

  async function handlePasteImport() {
    errorMessage = undefined;
    validationIssues = [];
    try {
      const text = await navigator.clipboard.readText();
      const imported = hayagrivaService.import(text);
      const validation = parseAndValidateHayagriva(imported);
      newBibliography.data = imported;
      if (!validation.valid) {
        validationIssues = validation.errors ?? [];
        errorMessage = 'Pasted YAML has validation errors.';
      }
    } catch (error) {
      errorMessage =
        error instanceof HayagrivaStructureError
          ? error.message
          : 'Failed to parse pasted YAML.';
    }
  }

  async function handleUrlImport() {
    if (!importUrl.trim()) return;
    isFetchingUrl = true;
    errorMessage = undefined;
    validationIssues = [];
    try {
      const response = await fetch(importUrl.trim());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const imported = hayagrivaService.import(text);
      const validation = parseAndValidateHayagriva(imported);
      newBibliography.data = imported;
      if (!validation.valid) {
        validationIssues = validation.errors ?? [];
        errorMessage = 'Imported YAML has validation errors.';
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Failed to import from URL.';
    } finally {
      isFetchingUrl = false;
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    errorMessage = undefined;
    validationIssues = [];

    try {
      if (newBibliography.metadata.id === 'new') {
        errorMessage = '"new" is a reserved ID. Please choose another one.';
        return;
      }

      if (await BibliographyService.exists(newBibliography.metadata.id)) {
        errorMessage = 'Bibliography with this ID already exists.';
        return;
      }

      const validation = parseAndValidateHayagriva(newBibliography.data);
      if (!validation.valid) {
        validationIssues = validation.errors ?? [];
        errorMessage = 'Fix validation errors before saving.';
        return;
      }

      await BibliographyService.add(newBibliography);
      goto(resolve('/'));
    } catch (err: unknown) {
      errorMessage = formatValidationErrorMessage(err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        err.name === 'ConstraintError'
      ) {
        errorMessage = 'Bibliography with this ID already exists.';
      }
      console.error('Error saving bibliography:', err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form class="mx-auto max-w-md p-6" onsubmit={handleSubmit}>
  <fieldset class="fieldset bg-muted/30">
    <legend class="fieldset-legend">New Bibliography</legend>

    {#if validationIssues.length > 0}
      <ValidationErrorList issues={validationIssues} />
      <div class="divider"></div>
    {/if}

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlert />
        <span>{errorMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    <label for="hayagriva-file" class="label">
      Import from a Hayagriva YAML file
    </label>

    <button
      type="button"
      class="btn btn-outline w-full"
      onclick={handleNativeImport}
      disabled={isLoading}
    >
      <FileInput class="size-4" />
      Import YAML, BibTeX, or BibLaTeX
    </button>
    <p class="text-xs text-muted-foreground">
      BibTeX and BibLaTeX files are converted by Hayagriva and saved as a new
      managed YAML bibliography. The source file is never modified.
    </p>

    <input
      type="file"
      class="file-input w-full"
      onchange={() => {
        if (!files || files.length === 0) return;

        newBibliography.metadata.id = files[0].name.replace(
          /\.(yml|yaml)$/i,
          '',
        ) as string;
        newBibliography.metadata.title = newBibliography.metadata.id
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }}
      id="hayagriva-file"
      accept="application/yaml,.yaml,.yml"
      bind:files
      disabled={isLoading}
    />

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-outline"
        onclick={handlePasteImport}
        disabled={isLoading || isFetchingUrl}
      >
        <ClipboardPaste class="size-4" />
        Paste YAML
      </button>
    </div>

    <label for="import-url" class="label">Import from URL</label>
    <div class="flex flex-wrap gap-2">
      <input
        id="import-url"
        type="url"
        class="input min-w-0 flex-1"
        placeholder="https://example.com/bibliography.yaml"
        bind:value={importUrl}
        disabled={isFetchingUrl}
      />
      <button
        type="button"
        class="btn btn-outline"
        onclick={handleUrlImport}
        disabled={isFetchingUrl || !importUrl.trim()}
      >
        {#if isFetchingUrl}
          <span class="loading loading-sm loading-spinner"></span>
        {:else}
          <Link class="size-4" />
        {/if}
        Fetch
      </button>
    </div>

    {#if isLoading && files}
      <div class="mt-4 flex items-center gap-2">
        <span class="loading loading-md loading-spinner"></span>
        <span>Parsing {files[0].name}...</span>
      </div>
    {/if}

    <div class="divider"></div>

    <BibliographyMetadataForm
      bind:bibliographyMetadata={newBibliography.metadata}
    />

    <div class="divider"></div>

    <button class="btn btn-primary" disabled={isSubmitting || isLoading}>
      {#if isSubmitting}
        <span class="loading loading-sm loading-spinner"></span>
      {/if}
      Save
    </button>
    <a class="btn btn-error" href={resolve('/')}>Cancel</a>
  </fieldset>
</form>
