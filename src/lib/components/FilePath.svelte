<script lang="ts">
  import { onMount } from 'svelte';
  import { tauriBackend } from '#lib/services/tauri-backend.js';
  import {
    displayPath,
    normalizeDisplayPath,
  } from '#lib/utils/display-path.js';

  let { value }: { value?: string } = $props();
  let home = $state<string>();
  onMount(() => {
    let mounted = true;
    void tauriBackend
      .homeDirectory()
      .then((value) => {
        if (mounted) home = value;
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  });
</script>

<bdi class="font-mono" title={value ? normalizeDisplayPath(value) : undefined}
  >{value ? displayPath(value, home) : ''}</bdi
>
