<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import BibliographyMetadataForm from '$lib/components/BibliographyMetadataForm.svelte';
  import {
    BibliographyService,
    formatValidationErrorMessage,
  } from '$lib/services/bibliography.service';
  import { CircleAlert } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data, params }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  const bibliography = $state(data.oldBibliography);

  let errorMessage = $state(undefined as string | undefined);
  let isSubmitting = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    errorMessage = undefined;

    try {
      await BibliographyService.updateMetadata(
        params.bibliographyId,
        bibliography,
      );

      goto(resolve(`/bibliography/${bibliography.metadata.id}/`));
    } catch (err: unknown) {
      errorMessage = formatValidationErrorMessage(err);
      console.error('Error updating bibliography:', err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form class="mx-auto max-w-md p-6" onsubmit={handleSubmit}>
  <fieldset class="fieldset bg-muted/30">
    <legend class="fieldset-legend"> Edit Bibliography </legend>

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlert />
        <span>{errorMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    <BibliographyMetadataForm
      bind:bibliographyMetadata={bibliography.metadata}
    />

    <div class="divider"></div>

    <button class="btn btn-primary" disabled={isSubmitting}>
      {#if isSubmitting}
        <span class="loading loading-sm loading-spinner"></span>
      {/if}
      Save
    </button>
    <a class="btn btn-error" href={resolve('/')}> Cancel </a>
  </fieldset>
</form>
