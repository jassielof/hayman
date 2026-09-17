<script lang="ts">
  import type { TopLevelEntry } from '@hayman/hayagriva-schema';
  import YAML from 'yaml';
  import EntryForm from './EntryForm.svelte';
  import { parseAndValidateEntry } from '$lib/validators/parse-and-validate';
  import { BracesIcon, ListTreeIcon } from '@lucide/svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { onMount } from 'svelte';

  let {
    entryData = $bindable(),
    invalid = $bindable(false),
  }: {
    entryData: TopLevelEntry;
    invalid?: boolean;
  } = $props();
  let mode = $state<'guided' | 'yaml'>('guided');
  let source = $state('');
  let sourceError = $state<string | undefined>();
  let showAllFieldsInitially = $state(false);

  onMount(async () => {
    const settings = await SettingsService.get();
    showAllFieldsInitially = settings.editor.fieldMode === 'all';
    if (settings.editor.defaultMode === 'yaml') showYaml();
  });

  function showYaml() {
    source = YAML.stringify(entryData, { schema: 'core' });
    sourceError = undefined;
    invalid = false;
    mode = 'yaml';
  }

  function updateFromYaml(value: string) {
    source = value;
    try {
      const parsed: unknown = YAML.parse(value, { schema: 'core' });
      const validation = parseAndValidateEntry(parsed as TopLevelEntry);
      if (!validation.valid) {
        sourceError = validation.errors?.[0]
          ? `${validation.errors[0].path}: ${validation.errors[0].message}`
          : 'This is not a valid Hayagriva entry.';
        invalid = true;
        return;
      }
      entryData = parsed as TopLevelEntry;
      sourceError = undefined;
      invalid = false;
    } catch (error) {
      sourceError = error instanceof Error ? error.message : 'Invalid YAML.';
      invalid = true;
    }
  }
</script>

<div
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-2"
>
  <div
    class="inline-flex rounded-md bg-card p-1 shadow-xs"
    aria-label="Entry editor mode"
  >
    <button
      type="button"
      class="btn btn-sm {mode === 'guided' ? 'btn-primary' : 'btn-ghost'}"
      aria-pressed={mode === 'guided'}
      disabled={invalid}
      onclick={() => (mode = 'guided')}
    >
      <ListTreeIcon class="size-4" /> Guided form
    </button>
    <button
      type="button"
      class="btn btn-sm {mode === 'yaml' ? 'btn-primary' : 'btn-ghost'}"
      aria-pressed={mode === 'yaml'}
      onclick={showYaml}
    >
      <BracesIcon class="size-4" /> YAML
    </button>
  </div>
  <p class="px-2 text-xs text-muted-foreground">
    Both modes edit the same Hayagriva entry.
  </p>
</div>

{#if mode === 'guided'}
  <EntryForm bind:entryData preferredAllFields={showAllFieldsInitially} />
{:else}
  <div class="space-y-2">
    <label for="entry-yaml-source" class="label">Hayagriva entry YAML</label>
    <textarea
      id="entry-yaml-source"
      class="textarea min-h-[32rem] font-mono text-sm leading-relaxed"
      value={source}
      spellcheck="false"
      oninput={(event) => updateFromYaml(event.currentTarget.value)}></textarea>
    {#if sourceError}
      <div class="alert alert-error" role="alert">{sourceError}</div>
      <p class="text-xs text-muted-foreground">
        Fix the YAML before returning to the guided form or saving.
      </p>
    {:else}
      <p class="text-xs text-primary" role="status">
        Valid Hayagriva entry. Changes are synchronized with the form.
      </p>
    {/if}
  </div>
{/if}
