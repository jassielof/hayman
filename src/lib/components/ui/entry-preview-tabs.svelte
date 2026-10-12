<script lang="ts">
  import CitationStyleControls from '#lib/components/CitationStyleControls.svelte';
  import EntryCitationPreview from '#lib/components/EntryCitationPreview.svelte';
  import { SettingsService } from '#lib/services/settings.service.js';
  import {
    renderEntryPreview,
    type EntryPreview,
    DEFAULT_ENTRY_PREVIEW_TEMPLATE,
  } from '#lib/services/citation-preview.service.js';
  import type { AppSettings } from '#lib/types/app-settings.js';
  import type { Hayagriva } from '@hayman/hayagriva-schema';
  import { resolvePreviewCitationStyle } from '#lib/utils/citation-style.js';
  import { cn } from '#lib/utils/cn.js';
  import { Tabs } from 'bits-ui';
  import hljs from 'highlight.js/lib/core';
  import yaml from 'highlight.js/lib/languages/yaml';
  import { BookOpenIcon, CodeIcon } from '@lucide/svelte';

  hljs.registerLanguage('yaml', yaml);

  let {
    entryId,
    bibliographyData,
    entryYamlData,
  }: {
    entryId: string;
    bibliographyData: Hayagriva;
    entryYamlData: string[];
  } = $props();

  let tab = $state('code');
  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let overrideKind = $state<'bundled' | 'custom-csl'>('bundled');
  let styleInputDebounced = $state('ieee');
  let citationPreview = $state<EntryPreview | undefined>();
  let citationLoading = $state(false);
  let citationError = $state<string | undefined>();
  let lastRenderedStyleKey = $state<string | null>(null);
  let useEntryBodyOverride = $state(false);
  let entryPreviewTemplate = $state(DEFAULT_ENTRY_PREVIEW_TEMPLATE);
  let entryPreviewTemplateDebounced = $state(DEFAULT_ENTRY_PREVIEW_TEMPLATE);

  const yamlSource = $derived(entryYamlData.join('\n'));
  const highlightedYaml = $derived(
    hljs.highlight(yamlSource, { language: 'yaml' }).value,
  );

  const previewStyleKey = $derived(
    settings
      ? JSON.stringify({
          useDefaultStyle,
          overrideKind,
          style: styleInputDebounced.trim(),
          defaultStyle: settings.citation.defaultStyle,
          csl: settings.citation.customCsl ?? '',
          entryId,
          bibliographyData,
          entryTemplate: useEntryBodyOverride
            ? entryPreviewTemplateDebounced
            : (settings.citation.entryPreviewTemplate ??
              DEFAULT_ENTRY_PREVIEW_TEMPLATE),
        })
      : null,
  );

  async function renderCitation() {
    citationLoading = true;
    citationError = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      const resolved = resolvePreviewCitationStyle(loaded, {
        useSettingsDefault: useDefaultStyle,
        overrideKind,
        bundledStyle: styleInputDebounced,
      });
      // Record the attempt before invoking Hayagriva so failures remain visible
      // instead of immediately retriggering the same render forever.
      lastRenderedStyleKey = previewStyleKey;
      citationPreview = await renderEntryPreview(
        bibliographyData,
        entryId,
        resolved.styleName,
        resolved.useCustomCsl ? loaded.citation.customCsl : undefined,
        useEntryBodyOverride
          ? entryPreviewTemplateDebounced
          : loaded.citation.entryPreviewTemplate?.trim() ||
              DEFAULT_ENTRY_PREVIEW_TEMPLATE,
      );
    } catch (err) {
      citationError =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to render citation preview.';
      citationPreview = undefined;
    } finally {
      citationLoading = false;
    }
  }

  $effect(() => {
    const value = styleInput;
    if (useDefaultStyle || overrideKind !== 'bundled') {
      styleInputDebounced = value;
      return;
    }

    const timer = setTimeout(() => {
      styleInputDebounced = value;
    }, 400);

    return () => clearTimeout(timer);
  });

  $effect(() => {
    const value = entryPreviewTemplate;
    if (!useEntryBodyOverride) {
      entryPreviewTemplateDebounced = value;
      return;
    }

    const timer = setTimeout(() => {
      entryPreviewTemplateDebounced = value;
    }, 400);

    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (tab !== 'citation') {
      lastRenderedStyleKey = null;
      return;
    }

    const key = previewStyleKey;
    if (!key || citationLoading || key === lastRenderedStyleKey) return;

    queueMicrotask(() => renderCitation());
  });
</script>

<Tabs.Root bind:value={tab} class="w-full">
  <Tabs.List
    aria-label="Entry preview"
    class="inline-flex h-10 w-full flex-wrap items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground sm:w-auto"
  >
    <Tabs.Trigger
      value="code"
      class={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      )}
    >
      <CodeIcon class="size-4" />
      Code preview
    </Tabs.Trigger>
    <Tabs.Trigger
      value="citation"
      class={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      )}
    >
      <BookOpenIcon class="size-4" />
      Citation preview
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content
    value="code"
    class="mt-4 rounded-lg border border-border bg-card p-4 sm:p-6"
  >
    <pre class="code-block w-full overflow-x-auto"><code
        class="hljs language-yaml">{@html highlightedYaml}</code
      ></pre>
  </Tabs.Content>

  <Tabs.Content value="citation" class="mt-4 space-y-4">
    <CitationStyleControls
      bind:settings
      bind:styleInput
      bind:useDefaultStyle
      bind:overrideKind
      bind:useEntryBodyOverride
      bind:entryPreviewTemplate
      showEntryBodyControls={true}
      onRender={renderCitation}
    />
    <EntryCitationPreview
      preview={citationPreview}
      loading={citationLoading}
      error={citationError}
    />
  </Tabs.Content>
</Tabs.Root>
