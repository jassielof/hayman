<script lang="ts">
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import EntryPreviewTabs from '$lib/components/ui/entry-preview-tabs.svelte';
  import { Check, Clipboard, Pencil } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data, params }: PageProps = $props();
  let copied = $state(false);

  async function copyYaml() {
    await navigator.clipboard.writeText(data.entryYamlData.join('\n'));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<main class="container mx-auto max-w-5xl p-4">
  <Breadcrumbs
    items={[
      { label: 'Home', href: '/' },
      {
        label: 'Bibliography',
        href: `/bibliography/${params.bibliographyId}/`,
      },
      { label: params.entryId },
    ]}
  />

  <div class="mb-4 flex flex-wrap justify-end gap-2">
    <button
      type="button"
      class="btn btn-outline"
      aria-label={copied
        ? 'YAML copied to clipboard'
        : 'Copy YAML to clipboard'}
      onclick={copyYaml}
    >
      {#if copied}
        <Check class="size-4" />
        Copied
      {:else}
        <Clipboard class="size-4" />
        Copy YAML
      {/if}
    </button>
    <a
      class="btn btn-primary"
      href={resolve(
        `/bibliography/${params.bibliographyId}/entry/${params.entryId}/edit`,
      )}
    >
      <Pencil class="size-4" />
      Edit entry
    </a>
  </div>

  <EntryPreviewTabs
    entryId={params.entryId}
    bibliographyData={data.bibliographyData}
    entryYamlData={data.entryYamlData}
  />
</main>
