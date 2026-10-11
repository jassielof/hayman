<script lang="ts">
  import { untrack } from 'svelte';
  import type { BibliographyEntry } from '@hayman/hayagriva-schema';
  import EntryForm from '../EntryForm.svelte';

  let { initial }: { initial: BibliographyEntry } = $props();
  let entry = $state(untrack(() => initial));
</script>

<EntryForm bind:entryData={entry} />
<output data-testid="entry">{JSON.stringify(entry)}</output>
