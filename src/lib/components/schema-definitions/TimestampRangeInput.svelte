<script lang="ts">
  import { XIcon } from '@lucide/svelte';
  import TimestampInput from './TimestampInput.svelte';

  let {
    value = $bindable(),
    label,
  }: {
    value?: string;
    label?: string;
  } = $props();

  const uid = $props.id();

  let start: string | undefined = $state();
  let end: string | undefined = $state();

  // Track if we're syncing to prevent infinite loops
  let isSyncing = false;

  // Parse the range value into start and end
  // Timestamp format: [DD:][HH:]MM:SS[,msms]
  // Range format: start-end
  // We need to be careful because timestamps contain colons, and we split by hyphen
  // But timestamps don't contain hyphens, so splitting by hyphen is safe
  function parseRange(range: string | undefined) {
    if (isSyncing) return;
    isSyncing = true;

    if (range && range.includes('-')) {
      // Find the hyphen that separates start and end
      // Since timestamps can have format like "12:34" or "1:23:45,567"
      // and don't contain hyphens themselves, we can split by hyphen
      const hyphenIndex = range.indexOf('-');
      start = range.substring(0, hyphenIndex);
      end = range.substring(hyphenIndex + 1);
    } else {
      start = undefined;
      end = undefined;
    }

    isSyncing = false;
  }

  // Format start and end back into a range string
  function formatRange(
    nextStart: string | undefined,
    nextEnd: string | undefined,
  ) {
    if (isSyncing) return;
    isSyncing = true;

    if (nextStart && nextEnd) {
      value = `${nextStart}-${nextEnd}`;
    } else {
      value = undefined;
    }

    isSyncing = false;
  }

  // Parse value when it changes from outside
  $effect(() => {
    parseRange(value);
  });

  // Update value when start or end change (from child TimestampInput)
  $effect(() => {
    formatRange(start, end);
  });

  function clearInput() {
    start = undefined;
    end = undefined;
    value = undefined;
  }
</script>

<div class="form-control w-full">
  {#if label}
    <span id="{uid}-timestamp-range-label" class="label">
      <span class="label-text">{label}</span>
    </span>
  {/if}
  <div
    class="flex items-center gap-2"
    role="group"
    aria-labelledby={label ? `${uid}-timestamp-range-label` : undefined}
  >
    <div class="flex-1">
      <TimestampInput bind:value={start} />
    </div>
    <span>-</span>
    <div class="flex-1">
      <TimestampInput bind:value={end} />
    </div>
    {#if value}
      <button class="btn btn-square" onclick={clearInput}>
        <XIcon class="h-4 w-4" />
      </button>
    {/if}
  </div>
</div>
