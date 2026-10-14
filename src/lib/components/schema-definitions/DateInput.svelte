<script lang="ts">
  import { DATE_REGEX } from '#lib/formatters/date-formatter.js';
  import { type BibliographyEntry } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
    label = 'Date',
    placeholder = '2025, 2020-12, or 2010-12-30',
  }: {
    value?: BibliographyEntry['date'];
    label?: string;
    placeholder?: string;
  } = $props();

  const uid = $props.id();
</script>

<label class="label" for="{uid}-entry-date">{label}</label>
<input
  pattern={DATE_REGEX.source}
  title="Date must match the format: YYYY, YYYY-MM, or YYYY-MM-DD."
  value={value ?? ''}
  oninput={(event) => {
    const text = event.currentTarget.value;
    value =
      typeof value === 'number' && /^-?\d+$/.test(text)
        ? Number(text)
        : text || undefined;
  }}
  id="{uid}-entry-date"
  type="text"
  class="input w-full"
  {placeholder}
/>
