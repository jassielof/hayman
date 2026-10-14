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

  const text = $derived(
    typeof value === 'object' ? value.value : (value ?? ''),
  );
  const options = $derived(
    typeof value === 'object' && ('short' in value || 'verbatim' in value),
  );
  function updateText(text: string) {
    // Preserve the existing representation, including explicit false flags.
    value =
      typeof value === 'object' ? { ...value, value: text } : text || undefined;
  }
  function updateOption(key: 'short' | 'verbatim', next: string | boolean) {
    const object: Exclude<FormattableString, string> =
      typeof value === 'object' ? { ...value } : { value: value ?? '' };
    if (key === 'short') {
      if (next) object.short = String(next);
      else delete object.short;
    } else object.verbatim = Boolean(next);
    value = object;
  }
</script>

<div class="space-y-2">
  {#if multiline}
    <label class="label" for="{uid}-textarea-entry">{label}</label>
    <textarea
      id="{uid}-textarea-entry"
      class="textarea w-full"
      {placeholder}
      data-value-key="value"
      value={text}
      oninput={(event) => updateText(event.currentTarget.value)}></textarea>
  {:else}
    <label for="{uid}-main-value" class="label">{label}</label>
    <input
      id="{uid}-main-value"
      type="text"
      class="input w-full"
      {placeholder}
      data-value-key="value"
      value={text}
      oninput={(event) => updateText(event.currentTarget.value)}
    />
  {/if}

  <details open={options} class="text-sm">
    <summary
      class="w-fit cursor-pointer text-muted-foreground hover:text-foreground"
      >{label} options</summary
    >
    <div class="mt-3 space-y-3 border-l-2 border-border pl-3">
      <label for="{uid}-short-form" class="label">Short form of {label}</label>
      <input
        id="{uid}-short-form"
        type="text"
        placeholder={shortPlaceholder}
        class="input w-full"
        data-value-key="short"
        value={typeof value === 'object' ? (value.short ?? '') : ''}
        oninput={(event) => updateOption('short', event.currentTarget.value)}
      />

      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          data-value-key="verbatim"
          checked={typeof value === 'object' && value.verbatim === true}
          onchange={(event) =>
            updateOption('verbatim', event.currentTarget.checked)}
        />
        Preserve capitalization
      </label>
      <p class="text-xs text-muted-foreground">
        Keep capitalization exactly as entered (Hayagriva’s verbatim option).
      </p>
    </div>
  </details>
</div>
