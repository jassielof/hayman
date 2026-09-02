<script lang="ts">
  import { LANGUAGE_REGEX } from '$lib/formatters/language';
  import { type Language } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
  }: {
    value: Language | undefined;
  } = $props();

  const uid = $props.id();
</script>

<label class="label" for="{uid}-entry-language"> Language </label>
<input
  type="text"
  id="{uid}-entry-language"
  placeholder="en-US"
  class="input w-full"
  title="Language must match the Unicode Language Identifier format."
  pattern={LANGUAGE_REGEX.source}
  bind:value
/>
