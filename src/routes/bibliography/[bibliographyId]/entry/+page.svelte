<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import EntryEditor from '$lib/components/EntryEditor.svelte';
  import ImportEntriesDialog from '$lib/components/ImportEntriesDialog.svelte';
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
    CircleAlertIcon,
    ClipboardPasteIcon,
    ImportIcon,
    SaveIcon,
    SparklesIcon,
    XIcon,
  } from '@lucide/svelte';
  import type { PageProps } from './$types';
  import { tick } from 'svelte';

  let { params }: PageProps = $props();

  let newEntryId: string = $state('');
  let newEntryData: TopLevelEntry = $state({
    type: 'misc',
  });
  let validationIssues = $state<ValidationIssue[]>([]);
  let errorMessage = $state<string | undefined>();
  let pasteMessage = $state<string | undefined>();
  let isSubmitting = $state(false);
  let importDialogOpen = $state(false);
  let allowNavigation = $state(false);
  let editorInvalid = $state(false);
  let formElement: HTMLFormElement | undefined = $state(undefined);
  const dirty = $derived(
    editorInvalid ||
      newEntryId.trim().length > 0 ||
      Object.keys(newEntryData).length > 1,
  );

  beforeNavigate(({ cancel }) => {
    if (
      !allowNavigation &&
      dirty &&
      !window.confirm('Discard this unsaved entry?')
    )
      cancel();
  });

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

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting || editorInvalid) return;

    isSubmitting = true;
    errorMessage = undefined;
    validationIssues = [];

    const validation = parseAndValidateEntry(newEntryData);
    if (!validation.valid) {
      validationIssues = validation.errors ?? [];
      isSubmitting = false;
      await tick();
      document.getElementById('validation-errors')?.focus();
      return;
    }

    try {
      await BibliographyService.saveEntry(
        params.bibliographyId,
        newEntryId,
        newEntryData,
      );

      allowNavigation = true;
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

  function handleShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      formElement?.requestSubmit();
    }
  }
</script>

<svelte:window onkeydown={handleShortcut} />

<ImportEntriesDialog
  bind:open={importDialogOpen}
  bibliographyId={params.bibliographyId}
  onImported={() => {
    allowNavigation = true;
    return goto(resolve(`/bibliography/${params.bibliographyId}/`));
  }}
/>

<form
  bind:this={formElement}
  onsubmit={handleSubmit}
  class="mx-auto w-full max-w-5xl p-6"
>
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
    <p class="text-xs text-muted-foreground" role="status">
      {dirty ? 'Unsaved entry · Press Ctrl+S to save' : 'No unsaved changes'}
    </p>

    {#if validationIssues.length > 0}
      <ValidationErrorList issues={validationIssues} />
      <div class="divider"></div>
    {/if}

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlertIcon class="size-5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    {#if pasteMessage}
      <div role="alert" class="alert alert-warning">
        <CircleAlertIcon class="size-5 shrink-0" />
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
      <ClipboardPasteIcon class="size-[1.2em]" />
      Paste one Hayagriva entry
    </button>

    <button
      class="btn btn-outline"
      type="button"
      onclick={() => (importDialogOpen = true)}
      disabled={isSubmitting}
    >
      <ImportIcon class="size-[1.2em]" />
      Import several references
    </button>

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
        <SparklesIcon class="size-4" />
        Generate ID
      </button>
    </div>

    <EntryEditor bind:entryData={newEntryData} bind:invalid={editorInvalid} />

    <div class="divider"></div>

    <button class="btn btn-primary" disabled={isSubmitting || editorInvalid}>
      {#if isSubmitting}
        <span class="loading loading-sm loading-spinner"></span>
      {:else}
        <SaveIcon class="size-[1.2em]" />
      {/if}
      Add
    </button>
    <a
      href={resolve(`/bibliography/${params.bibliographyId}/`)}
      class="btn btn-outline"
    >
      <XIcon class="size-[1.2em]" />
      Cancel
    </a>
  </fieldset>
</form>
