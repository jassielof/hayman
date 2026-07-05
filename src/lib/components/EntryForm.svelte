<script lang="ts">
  import EntryTypeInput from '$lib/components/schema-definitions/EntryTypeInput.svelte';
  import FormattableStringInput from '$lib/components/schema-definitions/FormattableStringInput.svelte';
  import type { BibliographyEntry } from '$lib/types/hayagriva';
  import { X } from '@lucide/svelte';
  import EntryForm from './EntryForm.svelte';
  import AffiliatedListInput from './schema-definitions/AffiliatedListInput.svelte';
  import DateInput from './schema-definitions/DateInput.svelte';
  import IntegerInput from './schema-definitions/IntegerInput.svelte';
  import LanguageInput from './schema-definitions/LanguageInput.svelte';
  import NumericOrStringInput from './schema-definitions/NumericOrStringInput.svelte';
  import PeopleInput from './schema-definitions/PeopleInput.svelte';
  import PublisherInput from './schema-definitions/PublisherInput.svelte';
  import SerialNumberInput from './schema-definitions/SerialNumberInput.svelte';
  import TimestampInput from './schema-definitions/TimestampInput.svelte';
  import TimestampRangeInput from './schema-definitions/TimestampRangeInput.svelte';
  import UrlInput from './schema-definitions/UrlInput.svelte';

  let { entryData = $bindable() }: { entryData: BibliographyEntry } = $props();

  const uid = $props.id();

  let parentType: 'none' | 'single' | 'list' = $state('none');

  $effect(() => {
    if (entryData.parent === undefined || entryData.parent === null) {
      parentType = 'none';
    } else if (Array.isArray(entryData.parent)) {
      parentType = 'list';
    } else {
      parentType = 'single';
    }
  });

  function handleParentTypeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const newType = target.value;

    switch (newType) {
      case 'none':
        entryData.parent = undefined;
        break;
      case 'single':
        if (!entryData.parent || Array.isArray(entryData.parent)) {
          entryData.parent = { type: 'Misc' };
        }
        break;
      case 'list':
        if (!Array.isArray(entryData.parent)) {
          entryData.parent = entryData.parent ? [entryData.parent] : [];
        }
        break;
    }
  }

  function addParent() {
    if (Array.isArray(entryData.parent)) {
      entryData.parent = [...entryData.parent, { type: 'Misc' }];
    }
  }

  function removeParent(index: number) {
    if (Array.isArray(entryData.parent)) {
      entryData.parent = entryData.parent.filter((_, i) => i !== index);
    }
  }
</script>

<EntryTypeInput bind:value={entryData.type!} />

<FormattableStringInput
  label="Title"
  placeholder="UML & Patterns"
  shortPlaceholder="UML"
  bind:value={entryData.title}
/>

<PeopleInput label="Author" bind:value={entryData.author} />

<DateInput bind:value={entryData.date} />

<PeopleInput label="Editor" bind:value={entryData.editor} />

<AffiliatedListInput bind:value={entryData.affiliated} />

<PublisherInput bind:value={entryData.publisher} />

<NumericOrStringInput
  label="Issue"
  placeholder="5"
  bind:value={entryData.issue}
/>

<NumericOrStringInput
  label="Volume"
  placeholder="10"
  bind:value={entryData.volume}
/>

<NumericOrStringInput
  label="Edition"
  placeholder="2nd"
  bind:value={entryData.edition}
/>

<NumericOrStringInput
  label="Page range"
  placeholder="1-10"
  bind:value={entryData['page-range']}
/>

<IntegerInput
  bind:value={entryData['volume-total']}
  label="Volume total"
  naturalSet={true}
  placeholder="0"
/>

<IntegerInput
  bind:value={entryData['page-total']}
  label="Page total"
  naturalSet={true}
  placeholder="0"
/>

<TimestampRangeInput bind:value={entryData['time-range']} label="Time range" />

<TimestampInput bind:value={entryData.runtime} label="Runtime" />

<UrlInput bind:value={entryData.url} />

<SerialNumberInput bind:value={entryData['serial-number']} />

<LanguageInput bind:value={entryData.language} />

<FormattableStringInput
  label="Abstract"
  placeholder="This article compares..."
  bind:value={entryData.abstract!}
  multiline={true}
/>

<FormattableStringInput
  label="Genre"
  placeholder="Doctoral dissertation"
  bind:value={entryData.genre!}
/>

<FormattableStringInput
  label="Call Number"
  placeholder="QA76.76.D47 G66 2005"
  bind:value={entryData['call-number']!}
/>

<FormattableStringInput
  label="Location"
  placeholder="New York, NY"
  bind:value={entryData.location!}
/>

<FormattableStringInput
  label="Organization"
  placeholder="ACM"
  bind:value={entryData.organization!}
/>

<FormattableStringInput
  label="Archive"
  placeholder="Library of Congress"
  bind:value={entryData.archive!}
/>

<FormattableStringInput
  label="Archive Location"
  placeholder="Box 12, Folder 3"
  bind:value={entryData['archive-location']!}
/>

<FormattableStringInput
  label="Note"
  placeholder="See also related work in appendix."
  bind:value={entryData.note!}
  multiline={true}
/>

<div class="divider"></div>

<label for="{uid}-parent-type" class="label">Parent Type</label>
<select
  id="{uid}-parent-type"
  class="select w-full"
  value={parentType}
  onchange={handleParentTypeChange}
>
  <option value="none">None</option>
  <option value="single">Single Parent</option>
  <option value="list">List of Parents</option>
</select>

{#if parentType === 'single' && entryData.parent && !Array.isArray(entryData.parent)}
  <h3 class="mt-4 text-lg text-secondary">
    Parent entry of
    <span class="font-semibold italic">
      {#if typeof entryData.title == 'string'}
        {entryData.title}
      {:else if typeof entryData.title === 'object' && entryData.title.value}
        {entryData.title.value}
      {/if}
    </span>
  </h3>
  <EntryForm bind:entryData={entryData.parent} />
{/if}

{#if parentType === 'list' && Array.isArray(entryData.parent)}
  {#each entryData.parent as parentEntry, i (parentEntry)}
    <div class="mt-4 flex">
      <div class="flex-1">
        <h3 class="text-lg text-secondary">
          Parent entry #{i + 1} of
          <span class="font-semibold italic">
            {entryData.title}
          </span>
        </h3>
      </div>

      <div class="flex items-center">
        <button
          type="button"
          class="btn btn-circle btn-outline btn-sm btn-error"
          onclick={() => removeParent(i)}
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <EntryForm bind:entryData={entryData.parent[i]} />
  {/each}

  <button
    type="button"
    class="btn mt-4 btn-outline btn-secondary"
    onclick={addParent}
  >
    Add Parent
  </button>
{/if}
