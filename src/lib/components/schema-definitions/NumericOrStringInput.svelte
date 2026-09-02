<script lang="ts">
  import type { NumericOrString } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
    label,
    placeholder
  }: {
    value?: NumericOrString;
    label: string;
    placeholder: string;
  } = $props();

  const uid = $props.id();

  $effect(() => {
    if (typeof value === 'string' && !isNaN(Number(value))) {
      value = Number(value);
    }
  });
</script>

<label class="label" for="{uid}-numeric-or-string">{label}</label>
<input
  class="input w-full"
  type="text"
  id="{uid}-numeric-or-string"
  {placeholder}
  bind:value
/>
