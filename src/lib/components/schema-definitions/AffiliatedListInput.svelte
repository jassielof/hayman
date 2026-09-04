<script lang="ts">
  import type { AffiliatedPeople } from '@hayman/hayagriva-schema';
  import { AFFILIATED_ROLES } from '$lib/validators/affiliated-roles';
  import { PlusIcon, XIcon } from '@lucide/svelte';
  import PeopleInput from './PeopleInput.svelte';

  let { value = $bindable() }: { value?: AffiliatedPeople } = $props();

  const uid = $props.id();

  function addAffiliated() {
    const newAffiliated = { role: 'translator' as const, names: '' };
    if (value) {
      value = [...value, newAffiliated];
    } else {
      value = [newAffiliated];
    }
  }

  function removeAffiliated(index: number) {
    if (value) {
      const newValue = value.filter((_, i) => i !== index);
      value = newValue.length > 0 ? newValue : undefined;
    }
  }
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend"> Affiliated people </legend>

  {#if value && value.length > 0}
    <div class="space-y-4">
      {#each value as affiliation, i (i)}
        <div class="rounded-lg border border-border p-4">
          <div class="flex items-center justify-between">
            <h4 class="text-lg font-semibold">Affiliated Person #{i + 1}</h4>
            <button
              type="button"
              class="btn btn-circle btn-outline btn-sm btn-error"
              onclick={() => removeAffiliated(i)}
            >
              <XIcon class="h-4 w-4" />
            </button>
          </div>

          <label for={`${uid}-role-${i}`} class="label">Role</label>
          <select
            id={`${uid}-role-${i}`}
            class="select w-full"
            bind:value={affiliation.role}
          >
            {#each AFFILIATED_ROLES as role (role)}
              <option value={role}>{role}</option>
            {/each}
          </select>

          <PeopleInput label="Names" bind:value={affiliation.names} />
        </div>
      {/each}
    </div>
  {/if}

  <button type="button" class="btn btn-outline w-full" onclick={addAffiliated}>
    <PlusIcon class="size-[1.2em]" />
    Add Affiliated Person
  </button>
</fieldset>
