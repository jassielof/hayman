<script lang="ts">
  import type { Person } from '@hayman/hayagriva-schema';
  import { formatAuthor } from '#lib/formatters/author.js';

  type PersonObject = Exclude<Person, string>;

  let {
    value = $bindable(),
    remove,
    position = 0,
    label = 'Person',
  }: {
    value: Person;
    remove: () => void;
    position?: number;
    label?: string;
  } = $props();

  const uid = $props.id();

  let isDetailed = $state(false);

  // State for all form fields
  let simpleName = $state('');
  let name = $state('');
  let givenName = $state('');
  let prefix = $state('');
  let suffix = $state('');
  let alias = $state('');

  // When the 'value' from the parent changes, populate the form fields
  $effect(() => {
    if (typeof value === 'string') {
      isDetailed = false;
      simpleName = value;
    } else if (value && typeof value === 'object') {
      isDetailed = true;
      simpleName = ''; // Clear simple name
      name = value.name || '';
      givenName = value['given-name'] || '';
      prefix = value.prefix || '';
      suffix = value.suffix || '';
      alias = value.alias || '';
    } else {
      // Handle null or undefined, reset all
      isDetailed = false;
      simpleName = '';
      name = '';
      givenName = '';
      prefix = '';
      suffix = '';
      alias = '';
    }
  });

  // Called on any input change to update the parent component's state
  function updateParent(event: Event) {
    if (isDetailed) {
      // Build the object, only including fields that have values
      const personObject: PersonObject =
        typeof value === 'object' ? { ...value, name } : { name };
      if (givenName) personObject['given-name'] = givenName;
      if (prefix) personObject.prefix = prefix;
      if (suffix) personObject.suffix = suffix;
      if (alias) personObject.alias = alias;
      const input = event.currentTarget as HTMLInputElement;
      const key = input.dataset.valueKey as keyof PersonObject;
      if (key === 'name' || input.value) personObject[key] = input.value;
      else delete personObject[key];

      // An empty family name is a visible validation error, not a stale saved value.
      if (JSON.stringify(value) !== JSON.stringify(personObject)) {
        value = personObject;
      }
    } else {
      const next = (event.currentTarget as HTMLInputElement).value;
      if (value !== next) {
        value = next;
      }
    }
  }
</script>

<fieldset
  class="person-row min-w-0 space-y-3 border-b border-border pb-4"
  data-person-index={position}
>
  <legend class="sr-only">{label} {position + 1}</legend>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <label class="cursor-pointer">
      <input
        type="checkbox"
        class="checkbox checkbox-sm"
        bind:checked={isDetailed}
        onchange={() => {
          // Selecting an editor is not permission to rewrite a name. Seed the
          // literal/family field without guessing how international names split.
          if (isDetailed && typeof value === 'string') {
            name = value;
            givenName = prefix = suffix = alias = '';
          }
        }}
      />
      Separate family and given names
    </label>
    <button
      class="btn btn-ghost btn-sm text-muted-foreground"
      type="button"
      aria-label={`Remove ${label.toLowerCase()} ${position + 1}`}
      onclick={() => remove()}>Remove</button
    >
  </div>

  {#if !isDetailed}
    {#if typeof value === 'object'}
      <p class="text-sm">{formatAuthor(value)}</p>
      <p class="text-xs text-muted-foreground">
        Structured name details are retained. Expand separate names to edit
        them.
      </p>
    {:else}
      <label class="label" for="{uid}-full-name"> Full Name </label>
      <input
        id="{uid}-full-name"
        type="text"
        class="input w-full"
        placeholder="Rowling, J. K."
        bind:value={simpleName}
        oninput={updateParent}
      />
      <p class="text-xs text-muted-foreground">
        Use “Family, Given” or enter a literal organization name.
      </p>
    {/if}
  {:else}
    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div>
        <label for="{uid}-given-name" class="label pb-2">Given Name</label>
        <input
          id="{uid}-given-name"
          data-value-key="given-name"
          type="text"
          placeholder="Jane"
          class="input w-full"
          bind:value={givenName}
          oninput={updateParent}
        />
      </div>
      <div>
        <label for="{uid}-name" class="label pb-2">Family Name</label>
        <input
          id="{uid}-name"
          data-value-key="name"
          type="text"
          required
          placeholder="Doe"
          class="input w-full"
          bind:value={name}
          oninput={updateParent}
        />
      </div>
    </div>
    <details open={!!(prefix || suffix || alias)} class="text-sm">
      <summary
        class="w-fit cursor-pointer text-muted-foreground hover:text-foreground"
        >Name details</summary
      >
      <div class="mt-3 grid gap-3 border-l-2 border-border pl-3 sm:grid-cols-2">
        <div>
          <label for="{uid}-prefix" class="label">Prefix</label>
          <input
            id="{uid}-prefix"
            data-value-key="prefix"
            class="input"
            placeholder="Dr."
            bind:value={prefix}
            oninput={updateParent}
          />
        </div>
        <div>
          <label for="{uid}-suffix" class="label">Suffix</label>
          <input
            id="{uid}-suffix"
            data-value-key="suffix"
            class="input"
            placeholder="Jr."
            bind:value={suffix}
            oninput={updateParent}
          />
        </div>
        <div class="sm:col-span-2">
          <label for="{uid}-alias" class="label pb-2">Alias</label>
          <input
            id="{uid}-alias"
            data-value-key="alias"
            type="text"
            placeholder="bell hooks"
            class="input w-full"
            bind:value={alias}
            oninput={updateParent}
          />
        </div>
      </div>
    </details>
  {/if}
</fieldset>
