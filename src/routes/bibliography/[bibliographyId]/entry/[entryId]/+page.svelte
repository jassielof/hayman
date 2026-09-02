<script lang="ts">
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import EntryPreviewTabs from '$lib/components/ui/entry-preview-tabs.svelte';
  import { Pencil } from '@lucide/svelte';
  import type { PageProps } from './$types';

  let { data, params }: PageProps = $props();
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

  <div class="mb-4 flex justify-end">
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
