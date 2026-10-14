<script lang="ts">
  import { resolve } from '$app/paths';

  export type BreadcrumbItem = {
    label: string;
    href?: string;
  };

  let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav
  aria-label="Breadcrumb"
  class="min-w-0 flex-1 text-sm text-muted-foreground"
>
  <ol class="flex min-w-0 items-center gap-1.5">
    {#each items as item, i (item.label + (item.href ?? ''))}
      <li
        class={i === items.length - 1
          ? 'flex min-w-0 flex-1 items-center gap-1.5'
          : 'hidden max-w-40 min-w-0 items-center gap-1.5 sm:flex'}
      >
        {#if i > 0}
          <span aria-hidden="true" class="hidden sm:inline">/</span>
        {/if}
        {#if item.href}
          <a
            class="truncate hover:text-foreground"
            title={item.label}
            href={resolve(item.href as '/')}
          >
            {item.label}
          </a>
        {:else}
          <span
            class="truncate font-semibold text-foreground"
            title={item.label}
            aria-current="page">{item.label}</span
          >
        {/if}
      </li>
    {/each}
  </ol>
</nav>
