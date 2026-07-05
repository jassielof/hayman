<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { Snippet } from 'svelte';

  let {
    title,
    open = true,
    class: className,
    children
  }: {
    title: string;
    open?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();
</script>

<details {open} class={cn('fieldset', className)}>
  <summary
    class="fieldset-legend cursor-pointer select-none marker:content-none"
  >
    <span class="inline-flex items-center gap-2">
      <span
        class="inline-block size-0 border-y-4 border-r-0 border-l-[6px] border-y-transparent border-l-current transition-transform [[open]>&]:rotate-90"
        aria-hidden="true"
      ></span>
      {title}
    </span>
  </summary>
  <div class="mt-3 space-y-3">
    {@render children?.()}
  </div>
</details>

<style>
  details[open] > summary span > span:first-child {
    transform: rotate(90deg);
  }
</style>
