<script lang="ts">
  let {
    value = $bindable(),
    label
  }: {
    value?: string;
    label?: string;
  } = $props();

  const uid = $props.id();

  // Use $state for reactive individual fields
  let day = $state<string>('');
  let hour = $state<string>('');
  let minute = $state<string>('');
  let second = $state<string>('');
  let millisecond = $state<string>('');

  // Track if we're currently syncing to prevent infinite loops
  let isSyncing = false;

  // Parse incoming value into individual fields
  function parseValue(val: string | undefined) {
    if (isSyncing) return;
    isSyncing = true;

    if (!val) {
      day = '';
      hour = '';
      minute = '';
      second = '';
      millisecond = '';
      isSyncing = false;
      return;
    }

    // Split by comma first to separate milliseconds
    const [timePart, msPart] = val.split(',');
    const parts = timePart.split(':');

    // Format: [DD:][HH:]MM:SS[,msms]
    // Minimum is MM:SS (2 parts)
    if (parts.length === 2) {
      // MM:SS
      day = '';
      hour = '';
      minute = parts[0];
      second = parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      day = '';
      hour = parts[0];
      minute = parts[1];
      second = parts[2];
    } else if (parts.length === 4) {
      // DD:HH:MM:SS
      day = parts[0];
      hour = parts[1];
      minute = parts[2];
      second = parts[3];
    }

    millisecond = msPart || '';
    isSyncing = false;
  }

  // Format fields back into timestamp string
  function formatValue() {
    if (isSyncing) return;
    isSyncing = true;

    // Minimum required: MM:SS
    if (!minute || !second) {
      value = undefined;
      isSyncing = false;
      return;
    }

    const parts: string[] = [];

    // Only include day if it has a value
    if (day) {
      parts.push(day);
      // If day is present, hour is required
      parts.push(hour || '0');
    } else if (hour) {
      // If hour is present but not day
      parts.push(hour);
    }

    // MM:SS are always required
    parts.push(minute.padStart(2, '0'));
    parts.push(second.padStart(2, '0'));

    let result = parts.join(':');

    // Add milliseconds if present
    if (millisecond) {
      result += ',' + millisecond;
    }

    value = result;
    isSyncing = false;
  }

  // Parse value when it changes from outside
  $effect(() => {
    parseValue(value);
  });

  // Handlers for input changes
  function handleDayInput(e: Event) {
    day = (e.target as HTMLInputElement).value;
    formatValue();
  }

  function handleHourInput(e: Event) {
    hour = (e.target as HTMLInputElement).value;
    formatValue();
  }

  function handleMinuteInput(e: Event) {
    minute = (e.target as HTMLInputElement).value;
    formatValue();
  }

  function handleSecondInput(e: Event) {
    second = (e.target as HTMLInputElement).value;
    formatValue();
  }

  function handleMillisecondInput(e: Event) {
    millisecond = (e.target as HTMLInputElement).value;
    formatValue();
  }
</script>

{#if label}
  <label id="{uid}-timestamp-label" class="label" for="{uid}-timestamp-minute">
    {label}
  </label>
{/if}
<div
  class="join w-full"
  role="group"
  aria-labelledby={label ? `${uid}-timestamp-label` : undefined}
>
  <input
    id="{uid}-timestamp-day"
    type="number"
    min="0"
    placeholder="DD"
    class="validator input join-item w-1/5"
    value={day}
    oninput={handleDayInput}
  />
  <input
    id="{uid}-timestamp-hour"
    type="number"
    min="0"
    max={day ? 23 : undefined}
    placeholder="HH"
    class="validator input join-item w-1/5"
    required={!!day}
    value={hour}
    oninput={handleHourInput}
  />
  <input
    id="{uid}-timestamp-minute"
    type="number"
    min="0"
    max={hour ? 59 : undefined}
    placeholder="MM"
    class="validator input join-item w-1/5"
    required={!!second || !!hour}
    value={minute}
    oninput={handleMinuteInput}
  />
  <input
    id="{uid}-timestamp-second"
    type="number"
    min="0"
    max={minute ? 59 : undefined}
    placeholder="SS"
    required={!!minute || !!millisecond}
    class="validator input join-item w-1/5"
    value={second}
    oninput={handleSecondInput}
  />
  <input
    id="{uid}-timestamp-ms"
    type="number"
    min="0"
    placeholder="ms"
    class="validator input join-item w-1/5"
    value={millisecond}
    oninput={handleMillisecondInput}
  />
</div>
