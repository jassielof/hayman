<script lang="ts">
  import { DATE_REGEX } from '$lib/formatters/date-formatter';
  import { type BibliographyEntry } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
    label = 'Date',
    placeholder = '2025, 2020-12, or 2010-12-30'
  }: {
    value?: BibliographyEntry['date'];
    label?: string;
    placeholder?: string;
  } = $props();

  const uid = $props.id();

  $effect(() => {
    if (typeof value === 'string' && /^-?\d+$/.test(value)) {
      value = parseInt(value);
    }
  });
</script>

<label class="label" for="{uid}-entry-date">{label}</label>
<input
  pattern={DATE_REGEX.source}
  title="Date must match the format: YYYY, YYYY-MM, or YYYY-MM-DD."
  bind:value
  id="{uid}-entry-date"
  type="text"
  class="input w-full"
  {placeholder}
/>
