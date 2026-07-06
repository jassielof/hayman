<script lang="ts">
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { screenshotDemoBibliography } from '$lib/fixtures/screenshot-demo';

  let ready = $state(false);

  $effect(() => {
    (async () => {
      const existing = await BibliographyService.getOrNull(
        screenshotDemoBibliography.metadata.id
      );
      if (!existing) {
        await BibliographyService.add(screenshotDemoBibliography, true);
      }
      ready = true;
    })();
  });
</script>

{#if ready}
  <p data-screenshot-ready="true" hidden>Screenshot demo data ready</p>
{/if}
