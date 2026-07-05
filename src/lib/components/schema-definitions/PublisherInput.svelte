<script lang="ts">
  import type { BibliographyEntry } from '$lib/types/hayagriva';

  let {
    value = $bindable(),
    label = 'Publisher',
    placeholder = 'Pearson',
    locationPlaceholder = 'USA'
  }: {
    value: BibliographyEntry['publisher'];
    label?: string;
    placeholder?: string;
    locationPlaceholder?: string;
  } = $props();

  const uid = $props.id();

  let publisherName = $state('');
  let publisherLocation: undefined | string = $state(undefined);

  $effect(() => {
    if (typeof value === 'string') {
      publisherName = value;
      publisherLocation = undefined;
    } else if (value && typeof value === 'object') {
      publisherName = value.name;
      publisherLocation = value.location;
    } else {
      publisherName = '';
      publisherLocation = undefined;
    }
  });

  $effect(() => {
    if (!publisherName) {
      value = undefined;
    } else if (!publisherLocation) {
      value = publisherName;
    } else {
      value = {
        name: publisherName,
        location: publisherLocation
      };
    }
  });
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend"> {label} </legend>
  <label for="{uid}-publisher-name" class="label">{label}</label>
  <input
    type="text"
    id="{uid}-publisher-name"
    class="input w-full"
    bind:value={publisherName}
    {placeholder}
    required={publisherLocation ? true : false}
  />

  <label for="{uid}-publisher-location" class="label">Location of {label}</label
  >
  <input
    type="text"
    id="{uid}-publisher-location"
    class="input w-full"
    bind:value={publisherLocation}
    placeholder={locationPlaceholder}
  />
</fieldset>
