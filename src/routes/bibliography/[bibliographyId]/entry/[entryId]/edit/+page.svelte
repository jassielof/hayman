<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import EntryForm from '$lib/components/EntryForm.svelte';
  import ValidationErrorList from '$lib/components/ValidationErrorList.svelte';
  import {
    BibliographyService,
    formatValidationErrorMessage,
    type ValidationIssue
  } from '$lib/services/bibliography.service';
  import {
    hayagrivaService,
    HayagrivaStructureError
  } from '$lib/services/hayagriva.service';
  import { parseAndValidateEntry } from '$lib/validators/parse-and-validate';
  import { CircleAlert, ClipboardPaste, Save, X } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data, params }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let newEntryId = $state(params.entryId);
  // svelte-ignore state_referenced_locally
  let newEntryData = $state(data.oldEntry);

  let validationIssues = $state<ValidationIssue[]>([]);
  let errorMessage = $state<string | undefined>();
  let pasteMessage = $state<string | undefined>();
  let isSubmitting = $state(false);

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
      await BibliographyService.updateEntry(
        params.bibliographyId,
        newEntryId,
        newEntryData,
        params.entryId
      );

      goto(resolve(`/bibliography/${params.bibliographyId}/`));
    } catch (err) {
      errorMessage = formatValidationErrorMessage(err);
      console.error('Error updating entry:', err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handlePaste() {
    pasteMessage = undefined;
    try {
      const text = await navigator.clipboard.readText();
      const imported = hayagrivaService.import(text);
      const dataLength = Object.keys(imported).length;

      if (dataLength > 1 || dataLength <= 0) {
        pasteMessage = `The bibliography needs to have 1 entry. It has ${dataLength} entries.`;
        return;
      }

      newEntryId = Object.keys(imported)[0];
      newEntryData = imported[newEntryId];
    } catch (err) {
      pasteMessage =
        err instanceof HayagrivaStructureError
          ? err.message
          : 'Invalid bibliography.';
    }
  }
</script>

<form onsubmit={handleSubmit} class="mx-auto w-full max-w-5xl p-6">
  <fieldset class="fieldset">
    <legend class="fieldset-legend text-xl">Edit entry</legend>

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
      class="btn btn-dash btn-info"
      type="button"
      onclick={handlePaste}
      disabled={isSubmitting}
    >
      <ClipboardPaste class="size-[1.2em]" />
      Paste from clipboard
    </button>

    <label for="entry-id" class="label">ID</label>
    <input
      id="entry-id"
      placeholder="UMLAndPatterns"
      class="input w-full font-mono"
      type="text"
      required
      disabled={isSubmitting}
      onblur={() => (newEntryId = newEntryId.trim())}
      bind:value={newEntryId}
    />

    <EntryForm bind:entryData={newEntryData} />

    <button class="btn btn-success mt-4" disabled={isSubmitting}>
      {#if isSubmitting}
        <span class="loading loading-sm loading-spinner"></span>
      {:else}
        <Save class="size-[1.2em]" />
      {/if}
      Save changes
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
