<script lang="ts">
  import type { Person } from '$lib/types/hayagriva';

  type PersonObject = Exclude<Person, string>;

  let { value = $bindable(), remove }: { value: Person; remove: () => void } =
    $props();

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
  function updateParent() {
    if (isDetailed) {
      // Build the object, only including fields that have values
      const personObject: PersonObject = { name };
      if (givenName) personObject['given-name'] = givenName;
      if (prefix) personObject.prefix = prefix;
      if (suffix) personObject.suffix = suffix;
      if (alias) personObject.alias = alias;

      // Only update if name is present and the object has changed
      if (name && JSON.stringify(value) !== JSON.stringify(personObject)) {
        value = personObject;
      }
    } else {
      if (value !== simpleName) {
        value = simpleName;
      }
    }
  }
</script>

<fieldset class="fieldset gap-2 bg-muted/30">
  <legend class="fieldset-legend">
    <label class="cursor-pointer">
      <input
        type="checkbox"
        class="checkbox checkbox-sm"
        bind:checked={isDetailed}
        onchange={updateParent}
      />
      Detailed
    </label>
  </legend>

  {#if !isDetailed}
    <label class="label" for="{uid}-full-name"> Full Name </label>
    <input
      id="{uid}-full-name"
      type="text"
      class="input w-full"
      placeholder="Rowling, J. K."
      bind:value={simpleName}
      oninput={updateParent}
    />
  {:else}
    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div>
        <label for="{uid}-prefix" class="label pb-2">Prefix</label>
        <input
          id="{uid}-prefix"
          type="text"
          placeholder="Dr."
          class="input w-full"
          bind:value={prefix}
          oninput={updateParent}
        />
      </div>
      <div>
        <label for="{uid}-suffix" class="label pb-2">Suffix</label>
        <input
          id="{uid}-suffix"
          type="text"
          placeholder="Jr."
          class="input w-full"
          bind:value={suffix}
          oninput={updateParent}
        />
      </div>
      <div>
        <label for="{uid}-given-name" class="label pb-2">Given Name</label>
        <input
          id="{uid}-given-name"
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
          type="text"
          required
          placeholder="Doe"
          class="input w-full"
          bind:value={name}
          oninput={updateParent}
        />
      </div>
      <div class="md:col-span-2">
        <label for="{uid}-alias" class="label pb-2">Alias</label>
        <input
          id="{uid}-alias"
          type="text"
          placeholder="bell hooks"
          class="input w-full"
          bind:value={alias}
          oninput={updateParent}
        />
      </div>
    </div>
  {/if}
  <button class="btn btn-error mt-2" type="button" onclick={() => remove()}
    >Remove</button
  >
</fieldset>
