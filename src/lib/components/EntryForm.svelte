<script lang="ts">
  import FormSection from '$lib/components/ui/form-section.svelte';
  import EntryTypeInput from '$lib/components/schema-definitions/EntryTypeInput.svelte';
  import FormattableStringInput from '$lib/components/schema-definitions/FormattableStringInput.svelte';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import type { BibliographyEntry } from '@hayman/hayagriva-schema';
  import {
    ALL_ENTRY_FIELDS,
    formatEntryFieldLabel,
    isFieldVisible,
    isSectionRelevant,
    type EntryFieldKey,
  } from '$lib/validators/entry-field-visibility';
  import { MAX_PARENT_DEPTH } from '@hayman/hayagriva-schema';
  import { XIcon } from '@lucide/svelte';
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
  import type { AppSettings } from '$lib/types/app-settings';
  import { DEFAULT_APP_SETTINGS } from '$lib/types/app-settings';
  import { PlusIcon } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let {
    entryData = $bindable(),
    parentDepth = 0,
    editorSettings = DEFAULT_APP_SETTINGS.editor,
  }: {
    entryData: BibliographyEntry;
    parentDepth?: number;
    editorSettings?: AppSettings['editor'];
  } = $props();

  const uid = $props.id();

  let parentType: 'none' | 'single' | 'list' = $state('none');
  let showAllFields = $state(false);
  const sessionFields = new SvelteSet<EntryFieldKey>();

  const entryTitle = $derived(
    formatFormattableString(entryData.title) || 'Untitled',
  );
  const visible = $derived((field: EntryFieldKey) =>
    isFieldVisible(
      field,
      entryData.type,
      showAllFields || sessionFields.has(field),
      entryData,
      editorSettings.visibleFields,
      editorSettings.fieldsByType,
    ),
  );
  const sectionOpen = $derived(
    (section: Parameters<typeof isSectionRelevant>[0]) =>
      isSectionRelevant(
        section,
        entryData.type,
        showAllFields,
        entryData,
        [...editorSettings.visibleFields, ...sessionFields],
        editorSettings.fieldsByType,
      ),
  );
  const completedFieldCount = $derived(
    Object.values(entryData).filter(
      (value) => value !== undefined && value !== '',
    ).length,
  );

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

{#if parentDepth === 0}
  <section
    class="sticky top-2 z-10 mb-4 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-semibold">Entry details</h2>
        <p class="text-xs text-muted-foreground">
          {completedFieldCount} populated {completedFieldCount === 1
            ? 'field'
            : 'fields'} · Suggested fields adapt to the entry type.
        </p>
      </div>
      <div
        class="inline-flex rounded-md border border-border bg-muted p-1"
        aria-label="Field visibility"
      >
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-medium"
          class:bg-card={!showAllFields}
          class:shadow-sm={!showAllFields}
          aria-pressed={!showAllFields}
          onclick={() => (showAllFields = false)}>Focused</button
        >
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-medium"
          class:bg-card={showAllFields}
          class:shadow-sm={showAllFields}
          aria-pressed={showAllFields}
          onclick={() => (showAllFields = true)}>All Hayagriva fields</button
        >
      </div>
    </div>
    <details class="mt-3 border-t border-border pt-3">
      <summary
        class="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-primary"
      >
        <PlusIcon class="size-4" /> Add a field
      </summary>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each ALL_ENTRY_FIELDS.filter((field) => !visible(field)) as field (field)}
          <button
            type="button"
            class="btn btn-outline btn-sm justify-start"
            onclick={() => sessionFields.add(field)}
          >
            <PlusIcon class="size-3.5" />
            {formatEntryFieldLabel(field)}
          </button>
        {:else}
          <p class="text-sm text-muted-foreground">All fields are visible.</p>
        {/each}
      </div>
    </details>
  </section>
{/if}

<FormSection title="Core" open={true}>
  <EntryTypeInput bind:value={entryData.type!} />

  <FormattableStringInput
    label="Title"
    placeholder="UML & Patterns"
    shortPlaceholder="UML"
    bind:value={entryData.title}
  />

  <DateInput bind:value={entryData.date} />

  {#if visible('chapter')}
    <NumericOrStringInput
      label="Chapter"
      placeholder="3"
      bind:value={entryData.chapter}
    />
  {/if}
</FormSection>

<FormSection title="Parent reference" open={sectionOpen('parent')}>
  <label for="{uid}-parent-type" class="label">Parent type</label>
  <select
    id="{uid}-parent-type"
    class="select w-full"
    value={parentType}
    onchange={handleParentTypeChange}
  >
    <option value="none">None</option>
    <option value="single">Single parent</option>
    <option value="list">List of parents</option>
  </select>

  {#if parentType === 'single' && entryData.parent && !Array.isArray(entryData.parent)}
    <h3 class="mt-2 text-sm text-muted-foreground">
      Parent of <span class="font-semibold italic">{entryTitle}</span>
    </h3>
    {#if parentDepth >= MAX_PARENT_DEPTH}
      <p class="text-sm text-warning">
        Parent nesting is too deep to edit further here ({MAX_PARENT_DEPTH} levels
        max).
      </p>
    {:else}
      <EntryForm
        bind:entryData={entryData.parent}
        parentDepth={parentDepth + 1}
        {editorSettings}
      />
    {/if}
  {/if}

  {#if parentType === 'list' && Array.isArray(entryData.parent)}
    {#each entryData.parent as parentEntry, i (parentEntry)}
      <div class="mt-4 flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <h3 class="text-sm text-muted-foreground">
            Parent #{i + 1} of
            <span class="font-semibold italic">{entryTitle}</span>
          </h3>
        </div>
        <button
          type="button"
          class="btn btn-circle btn-outline btn-sm btn-error"
          aria-label={`Remove parent ${i + 1}`}
          onclick={() => removeParent(i)}
        >
          <XIcon class="h-4 w-4" />
        </button>
      </div>

      {#if parentDepth >= MAX_PARENT_DEPTH}
        <p class="text-sm text-warning">
          Parent nesting is too deep to edit further here ({MAX_PARENT_DEPTH}
          levels max).
        </p>
      {:else}
        <EntryForm
          bind:entryData={entryData.parent[i]}
          parentDepth={parentDepth + 1}
          {editorSettings}
        />
      {/if}
    {/each}

    <button
      type="button"
      class="btn btn-outline btn-secondary"
      onclick={addParent}
    >
      Add parent
    </button>
  {/if}
</FormSection>

{#if sectionOpen('people')}
  <FormSection title="People" open={sectionOpen('people')}>
    {#if visible('author')}
      <PeopleInput label="Author" bind:value={entryData.author} />
    {/if}
    {#if visible('editor')}
      <PeopleInput label="Editor" bind:value={entryData.editor} />
    {/if}
    {#if visible('affiliated')}
      <AffiliatedListInput bind:value={entryData.affiliated} />
    {/if}
  </FormSection>
{/if}

{#if sectionOpen('publication')}
  <FormSection title="Publication" open={sectionOpen('publication')}>
    {#if visible('publisher')}
      <PublisherInput bind:value={entryData.publisher} />
    {/if}
    {#if visible('issue')}
      <NumericOrStringInput
        label="Issue"
        placeholder="5"
        bind:value={entryData.issue}
      />
    {/if}
    {#if visible('volume')}
      <NumericOrStringInput
        label="Volume"
        placeholder="10"
        bind:value={entryData.volume}
      />
    {/if}
    {#if visible('edition')}
      <NumericOrStringInput
        label="Edition"
        placeholder="2nd"
        bind:value={entryData.edition}
      />
    {/if}
    {#if visible('page-range')}
      <NumericOrStringInput
        label="Page range"
        placeholder="1-10"
        bind:value={entryData['page-range']}
      />
    {/if}
    {#if visible('volume-total')}
      <IntegerInput
        bind:value={entryData['volume-total']}
        label="Volume total"
        naturalSet={true}
        placeholder="0"
      />
    {/if}
    {#if visible('page-total')}
      <IntegerInput
        bind:value={entryData['page-total']}
        label="Page total"
        naturalSet={true}
        placeholder="0"
      />
    {/if}
    {#if visible('genre')}
      <FormattableStringInput
        label="Genre"
        placeholder="Doctoral dissertation"
        bind:value={entryData.genre}
      />
    {/if}
    {#if visible('organization')}
      <FormattableStringInput
        label="Organization"
        placeholder="ACM"
        bind:value={entryData.organization}
      />
    {/if}
    {#if visible('location')}
      <FormattableStringInput
        label="Location"
        placeholder="New York, NY"
        bind:value={entryData.location}
      />
    {/if}
  </FormSection>
{/if}

{#if sectionOpen('media')}
  <FormSection title="Media & links" open={sectionOpen('media')}>
    {#if visible('time-range')}
      <TimestampRangeInput
        bind:value={entryData['time-range']}
        label="Time range"
      />
    {/if}
    {#if visible('runtime')}
      <TimestampInput bind:value={entryData.runtime} label="Runtime" />
    {/if}
    {#if visible('url')}
      <UrlInput bind:value={entryData.url} />
    {/if}
  </FormSection>
{/if}

{#if sectionOpen('identifiers')}
  <FormSection title="Identifiers" open={sectionOpen('identifiers')}>
    {#if visible('serial-number')}
      <SerialNumberInput bind:value={entryData['serial-number']} />
    {/if}
    {#if visible('language')}
      <LanguageInput bind:value={entryData.language} />
    {/if}
  </FormSection>
{/if}

{#if sectionOpen('archive')}
  <FormSection title="Archive" open={sectionOpen('archive')}>
    {#if visible('call-number')}
      <FormattableStringInput
        label="Call Number"
        placeholder="QA76.76.D47 G66 2005"
        bind:value={entryData['call-number']}
      />
    {/if}
    {#if visible('archive')}
      <FormattableStringInput
        label="Archive"
        placeholder="Library of Congress"
        bind:value={entryData.archive}
      />
    {/if}
    {#if visible('archive-location')}
      <FormattableStringInput
        label="Archive Location"
        placeholder="Box 12, Folder 3"
        bind:value={entryData['archive-location']}
      />
    {/if}
  </FormSection>
{/if}

{#if sectionOpen('notes')}
  <FormSection title="Notes" open={sectionOpen('notes')}>
    {#if visible('abstract')}
      <FormattableStringInput
        label="Abstract"
        placeholder="This article compares..."
        bind:value={entryData.abstract}
        multiline={true}
      />
    {/if}
    {#if visible('note')}
      <FormattableStringInput
        label="Note"
        placeholder="See also related work in appendix."
        bind:value={entryData.note}
        multiline={true}
      />
    {/if}
  </FormSection>
{/if}
