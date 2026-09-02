<script lang="ts">
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { screenshotDemoBibliographies } from '$lib/fixtures/screenshot-demo';

  let ready = $state(false);
  let error = $state<string | undefined>();

  $effect(() => {
    (async () => {
      try {
        for (const bibliography of screenshotDemoBibliographies) {
          await BibliographyService.put(bibliography, true);
        }
        ready = true;
      } catch (err) {
        error =
          err instanceof Error
            ? err.message
            : 'Failed to seed screenshot data.';
      }
    })();
  });
</script>

{#if error}
  <p data-screenshot-error="true">{error}</p>
{:else if ready}
  <p data-screenshot-ready="true" hidden>Screenshot demo data ready</p>
{/if}
