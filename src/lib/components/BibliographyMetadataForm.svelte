<script lang="ts">
  import type { BibliographyMetadata } from '$lib/types/bibliography-metadata';

  let {
    bibliographyMetadata = $bindable()
  }: {
    bibliographyMetadata: BibliographyMetadata;
  } = $props();
</script>

<label for="bibliography-id" class="label">ID</label>
<input
  id="bibliography-id"
  type="text"
  title="Enter a unique ID for the bibliography"
  placeholder="my-research-papers"
  class="input w-full font-mono"
  bind:value={bibliographyMetadata.id}
  onblur={() => (bibliographyMetadata.id = bibliographyMetadata.id.trim())}
  required
/>

<label for="bibliography-title" class="label">Title</label>
<input
  id="bibliography-title"
  type="text"
  placeholder="My Research Papers"
  title="Enter a title for the bibliography"
  class="input w-full"
  bind:value={bibliographyMetadata.title}
  oninput={() => {}}
  onblur={() =>
    (bibliographyMetadata.title = bibliographyMetadata.title.trim())}
  required
/>

<label for="bibliography-description" class="label"> Description </label>
<textarea
  id="bibliography-description"
  class="textarea w-full"
  placeholder="Research papers on various topics"
  bind:value={bibliographyMetadata.description}
  onblur={() =>
    (bibliographyMetadata.description =
      bibliographyMetadata.description?.trim())}></textarea>
