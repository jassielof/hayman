<script lang="ts">
  let {
    value = $bindable(),
    label,
    naturalSet = false,
    placeholder
  }: {
    value?: number;
    label: string;
    naturalSet?: boolean;
    placeholder: string;
  } = $props();

  const uid = $props.id();
</script>

<label for="{uid}-integer-input" class="label">{label}</label>
<input
  type="number"
  min={naturalSet ? '0' : undefined}
  id="{uid}-integer-input"
  class="input w-full"
  bind:value
  {placeholder}
/>
