<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount, tick } from 'svelte';
  import EntryFieldPicker from './EntryFieldPicker.svelte';
  import { focusEntryField } from '#lib/utils/focus-entry-field.js';
  import FormSection from '#lib/components/ui/form-section.svelte';
  import EntryTypeInput from '#lib/components/schema-definitions/EntryTypeInput.svelte';
  import FormattableStringInput from '#lib/components/schema-definitions/FormattableStringInput.svelte';
  import { formatFormattableString } from '#lib/formatters/formattable-string.js';
  import type { BibliographyEntry } from '@hayman/hayagriva-schema';
  import {
    ALL_ENTRY_FIELDS,
    isFieldVisible,
    isSectionRelevant,
    getSuggestedFields,
    type EntryFieldKey,
  } from '#lib/validators/entry-field-visibility.js';
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
  import type { AppSettings } from '#lib/types/app-settings.js';
  import { DEFAULT_APP_SETTINGS } from '#lib/types/app-settings.js';
  import { PlusIcon } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let {
    entryData = $bindable(),
    parentDepth = 0,
    editorSettings = DEFAULT_APP_SETTINGS.editor,
    fieldPath = '',
  }: {
    entryData: BibliographyEntry;
    parentDepth?: number;
    editorSettings?: AppSettings['editor'];
    fieldPath?: string;
  } = $props();

  const uid = $props.id();

  let parentType: 'none' | 'single' | 'list' = $state('none');
  let showAllFields = $state(false);
  let root: HTMLDivElement;
  let parentMessage = $state('');
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
        {
          ...editorSettings.fieldsByType,
          [(entryData.type ?? 'misc').toLowerCase()]: [
            ...getSuggestedFields(
              entryData.type,
              editorSettings.visibleFields,
              editorSettings.fieldsByType,
            ),
            ...sessionFields,
          ],
        },
      ),
  );
  async function addField(field: EntryFieldKey) {
    sessionFields.add(field);
    await tick();
    focusEntryField(root, `${fieldPath}${field}`);
  }
  onMount(() => {
    if (parentDepth !== 0) return;
    const listener = async (event: Event) => {
      const path = String((event as CustomEvent).detail);
      const field = path.split('.')[0] as EntryFieldKey;
      if (ALL_ENTRY_FIELDS.includes(field)) sessionFields.add(field);
      await tick();
      focusEntryField(root, path);
    };
    window.addEventListener('hayman-focus-field', listener);
    return () => window.removeEventListener('hayman-focus-field', listener);
  });

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
    parentMessage = '';

    switch (newType) {
      case 'none':
        if (
          entryData.parent &&
          !window.confirm('Remove this entry’s parent publication data?')
        ) {
          target.value = parentType;
          return;
        }
        entryData.parent = undefined;
        break;
      case 'single':
        if (Array.isArray(entryData.parent) && entryData.parent.length > 1) {
          parentMessage =
            'Remove extra parents before switching to a single parent.';
          target.value = parentType;
          return;
        }
        entryData.parent = Array.isArray(entryData.parent)
          ? (entryData.parent[0] ?? { type: 'Misc' })
          : (entryData.parent ?? { type: 'Misc' });
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

<div
  class="entry-form"
  data-entry-form={fieldPath}
  bind:this={root}
  onfocusin={(event) => {
    // Pin only the focused field, not every unused field revealed for inspection.
    const host = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-entry-field]',
    );
    const field = host?.dataset.entryField
      ?.slice(fieldPath.length)
      .split('.')[0] as EntryFieldKey;
    if (ALL_ENTRY_FIELDS.includes(field)) sessionFields.add(field);
  }}
>
  {#if parentDepth === 0}
    <div class="mb-5 space-y-3">
      <p class="text-sm text-muted-foreground">
        Your configured fields follow the reference type. Populated fields are
        always retained.
      </p>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2"
          ><input type="checkbox" bind:checked={showAllFields} />Show unused
          fields</label
        >
        <a
          class="text-primary underline underline-offset-4"
          href={resolve('/settings')}>Configure field defaults</a
        >
      </div>
      <EntryFieldPicker
        fields={ALL_ENTRY_FIELDS.filter((field) => !visible(field))}
        onSelect={addField}
      />
    </div>
  {/if}

  <FormSection title="Reference" open={true}>
    <div class="grid gap-4 sm:grid-cols-2">
      <div data-entry-field={`${fieldPath}type`}>
        <EntryTypeInput bind:value={entryData.type!} />
      </div>
      <div data-entry-field={`${fieldPath}date`}>
        <DateInput bind:value={entryData.date} />
      </div>
    </div>

    <div data-entry-field={`${fieldPath}title`}>
      <FormattableStringInput
        label="Title"
        placeholder="UML & Patterns"
        shortPlaceholder="UML"
        bind:value={entryData.title}
      />
    </div>

    {#if visible('chapter')}
      <div data-entry-field={fieldPath + 'chapter'}>
        <NumericOrStringInput
          label="Chapter"
          placeholder="3"
          bind:value={entryData.chapter}
        />
      </div>
    {/if}
  </FormSection>

  {#snippet parentEditor()}
    <FormSection title="Parent publication" open={!!entryData.parent}>
      <p class="text-sm text-muted-foreground">
        The journal, book or other publication containing this reference.
      </p>
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
      {#if parentMessage}<p role="alert" class="text-sm text-destructive">
          {parentMessage}
        </p>{/if}

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
          <details
            open={!entryData.parent.title}
            class="border-l-2 border-border pl-3"
          >
            <summary class="cursor-pointer py-2 text-sm font-medium"
              >Edit parent: {formatFormattableString(entryData.parent.title) ||
                'Untitled'} · {entryData.parent.type}</summary
            >
            <EntryForm
              bind:entryData={entryData.parent}
              parentDepth={parentDepth + 1}
              {editorSettings}
              fieldPath={`${fieldPath}parent.`}
            />
          </details>
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
            <details
              open={!parentEntry.title}
              class="border-l-2 border-border pl-3"
            >
              <summary class="cursor-pointer py-2 text-sm font-medium"
                >Edit parent {i + 1}: {formatFormattableString(
                  parentEntry.title,
                ) || 'Untitled'} · {parentEntry.type}</summary
              >
              <EntryForm
                bind:entryData={entryData.parent[i]}
                parentDepth={parentDepth + 1}
                {editorSettings}
                fieldPath={`${fieldPath}parent.${i}.`}
              />
            </details>
          {/if}
        {/each}

        <button
          type="button"
          class="btn btn-outline btn-secondary"
          onclick={addParent}
        >
          <PlusIcon class="size-4" />Add parent
        </button>
      {/if}
    </FormSection>
  {/snippet}

  {#if sectionOpen('people')}
    <FormSection title="People" open={sectionOpen('people')}>
      {#if visible('author')}
        <div data-entry-field={fieldPath + 'author'}>
          <PeopleInput label="Author" bind:value={entryData.author} />
        </div>
      {/if}
      {#if visible('editor')}
        <div data-entry-field={fieldPath + 'editor'}>
          <PeopleInput label="Editor" bind:value={entryData.editor} />
        </div>
      {/if}
      {#if visible('affiliated')}
        <div data-entry-field={fieldPath + 'affiliated'}>
          <AffiliatedListInput
            bind:value={entryData.affiliated}
            fieldPath={`${fieldPath}affiliated`}
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if sectionOpen('publication')}
    <FormSection title="Publication" open={sectionOpen('publication')}>
      {#if visible('publisher')}
        <div data-entry-field={fieldPath + 'publisher'}>
          <PublisherInput bind:value={entryData.publisher} />
        </div>
      {/if}
      {#if visible('issue')}
        <div data-entry-field={fieldPath + 'issue'}>
          <NumericOrStringInput
            label="Issue"
            placeholder="5"
            bind:value={entryData.issue}
          />
        </div>
      {/if}
      {#if visible('volume')}
        <div data-entry-field={fieldPath + 'volume'}>
          <NumericOrStringInput
            label="Volume"
            placeholder="10"
            bind:value={entryData.volume}
          />
        </div>
      {/if}
      {#if visible('edition')}
        <div data-entry-field={fieldPath + 'edition'}>
          <NumericOrStringInput
            label="Edition"
            placeholder="2nd"
            bind:value={entryData.edition}
          />
        </div>
      {/if}
      {#if visible('page-range')}
        <div data-entry-field={fieldPath + 'page-range'}>
          <NumericOrStringInput
            label="Page range"
            placeholder="1-10"
            bind:value={entryData['page-range']}
          />
        </div>
      {/if}
      {#if visible('volume-total')}
        <div data-entry-field={fieldPath + 'volume-total'}>
          <IntegerInput
            bind:value={entryData['volume-total']}
            label="Volume total"
            naturalSet={true}
            placeholder="0"
          />
        </div>
      {/if}
      {#if visible('page-total')}
        <div data-entry-field={fieldPath + 'page-total'}>
          <IntegerInput
            bind:value={entryData['page-total']}
            label="Page total"
            naturalSet={true}
            placeholder="0"
          />
        </div>
      {/if}
      {#if visible('genre')}
        <div data-entry-field={fieldPath + 'genre'}>
          <FormattableStringInput
            label="Genre"
            placeholder="Doctoral dissertation"
            bind:value={entryData.genre}
          />
        </div>
      {/if}
      {#if visible('organization')}
        <div data-entry-field={fieldPath + 'organization'}>
          <FormattableStringInput
            label="Organization"
            placeholder="ACM"
            bind:value={entryData.organization}
          />
        </div>
      {/if}
      {#if visible('location')}
        <div data-entry-field={fieldPath + 'location'}>
          <FormattableStringInput
            label="Location"
            placeholder="New York, NY"
            bind:value={entryData.location}
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if sectionOpen('media')}
    <FormSection title="Links & media" open={sectionOpen('media')}>
      {#if visible('time-range')}
        <div data-entry-field={fieldPath + 'time-range'}>
          <TimestampRangeInput
            bind:value={entryData['time-range']}
            label="Time range"
          />
        </div>
      {/if}
      {#if visible('runtime')}
        <div data-entry-field={fieldPath + 'runtime'}>
          <TimestampInput bind:value={entryData.runtime} label="Runtime" />
        </div>
      {/if}
      {#if visible('url')}
        <div data-entry-field={fieldPath + 'url'}>
          <UrlInput bind:value={entryData.url} />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if sectionOpen('identifiers')}
    <FormSection title="Identifiers" open={sectionOpen('identifiers')}>
      {#if visible('serial-number')}
        <div data-entry-field={fieldPath + 'serial-number'}>
          <SerialNumberInput bind:value={entryData['serial-number']} />
        </div>
      {/if}
      {#if visible('language')}
        <div data-entry-field={fieldPath + 'language'}>
          <LanguageInput bind:value={entryData.language} />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if sectionOpen('archive')}
    <FormSection title="Archive" open={sectionOpen('archive')}>
      {#if visible('call-number')}
        <div data-entry-field={fieldPath + 'call-number'}>
          <FormattableStringInput
            label="Call Number"
            placeholder="QA76.76.D47 G66 2005"
            bind:value={entryData['call-number']}
          />
        </div>
      {/if}
      {#if visible('archive')}
        <div data-entry-field={fieldPath + 'archive'}>
          <FormattableStringInput
            label="Archive"
            placeholder="Library of Congress"
            bind:value={entryData.archive}
          />
        </div>
      {/if}
      {#if visible('archive-location')}
        <div data-entry-field={fieldPath + 'archive-location'}>
          <FormattableStringInput
            label="Archive Location"
            placeholder="Box 12, Folder 3"
            bind:value={entryData['archive-location']}
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if sectionOpen('notes')}
    <FormSection title="Notes" open={sectionOpen('notes')}>
      {#if visible('abstract')}
        <div data-entry-field={fieldPath + 'abstract'}>
          <FormattableStringInput
            label="Abstract"
            placeholder="This article compares..."
            bind:value={entryData.abstract}
            multiline={true}
          />
        </div>
      {/if}
      {#if visible('note')}
        <div data-entry-field={fieldPath + 'note'}>
          <FormattableStringInput
            label="Note"
            placeholder="See also related work in appendix."
            bind:value={entryData.note}
            multiline={true}
          />
        </div>
      {/if}
    </FormSection>
  {/if}
  {@render parentEditor()}
</div>
