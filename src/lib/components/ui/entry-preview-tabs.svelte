<script lang="ts">
  import PreviewEntry from '$lib/components/views/PreviewEntry.svelte';
  import type { TopLevelEntry } from '$lib/types/hayagriva';
  import { cn } from '$lib/utils/cn';
  import { Tabs } from 'bits-ui';
  import hljs from 'highlight.js/lib/core';
  import yaml from 'highlight.js/lib/languages/yaml';
  import 'highlight.js/styles/github-dark.css';
  import { Clipboard, Code, Eye } from '@lucide/svelte';

  hljs.registerLanguage('yaml', yaml);

  let {
    entry,
    entryYamlData
  }: {
    entry: TopLevelEntry;
    entryYamlData: string[];
  } = $props();

  let tab = $state('preview');
  let copied = $state(false);

  const yamlSource = $derived(entryYamlData.join('\n'));
  const highlightedYaml = $derived(
    hljs.highlight(yamlSource, { language: 'yaml' }).value
  );

  async function copyYaml() {
    await navigator.clipboard.writeText(yamlSource);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<Tabs.Root bind:value={tab} class="w-full">
  <Tabs.List
    class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
  >
    <Tabs.Trigger
      value="preview"
      class={cn(
        'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
      )}
    >
      <Eye class="size-4" />
      Entry preview
    </Tabs.Trigger>
    <Tabs.Trigger
      value="code"
      class={cn(
        'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
      )}
    >
      <Code class="size-4" />
      Code preview
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content
    value="preview"
    class="mt-4 rounded-lg border border-border bg-card p-6"
  >
    <PreviewEntry {entry} baseHeadingLevel={1} />
  </Tabs.Content>

  <Tabs.Content
    value="code"
    class="mt-4 rounded-lg border border-border bg-card p-6"
  >
    <div class="relative">
      <pre class="code-block w-full overflow-x-auto"><code
          class="hljs language-yaml">{@html highlightedYaml}</code
        ></pre>
      <button
        type="button"
        class="btn btn-sm btn-neutral absolute top-2 right-2"
        aria-label="Copy YAML to clipboard"
        onclick={copyYaml}
      >
        <Clipboard class="size-4" />
      </button>
      {#if copied}
        <span
          class="absolute top-2 right-24 rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
          role="status"
        >
          Copied!
        </span>
      {/if}
    </div>
  </Tabs.Content>
</Tabs.Root>
