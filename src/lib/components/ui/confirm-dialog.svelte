<script lang="ts">
  import { AlertDialog } from 'bits-ui';
  import { cn } from '$lib/utils/cn';
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    children
  }: {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
    children?: Snippet;
  } = $props();

  let isConfirming = $state(false);

  async function handleConfirm() {
    if (isConfirming) return;
    isConfirming = true;
    try {
      await onConfirm();
      open = false;
    } finally {
      isConfirming = false;
    }
  }
</script>

<AlertDialog.Root bind:open>
  {#if children}
    <AlertDialog.Trigger>
      {#snippet child({ props })}
        <span {...props}>
          {@render children()}
        </span>
      {/snippet}
    </AlertDialog.Trigger>
  {/if}

  <AlertDialog.Portal>
    <AlertDialog.Overlay
      class="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/50"
    />
    <AlertDialog.Content
      class={cn(
        'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
        'rounded-lg border border-border bg-card p-6 shadow-lg'
      )}
    >
      <AlertDialog.Title class="text-lg font-semibold"
        >{title}</AlertDialog.Title
      >
      {#if description}
        <AlertDialog.Description class="mt-2 text-sm text-muted-foreground">
          {description}
        </AlertDialog.Description>
      {/if}

      <div class="mt-6 flex justify-end gap-2">
        <AlertDialog.Cancel class="btn btn-outline" type="button">
          {cancelLabel}
        </AlertDialog.Cancel>
        <button
          type="button"
          class={cn('btn', destructive ? 'btn-destructive' : 'btn-primary')}
          onclick={handleConfirm}
          disabled={isConfirming}
        >
          {#if isConfirming}
            <span class="loading loading-sm loading-spinner"></span>
          {/if}
          {confirmLabel}
        </button>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
