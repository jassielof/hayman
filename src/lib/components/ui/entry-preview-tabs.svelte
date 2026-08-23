<script lang="ts">
  import CitationStyleControls from '$lib/components/CitationStyleControls.svelte';
  import TypstPreview from '$lib/components/TypstPreview.svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { renderEntryCitationSvg } from '$lib/services/typst-preview.service';
  import type { AppSettings } from '$lib/types/app-settings';
  import type { Hayagriva } from '$lib/types/hayagriva';
  import {
    resolvePreviewCitationStyle
  } from '$lib/utils/citation-style';
  import { isMobileViewport } from '$lib/utils/match-mobile';
  import { cn } from '$lib/utils/cn';
  import { Tabs } from 'bits-ui';
  import hljs from 'highlight.js/lib/core';
  import yaml from 'highlight.js/lib/languages/yaml';
  import 'highlight.js/styles/github-dark.css';
  import { BookOpen, Clipboard, Code } from '@lucide/svelte';

  hljs.registerLanguage('yaml', yaml);

  let {
    entryId,
    bibliographyData,
    entryYamlData
  }: {
    entryId: string;
    bibliographyData: Hayagriva;
    entryYamlData: string[];
  } = $props();

  let tab = $state('code');
  let copied = $state(false);
  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let overrideKind = $state<'bundled' | 'custom-csl'>('bundled');
  let citationSvg = $state<string | undefined>();
  let citationLoading = $state(false);
  let citationError = $state<string | undefined>();
  let citationRendered = $state(false);

  const yamlSource = $derived(entryYamlData.join('\n'));
  const highlightedYaml = $derived(
    hljs.highlight(yamlSource, { language: 'yaml' }).value
  );

  async function copyYaml() {
    await navigator.clipboard.writeText(yamlSource);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function renderCitation() {
    citationLoading = true;
    citationError = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      const resolved = resolvePreviewCitationStyle(loaded, {
        useSettingsDefault: useDefaultStyle,
        overrideKind,
        bundledStyle: styleInput
      });
      citationSvg = await renderEntryCitationSvg(
        bibliographyData,
        entryId,
        resolved.typstStyle,
        resolved.label,
        loaded.fonts,
        resolved.useCustomCsl ? loaded.citation.customCsl : undefined,
        isMobileViewport()
      );
      citationRendered = true;
    } catch (err) {
      citationError =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to render citation preview.';
      citationSvg = undefined;
    } finally {
      citationLoading = false;
    }
  }

  $effect(() => {
    if (tab !== 'citation') {
      citationRendered = false;
      return;
    }

    if (citationRendered || citationLoading) return;

    queueMicrotask(() => renderCitation());
  });
</script>

<Tabs.Root bind:value={tab} class="w-full">
  <Tabs.List
    class="inline-flex h-10 w-full flex-wrap items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground sm:w-auto"
  >
    <Tabs.Trigger
      value="code"
      class={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
      )}
    >
      <Code class="size-4" />
      Code preview
    </Tabs.Trigger>
    <Tabs.Trigger
      value="citation"
      class={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
      )}
    >
      <BookOpen class="size-4" />
      Citation preview
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content
    value="code"
    class="mt-4 rounded-lg border border-border bg-card p-4 sm:p-6"
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

  <Tabs.Content value="citation" class="mt-4 space-y-4">
    <CitationStyleControls
      bind:settings
      bind:styleInput
      bind:useDefaultStyle
      bind:overrideKind
      onRender={renderCitation}
    />
    <TypstPreview
      svg={citationSvg}
      loading={citationLoading}
      error={citationError}
      variant="citation"
    />
  </Tabs.Content>
</Tabs.Root>
