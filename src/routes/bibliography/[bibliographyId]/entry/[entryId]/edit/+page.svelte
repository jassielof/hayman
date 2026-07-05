<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import EntryForm from '$lib/components/EntryForm.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import {
    hayagrivaService,
    HayagrivaStructureError
  } from '$lib/services/hayagriva.service';
  import { ClipboardPaste, Save, X } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data, params }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let newEntryId = $state(params.entryId);
  // svelte-ignore state_referenced_locally
  let newEntryData = $state(data.oldEntry);
</script>

<form
  onsubmit={async () => {
    await BibliographyService.updateEntry(
      params.bibliographyId,
      newEntryId,
      newEntryData,
      params.entryId
    );

    goto(resolve(`/bibliography/${params.bibliographyId}/`));
  }}
  class="mx-auto w-full max-w-5xl p-6"
>
  <fieldset
    class="fieldset rounded-box border border-base-300 bg-base-100/50 p-4"
  >
    <legend class="fieldset-legend text-xl">Edit entry</legend>
    <button
      class="btn btn-dash btn-info"
      type="button"
      onclick={() => {
        navigator.clipboard.readText().then((text) => {
          try {
            const data = hayagrivaService.import(text);
            const dataLength = Object.keys(data).length;

            if (dataLength > 1 || dataLength <= 0) {
              alert(
                `The bibliography needs to have 1 entry. It has ${dataLength} entries.`
              );
              return;
            }

            newEntryId = Object.keys(data)[0];
            newEntryData = data[newEntryId];
          } catch (err) {
            const message =
              err instanceof HayagrivaStructureError
                ? err.message
                : 'Invalid bibliography.';
            alert(message);
          }
        });
      }}
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
      onblur={() => (newEntryId = newEntryId.trim())}
      bind:value={newEntryId}
    />

    <EntryForm bind:entryData={newEntryData} />

    <button class="btn mt-4 btn-success">
      <Save class="size-[1.2em]" />
      Add
    </button>
    <a
      href={resolve(`/bibliography/${params.bibliographyId}/`)}
      class="btn btn-error"
      type="button"
    >
      <X class="size-[1.2em]" />
      Cancel
    </a>
  </fieldset>
</form>
