<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import BibliographyMetadataForm from '$lib/components/BibliographyMetadataForm.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import {
    hayagrivaService,
    HayagrivaStructureError
  } from '$lib/services/hayagriva.service';
  import type { Bibliography } from '$lib/types/bibliography';
  import { CircleAlert } from '@lucide/svelte';

  let newBibliography: Bibliography = $state({
    data: {},
    metadata: {
      id: '',
      title: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  let files: FileList | undefined = $state(undefined);
  let isLoading = $state(false);
  let errorMessage = $state(undefined as string | undefined);

  $effect(() => {
    if (files && files.length > 0) {
      isLoading = true;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          newBibliography.data = hayagrivaService.import(
            reader.result as string
          );
          errorMessage = undefined;
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

  async function handleSubmit() {
    try {
      if (newBibliography.metadata.id === 'new') {
        errorMessage = '"new" is a reserved ID. Please choose another one.';
        return;
      }

      await BibliographyService.add(newBibliography);
      goto(resolve('/'));
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'ConstraintError'
      ) {
        errorMessage = 'Bibliography with this ID already exists.';
      } else {
        errorMessage = 'Failed to save bibliography. Please try again.';
      }
      console.error('Error saving bibliography:', error);
    }
  }
</script>

<form class="mx-auto max-w-md p-6" onsubmit={handleSubmit}>
  <fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
    <legend class="fieldset-legend">New Bibliography</legend>

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <CircleAlert />
        <span>{errorMessage}</span>
      </div>
      <div class="divider"></div>
    {/if}

    <label for="hayagriva-file" class="label">
      <span class="label-text">Import from a Hayagriva YAML file</span>
    </label>

    <input
      type="file"
      class="file-input w-full"
      onchange={() => {
        if (!files || files.length === 0) return;

        newBibliography.metadata.id = files[0].name.replace(
          /\.(yml|yaml)$/i,
          ''
        ) as string;
        newBibliography.metadata.title = newBibliography.metadata.id
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }}
      id="hayagriva-file"
      accept="application/yaml"
      bind:files
      disabled={isLoading}
    />

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

    <button class="btn btn-primary">Save</button>
    <a class="btn btn-error" href={resolve('/')}>Cancel</a>
  </fieldset>
</form>
