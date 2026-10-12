<script lang="ts">
  import { untrack } from 'svelte';
  import BundledCitationStylePicker from '../BundledCitationStylePicker.svelte';
  let { initial = 'ieee' }: { initial?: string } = $props();
  let value = $state(untrack(() => initial));
  let valid = $state(false);
</script>

<BundledCitationStylePicker id="test-style" bind:value bind:valid />
<output data-testid="selected-style">{value}</output>
<output data-testid="valid">{String(valid)}</output>
