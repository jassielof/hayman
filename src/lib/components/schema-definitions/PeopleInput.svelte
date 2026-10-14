<script lang="ts">
  import type { Author } from '@hayman/hayagriva-schema';
  import { PlusIcon } from '@lucide/svelte';
  import PersonInput from './PersonInput.svelte';
  import { tick } from 'svelte';

  let { value = $bindable(), label }: { value?: Author; label: string } =
    $props();
  let group: HTMLFieldSetElement;
  async function focusRow(index: number) {
    await tick();
    const rows = group?.querySelectorAll<HTMLElement>('.person-row');
    const row = rows?.[Math.min(index, rows.length - 1)];
    (
      row?.querySelector<HTMLInputElement>('input[type="text"]') ??
      group?.querySelector<HTMLButtonElement>('[data-add-person]')
    )?.focus();
  }

  function addPerson() {
    if (value === undefined || value === null) {
      // start as single
      value = '';
      void focusRow(0);
      return;
    }

    if (Array.isArray(value)) {
      // already a list, append another
      value = [...value, ''];
      void focusRow(value.length - 1);
      return;
    }

    // currently single -> convert to list and add a new empty one
    value = [value, ''];
    void focusRow(1);
  }

  function removeSingle() {
    value = undefined;
    void focusRow(0);
  }

  function removePerson(index: number) {
    if (!Array.isArray(value)) return;
    const next = value.filter((_, i) => i !== index);
    if (next.length === 0) {
      value = undefined;
    } else if (next.length === 1) {
      // collapse back to single
      value = next[0];
    } else {
      value = next;
    }
    void focusRow(index);
  }
</script>

<fieldset class="fieldset space-y-3" bind:this={group}>
  <legend class="fieldset-legend">{label} </legend>
  {#if value === undefined || value === null}
    <button
      type="button"
      class="btn btn-outline btn-sm"
      data-add-person
      onclick={addPerson}
    >
      <PlusIcon class="size-[1.2em]" /> Add {label}
    </button>
  {:else if Array.isArray(value)}
    <!-- Names are editable values, not row identities: keying by name remounts
         the input on every keystroke and drops focus. -->
    {#each value, i (i)}
      <PersonInput
        bind:value={value[i]}
        position={i}
        {label}
        remove={() => removePerson(i)}
      />
    {/each}

    <button
      type="button"
      class="btn btn-outline btn-sm"
      data-add-person
      onclick={addPerson}
    >
      <PlusIcon class="size-[1.2em]" /> Add Person
    </button>
  {:else}
    <PersonInput bind:value {label} remove={removeSingle} />

    <button
      type="button"
      class="btn btn-outline btn-sm"
      data-add-person
      onclick={addPerson}
    >
      <PlusIcon class="size-[1.2em]" /> Add Person
    </button>
  {/if}
</fieldset>
