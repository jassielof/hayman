<script lang="ts">
  import { resolve } from '$app/paths';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatEntryDateShort } from '$lib/formatters/date-formatter';
  import { formatEntryType } from '$lib/formatters/entry-type-formatter';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import type { Hayagriva } from '$lib/types/hayagriva';
  import {
    Calendar,
    Ellipsis,
    Eye,
    Hash,
    Pencil,
    Trash,
    User
  } from '@lucide/svelte';

  let {
    entries = $bindable(),
    bibliographyId = $bindable()
  }: {
    entries: Hayagriva;
    bibliographyId: string;
  } = $props();
</script>

<div class="card mt-4 shadow-md">
  {#if Object.entries(entries).length === 0}
    <div class="card-body">
      <p class="text-center text-gray-500">This bibliography has no entries.</p>
    </div>
  {:else}
    <ul class="list rounded-box bg-base-200 shadow-md">
      {#each Object.entries(entries) as [id, entry] (id)}
        {@const { label, Icon } = formatEntryType(entry.type)}
        <li class="list-row">
          <div class="flex flex-col items-center justify-center">
            <div class="tooltip tooltip-right" data-tip={label}>
              <Icon />
            </div>
          </div>
          <div>
            <span class="font-mono text-sm">
              <Hash class="inline size-[1.2em]" />
              {id}
            </span>
            <br />
            <span class="text-lg font-semibold">
              {formatFormattableString(entry.title)}
            </span>
            {#if entry.author}
              <br />
              <span class="font-serif italic">
                <User class="inline size-[1.2em]" />
                {formatAuthor(entry.author)}
              </span>
            {/if}
            {#if entry.date}
              <br />
              <span class="text-xs">
                <Calendar class="inline size-[1.2em]" />
                {formatEntryDateShort(entry.date)}
              </span>
            {/if}
          </div>
          <div class="flex flex-col items-center justify-center">
            <button
              class="btn m-1"
              popovertarget={`popover-${id}`}
              style={`anchor-name: --anchor-${id};`}
            >
              <Ellipsis class="inline-block" />
            </button>
            <ul
              class="menu dropdown dropdown-left w-max rounded-box bg-base-100 shadow-sm"
              popover
              id={`popover-${id}`}
              style={`position-anchor: --anchor-${id};`}
            >
              <li>
                <a
                  href={resolve(`/bibliography/${bibliographyId}/entry/${id}`)}
                >
                  <Eye class="inline size-[1.2em]" />
                  View
                </a>
              </li>
              <li>
                <a
                  href={resolve(
                    `/bibliography/${bibliographyId}/entry/${id}/edit`
                  )}
                >
                  <Pencil class="inline size-[1.2em]" />
                  Edit</a
                >
              </li>
              <li>
                <button
                  class="btn btn-soft btn-sm btn-error"
                  onclick={async () => {
                    if (
                      confirm(
                        `Are you sure you want to delete the following entry: ${id}?`
                      )
                    ) {
                      await BibliographyService.deleteEntry(bibliographyId, id);
                      delete entries[id];
                    }
                  }}
                >
                  <Trash class="inline size-[1.2em]" />
                  Delete
                </button>
              </li>
            </ul>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
