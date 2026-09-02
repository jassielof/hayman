<script lang="ts">
  import type { Author } from '@hayman/hayagriva-schema';
  import { Plus } from '@lucide/svelte';
  import PersonInput from './PersonInput.svelte';

  let { value = $bindable(), label }: { value?: Author; label: string } =
    $props();

  function addPerson() {
    if (value === undefined || value === null) {
      // start as single
      value = '';
      return;
    }

    if (Array.isArray(value)) {
      // already a list, append another
      value = [...value, ''];
      return;
    }

    // currently single -> convert to list and add a new empty one
    value = [value, ''];
  }

  function removeSingle() {
    value = undefined;
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
  }
</script>

<fieldset class="fieldset gap-2 bg-muted/30">
  <legend class="fieldset-legend">{label} </legend>
  {#if value === undefined || value === null}
    <button
      type="button"
      class="btn btn-outline btn-success w-full"
      onclick={addPerson}
    >
      <Plus class="size-[1.2em]" /> Add {label}
    </button>
  {:else if Array.isArray(value)}
    {#each value as person, i (`${typeof person === 'string' ? person : person.name}-${i}`)}
      <PersonInput bind:value={value[i]} remove={() => removePerson(i)} />
    {/each}

    <button
      type="button"
      class="btn btn-outline btn-success mt-2 w-full"
      onclick={addPerson}
    >
      <Plus class="size-[1.2em]" /> Add Person
    </button>
  {:else}
    <PersonInput bind:value remove={removeSingle} />

    <button
      type="button"
      class="btn btn-outline btn-success mt-2 w-full"
      onclick={addPerson}
    >
      <Plus class="size-[1.2em]" /> Add Person
    </button>
  {/if}
</fieldset>
