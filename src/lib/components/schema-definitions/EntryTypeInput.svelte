<script lang="ts">
  import {
    ENTRY_TYPES,
    formatEntryType,
  } from '$lib/formatters/entry-type-formatter';
  import type { Type } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
  }: {
    value: Type;
  } = $props();

  const uid = $props.id();
</script>

<label for="{uid}-entry-type" class="label">Type </label>
<select id="{uid}-entry-type" class="select w-full" bind:value>
  <option disabled selected>Select an entry type</option>
  {#each ENTRY_TYPES as type (type)}
    {@const { label } = formatEntryType(type)}
    <option value={type}>
      {label}
    </option>
  {/each}
</select>
