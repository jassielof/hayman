<script lang="ts">
  import PreviewEntry from '$lib/components/views/PreviewEntry.svelte';
  import { Clipboard, Code, Eye } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<main>
  <div class="container mx-auto pt-4">
    <div class="tabs-lift tabs">
      <label class="tab">
        <input type="radio" name="entry-preview" checked={true} />
        <Eye class="me-2 size-4" />
        Entry preview
      </label>
      <div class="tab-content border-base-300 bg-base-100 p-6">
        <PreviewEntry entry={data.entry} baseHeadingLevel={1} />
      </div>

      <label class="tab">
        <input type="radio" name="entry-preview" />
        <Code class="me-2 size-4" />
        Code preview
      </label>
      <div class="tab-content border-base-300 bg-base-100 p-6">
        <div class="relative">
          <div class="mockup-code w-full">
            {#each data.entryYamlData as line, i (i)}
              <pre data-prefix={i + 1}><code>{line}</code></pre>
            {/each}
          </div>
          <button
            type="button"
            class="btn absolute top-2 right-2 btn-sm btn-neutral"
            onclick={() =>
              navigator.clipboard.writeText(data.entryYamlData.join('\n'))}
          >
            <Clipboard class="size-4" />
          </button>
        </div>
      </div>
      <!-- TODO: Add a hayagriva rendered preview, powered by the Hayagriva WASM compiled module, it should ideally render the entry in 2 forms, the way it'll be cited, and the way it'll be listed in the references, each of these should be configurable to the user's preference, to the style they'll use, say IEEE, APA, ACM, etc. -->
    </div>
  </div>
</main>
