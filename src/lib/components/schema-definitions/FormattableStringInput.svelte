<script lang="ts">
  import type { FormattableString } from '@hayman/hayagriva-schema';
  let {
    value = $bindable(),
    label,
    placeholder,
    shortPlaceholder = 'Optional short form',
    multiline = false,
  }: {
    value?: FormattableString;
    label: string;
    placeholder: string;
    shortPlaceholder?: string;
    multiline?: boolean;
  } = $props();

  const uid = $props.id();

  let mainValue = $derived.by(() => {
    if (typeof value === 'object' && value) return value.value;
    if (typeof value === 'string') return value;
  });

  let shortValue = $derived.by(() => {
    if (typeof value === 'object' && value) return value.short;
    if (typeof value === 'string') return undefined;
  });

  let verbatimValue = $derived.by(() => {
    if (typeof value === 'object' && value) return value.verbatim;
    if (typeof value === 'string') return undefined;
  });

  $effect(() => {
    if (shortValue || verbatimValue) {
      value = {
        value: mainValue!,
        short: shortValue,
        verbatim: verbatimValue,
      };
    } else {
      value = mainValue!;
    }
  });
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend">{label}</legend>

  {#if multiline}
    <label class="label" for="{uid}-textarea-entry">{label}</label>
    <textarea
      id="{uid}-textarea-entry"
      class="textarea w-full"
      {placeholder}
      bind:value={mainValue}></textarea>
  {:else}
    <label for="{uid}-main-value" class="label">{label}</label>
    <input
      id="{uid}-main-value"
      type="text"
      class="input w-full"
      {placeholder}
      bind:value={mainValue}
    />
  {/if}

  <label for="{uid}-short-form" class="label">Short form of {label}</label>
  <input
    id="{uid}-short-form"
    type="text"
    placeholder={shortPlaceholder}
    class="input w-full"
    bind:value={shortValue}
  />

  <label class="label mt-2 font-mono">
    <input type="checkbox" class="checkbox" bind:checked={verbatimValue} />
    Verbatim
  </label>
</fieldset>
