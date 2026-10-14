<script lang="ts">
  import type { ValidationIssue } from '#lib/services/bibliography.service.js';
  import { CircleAlertIcon } from '@lucide/svelte';

  let {
    issues,
    navigable = false,
  }: { issues: ValidationIssue[]; navigable?: boolean } = $props();
</script>

{#if issues.length > 0}
  <div
    id="validation-errors"
    role="alert"
    tabindex="-1"
    class="alert alert-error focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <CircleAlertIcon class="size-5 shrink-0" />
    <div>
      <p class="font-medium">Please fix the following validation errors:</p>
      <ul class="mt-2 list-inside list-disc text-sm">
        {#each issues as issue (issue.path + issue.message)}
          <li>
            {#if issue.path !== '(root)'}
              {#if navigable}
                <button
                  type="button"
                  class="font-mono underline underline-offset-4"
                  onclick={() =>
                    window.dispatchEvent(
                      new CustomEvent('hayman-focus-field', {
                        detail: issue.path,
                      }),
                    )}>{issue.path}</button
                >
              {:else}<span class="font-mono">{issue.path}</span>{/if}:
            {/if}
            {issue.message}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
