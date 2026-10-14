<script lang="ts">
  import type { BibliographyEntry } from '@hayman/hayagriva-schema';

  let {
    value = $bindable(),
    label = 'Publisher',
    placeholder = 'Pearson',
    locationPlaceholder = 'USA',
  }: {
    value: BibliographyEntry['publisher'];
    label?: string;
    placeholder?: string;
    locationPlaceholder?: string;
  } = $props();

  const uid = $props.id();

  let publisherName = $state('');
  let publisherLocation: undefined | string = $state(undefined);

  function updatePublisher(event: Event, field: 'name' | 'location') {
    const text = (event.currentTarget as HTMLInputElement).value;
    const name = field === 'name' ? text : publisherName;
    const location = field === 'location' ? text : publisherLocation;
    // Editor mounting/disclosure never rewrites a structured publisher.
    if (typeof value === 'object' || location)
      value = {
        ...(typeof value === 'object' ? value : {}),
        name,
        location: location || undefined,
      };
    else value = name || undefined;
  }

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
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend"> {label} </legend>
  <label for="{uid}-publisher-name" class="label">{label}</label>
  <input
    type="text"
    id="{uid}-publisher-name"
    class="input w-full"
    value={publisherName}
    oninput={(event) => updatePublisher(event, 'name')}
    {placeholder}
    required={publisherLocation ? true : false}
  />

  <label for="{uid}-publisher-location" class="label">Location of {label}</label
  >
  <input
    type="text"
    id="{uid}-publisher-location"
    class="input w-full"
    value={publisherLocation ?? ''}
    oninput={(event) => updatePublisher(event, 'location')}
    placeholder={locationPlaceholder}
  />
</fieldset>
