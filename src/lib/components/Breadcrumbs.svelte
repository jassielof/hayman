<script lang="ts">
  import { resolve } from '$app/paths';

  export type BreadcrumbItem = {
    label: string;
    href?: string;
  };

  let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted-foreground">
  <ol class="flex flex-wrap items-center gap-1">
    {#each items as item, i (item.label + (item.href ?? ''))}
      <li class="flex items-center gap-1">
        {#if i > 0}
          <span aria-hidden="true">/</span>
        {/if}
        {#if item.href}
          <a class="hover:text-foreground" href={resolve(item.href as '/')}>
            {item.label}
          </a>
        {:else}
          <span class="text-foreground" aria-current="page">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
