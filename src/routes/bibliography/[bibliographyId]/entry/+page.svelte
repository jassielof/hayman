<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import EntryForm from '$lib/components/EntryForm.svelte';
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
  import type { TopLevelEntry } from '@hayman/hayagriva-schema';
  import { generateEntryId } from '$lib/utils/entry-id';
  import { parseAndValidateEntry } from '$lib/validators/parse-and-validate';
  import {
    CircleAlert,
    ClipboardPaste,
    FileUp,
    Save,
    Sparkles,
    X,
  } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { params }: PageProps = $props();

  let newEntryId: string = $state('');
  let newEntryData: TopLevelEntry = $state({
    type: 'misc',
  });
  let validationIssues = $state<ValidationIssue[]>([]);
  let errorMessage = $state<string | undefined>();
  let pasteMessage = $state<string | undefined>();
  let isSubmitting = $state(false);
  let importFile: FileList | undefined = $state(undefined);

  function applyImportedEntry(data: Record<string, TopLevelEntry>) {
    const dataLength = Object.keys(data).length;
    if (dataLength > 1 || dataLength <= 0) {
      pasteMessage = `Expected exactly 1 entry, found ${dataLength}.`;
      return;
    }
    newEntryId = Object.keys(data)[0];
    newEntryData = data[newEntryId];
    pasteMessage = undefined;
  }

  $effect(() => {
    if (!importFile || importFile.length === 0) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyImportedEntry(
          hayagrivaService.import(reader.result as string) as Record<
            string,
            TopLevelEntry
          >,
        );
      } catch (err) {
        pasteMessage =
          err instanceof HayagrivaStructureError
            ? err.message
            : 'Invalid bibliography file.';
      } finally {
        importFile = undefined;
      }
    };
    reader.readAsText(importFile[0]);
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    errorMessage = undefined;
    validationIssues = [];

    const validation = parseAndValidateEntry(newEntryData);
    if (!validation.valid) {
      validationIssues = validation.errors ?? [];
      isSubmitting = false;
      return;
    }

    try {
      await BibliographyService.saveEntry(
        params.bibliographyId,
        newEntryId,
        newEntryData,
      );

      goto(resolve(`/bibliography/${params.bibliographyId}/`));
    } catch (err) {
      errorMessage = formatValidationErrorMessage(err);
      console.error('Error saving entry:', err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handlePaste() {
    pasteMessage = undefined;
    try {
      const text = await navigator.clipboard.readText();
      const data = hayagrivaService.import(text);
      applyImportedEntry(data as Record<string, TopLevelEntry>);
    } catch (err) {
      pasteMessage =
        err instanceof HayagrivaStructureError
          ? err.message
          : 'Invalid bibliography.';
    }
  }
</script>

<form onsubmit={handleSubmit} class="mx-auto w-full max-w-5xl p-6">
  <Breadcrumbs
    items={[
      { label: 'Home', href: '/' },
      {
        label: 'Bibliography',
        href: `/bibliography/${params.bibliographyId}/`,
      },
      { label: 'New entry' },
    ]}
  />

  <fieldset class="fieldset">
    <legend class="fieldset-legend text-xl">New entry</legend>

    {#if validationIssues.length > 0}
      <ValidationErrorList issues={validationIssues} />
      <div class="divider"></div>
    {/if}

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlert class="size-5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    {#if pasteMessage}
      <div role="alert" class="alert alert-warning">
        <CircleAlert class="size-5 shrink-0" />
        <span>{pasteMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    <button
      class="btn btn-dash"
      type="button"
      onclick={handlePaste}
      disabled={isSubmitting}
    >
      <ClipboardPaste class="size-[1.2em]" />
      Paste from clipboard
    </button>

    <label class="btn btn-outline" for="entry-file-import">
      <FileUp class="size-[1.2em]" />
      Import from file
      <input
        id="entry-file-import"
        type="file"
        class="sr-only"
        accept=".yaml,.yml,application/yaml"
        bind:files={importFile}
        disabled={isSubmitting}
      />
    </label>

    <div class="divider"></div>

    <label for="entry-id" class="label">ID</label>
    <div class="flex flex-wrap gap-2">
      <input
        id="entry-id"
        placeholder="UMLAndPatterns"
        class="input min-w-0 flex-1 font-mono"
        type="text"
        required
        disabled={isSubmitting}
        onblur={() => (newEntryId = newEntryId.trim())}
        bind:value={newEntryId}
      />
      <button
        type="button"
        class="btn btn-outline"
        disabled={isSubmitting}
        onclick={() => (newEntryId = generateEntryId(newEntryData))}
      >
        <Sparkles class="size-4" />
        Generate ID
      </button>
    </div>

    <EntryForm bind:entryData={newEntryData} />

    <div class="divider"></div>

    <button class="btn btn-success" disabled={isSubmitting}>
      {#if isSubmitting}
        <span class="loading loading-sm loading-spinner"></span>
      {:else}
        <Save class="size-[1.2em]" />
      {/if}
      Add
    </button>
    <a
      href={resolve(`/bibliography/${params.bibliographyId}/`)}
      class="btn btn-error"
    >
      <X class="size-[1.2em]" />
      Cancel
    </a>
  </fieldset>
</form>
