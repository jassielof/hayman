<script lang="ts">
  import type { FormattableString } from '@hayman/hayagriva-schema';

  let { value }: { value?: FormattableString } = $props();
</script>

{#if typeof value === 'object'}
  {value.value}
{:else}
  {value}
{/if}
