<script lang="ts">
  import type { BibliographyEntry, URL } from '$lib/types/hayagriva';
  import DateInput from './DateInput.svelte';

  let {
    value = $bindable(),
    label = 'URL',
    placeholder = 'https://example.com'
  }: {
    value?: URL;
    label?: string;
    placeholder?: string;
  } = $props();

  const uid = $props.id();

  let urlValue = $derived.by(() => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.value;
  });

  let dateValue: BibliographyEntry['date'] = $derived.by(() => {
    if (typeof value === 'string') return undefined;
    if (typeof value === 'object') return value.date;
  });

  $effect(() => {
    if (dateValue) {
      value = { value: urlValue!, date: dateValue };
    } else {
      value = urlValue;
    }
  });
</script>

<fieldset
  class="fieldset rounded-box border border-base-300 bg-base-100/50 p-4"
>
  <legend class="fieldset-legend"> {label} </legend>

  <label class="label" for="{uid}-entry-url">{label}</label>
  <input
    bind:value={urlValue}
    id="{uid}-entry-url"
    type="url"
    class="validator input w-full"
    {placeholder}
    required={dateValue ? true : false}
  />

  <DateInput bind:value={dateValue} />
</fieldset>
