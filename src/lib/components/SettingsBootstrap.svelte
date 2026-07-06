<script lang="ts">
  import { SettingsService } from '$lib/services/settings.service';
  import { onMount } from 'svelte';

  onMount(() => {
    SettingsService.applyToDocument();
  });
</script>
