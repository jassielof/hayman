<script lang="ts">
  import { SettingsService } from '#lib/services/settings.service.js';
  import { onMount } from 'svelte';

  onMount(() => {
    SettingsService.applyToDocument();
  });
</script>
