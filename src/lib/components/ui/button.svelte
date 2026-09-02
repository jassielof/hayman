<script lang="ts">
  import { resolve } from '$app/paths';
  import { cn } from '$lib/utils/cn';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Variant =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'outline'
    | 'soft'
    | 'destructive'
    | 'success'
    | 'dash';

  type Size = 'default' | 'sm' | 'icon';

  let {
    variant = 'default',
    size = 'default',
    class: className,
    children,
    href,
    ...restProps
  }: HTMLButtonAttributes & {
    variant?: Variant;
    size?: Size;
    class?: string;
    children?: Snippet;
    href?: string;
  } = $props();

  const variantClass: Record<Variant, string> = {
    default: 'btn-secondary',
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    soft: 'btn-soft',
    destructive: 'btn-destructive',
    success: 'btn-success',
    dash: 'btn-dash',
  };

  const sizeClass: Record<Size, string> = {
    default: '',
    sm: 'btn-sm',
    icon: 'btn-square btn-sm',
  };
</script>

{#if href}
  <a
    href={resolve(href as '/')}
    class={cn('btn', variantClass[variant], sizeClass[size], className)}
    {...restProps as Record<string, unknown>}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    class={cn('btn', variantClass[variant], sizeClass[size], className)}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
