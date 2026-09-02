<script lang="ts">
  let {
    svg,
    loading = false,
    error = undefined as string | undefined,
    variant = 'default' as 'default' | 'citation',
  }: {
    svg?: string;
    loading?: boolean;
    error?: string;
    variant?: 'default' | 'citation';
  } = $props();
</script>

<div class="rounded-lg border border-border bg-card p-4">
  {#if loading}
    <div
      class="flex min-h-48 flex-col items-center justify-center gap-2 text-center"
      role="status"
    >
      <span class="loading loading-md loading-spinner"></span>
      <span>Compiling Typst preview…</span>
      <span class="max-w-sm text-xs text-muted-foreground">
        The first preview downloads WebAssembly (~8MB) and may take up to a
        minute. The tab can look frozen while the compiler initializes.
      </span>
    </div>
  {:else if error}
    <div role="alert" class="alert alert-error">
      <span>{error}</span>
    </div>
  {:else if !svg}
    <p class="text-sm text-muted-foreground">
      Click “Render preview” to generate a Typst citation preview.
    </p>
  {:else}
    <div
      class="typst-paper typst-preview w-full"
      class:typst-preview--citation={variant === 'citation'}
      role="img"
      aria-label="Typst citation preview"
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted Typst compiler SVG output -->
      {@html svg}
    </div>
  {/if}
</div>
