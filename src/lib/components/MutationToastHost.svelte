<script lang="ts">
  import {
    subscribeToMutations,
    type MutationNotification,
  } from '$lib/services/mutation-notifications';
  import { RotateCcw, X } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';

  const DISPLAY_MS = 8000;
  let notifications = $state<MutationNotification[]>([]);
  const timers = new SvelteMap<string, ReturnType<typeof setTimeout>>();

  function dismiss(id: string) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    notifications = notifications.filter((item) => item.id !== id);
  }

  async function undo(notification: MutationNotification) {
    await notification.undo();
    dismiss(notification.id);
  }

  onMount(() =>
    subscribeToMutations((notification) => {
      notifications = [...notifications.slice(-3), notification];
      timers.set(
        notification.id,
        setTimeout(() => dismiss(notification.id), DISPLAY_MS),
      );
    }),
  );
</script>

<div
  class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
  aria-live="polite"
  aria-atomic="false"
>
  {#each notifications as notification (notification.id)}
    <div
      class="pointer-events-auto rounded-lg border border-border bg-card p-4 shadow-lg"
    >
      <p class="pr-8 text-sm">{notification.message}</p>
      <div class="mt-3 flex items-center gap-2">
        <button
          class="btn btn-sm btn-outline"
          onclick={() => undo(notification)}
        >
          <RotateCcw class="size-4" /> Undo
        </button>
        <button
          class="btn btn-sm btn-ghost ml-auto"
          aria-label="Dismiss notification"
          onclick={() => dismiss(notification.id)}
        >
          <X class="size-4" />
        </button>
      </div>
    </div>
  {/each}
</div>
