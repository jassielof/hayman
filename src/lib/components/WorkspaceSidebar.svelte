<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { tauriBackend } from '#lib/services/tauri-backend.js';
  import type { BibliographyMetadata } from '#lib/types/bibliography-metadata.js';
  import type { BibliographyProject } from '#lib/types/project.js';
  import type { Hayagriva } from '@hayman/hayagriva-schema';
  import { formatFormattableString } from '#lib/formatters/formattable-string.js';
  import { SvelteSet } from 'svelte/reactivity';
  import { ChevronRightIcon } from '@lucide/svelte';

  let {
    bibliographies,
    projects,
    activeBibliography,
    activeEntry,
    revision,
    error,
    onRetry,
  }: {
    bibliographies: BibliographyMetadata[];
    projects: BibliographyProject[];
    activeBibliography?: string;
    activeEntry?: string;
    revision: number;
    error?: string;
    onRetry: () => void;
  } = $props();
  const expanded = new SvelteSet<string>();
  let entries = $state<Record<string, Hayagriva>>({});
  let errors = $state<Record<string, string>>({});
  let limits = $state<Record<string, number>>({});
  let query = $state('');
  let generation = 0;
  const uid = $props.id();
  const matching = $derived(
    bibliographies.filter(
      (item) =>
        `${item.title} ${item.id}`
          .toLowerCase()
          .includes(query.toLowerCase()) || expanded.has(item.id),
    ),
  );

  async function load(id: string, token = generation) {
    try {
      const bibliography = await tauriBackend.get(id);
      if (token === generation) {
        entries[id] = bibliography.data;
        delete errors[id];
      }
    } catch (caught) {
      if (token === generation) errors[id] = String(caught);
    }
  }
  $effect(() => {
    generation = revision;
    entries = {};
    errors = {};
    untrack(() => {
      for (const id of expanded) void load(id);
    });
  });
  $effect(() => {
    const id = activeBibliography;
    if (id)
      untrack(() => {
        expanded.add(id);
        if (!entries[id]) void load(id);
      });
  });
  async function toggle(id: string) {
    if (expanded.has(id)) {
      expanded.delete(id);
      return;
    }
    expanded.add(id);
    if (!entries[id]) await load(id);
  }
  function outline(id: string) {
    const all = Object.entries(entries[id] ?? {}).filter(([key, entry]) =>
      `${key} ${formatFormattableString(entry.title)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    const visible = all.slice(0, limits[id] ?? 100);
    const current =
      id === activeBibliography
        ? all.find(([key]) => key === activeEntry)
        : undefined;
    if (current && !visible.some(([key]) => key === current[0]))
      visible.unshift(current);
    return { all, visible };
  }
</script>

<nav aria-label="Library navigation" class="space-y-5">
  <div class="grid gap-1 text-sm">
    <a class="sidebar-link" href={resolve('/')}>Bibliographies</a>
    <a class="sidebar-link" href={resolve('/library')}>All references</a>
    <a class="sidebar-link" href={resolve('/tools')}>Quick tools</a>
    <a class="sidebar-link" href={resolve('/bibliography/new')}
      >New bibliography</a
    >
    <a class="sidebar-link" href={resolve('/project/new')}>New project</a>
  </div>
  {#if projects.length}
    <div class="space-y-1">
      <p class="px-2 text-xs font-semibold text-muted-foreground">Projects</p>
      {#each projects as project (project.id)}<a
          class="sidebar-link"
          href={resolve('/project/[projectId]', { projectId: project.id })}
          >{project.title || project.id}</a
        >{/each}
    </div>
  {/if}
  <div class="space-y-2">
    <label class="label" for={`${uid}-search`}
      >Filter files and open references</label
    >
    <input
      id={`${uid}-search`}
      class="input"
      placeholder="Filter navigation…"
      bind:value={query}
    />
    <p class="text-xs text-muted-foreground">
      Expand a file to browse its references. All references searches every
      file.
    </p>
  </div>
  {#if error}<div class="space-y-2 text-sm">
      <p role="alert" class="text-destructive">{error}</p>
      <button type="button" class="btn btn-outline btn-sm" onclick={onRetry}
        >Retry library navigation</button
      >
    </div>{/if}
  {#each [{ kind: 'linked', title: 'Linked files' }, { kind: 'managed', title: 'Managed files' }] as group (group.kind)}
    <div class="space-y-1">
      <p class="px-2 text-xs font-semibold text-muted-foreground">
        {group.title}
      </p>
      <ul class="space-y-1">
        {#each matching.filter( (item) => (group.kind === 'linked' ? item.storageKind === 'linked' : item.storageKind !== 'linked') ) as bibliography (bibliography.id)}
          <li class="min-w-0">
            <div class="flex min-w-0 items-center">
              <button
                class="btn btn-ghost btn-square btn-sm shrink-0"
                type="button"
                aria-label={`${expanded.has(bibliography.id) ? 'Hide' : 'Show'} references in ${bibliography.title || bibliography.id}`}
                aria-expanded={expanded.has(bibliography.id)}
                aria-controls={expanded.has(bibliography.id)
                  ? `${uid}-${bibliography.id}-outline`
                  : undefined}
                onclick={() => toggle(bibliography.id)}
                ><ChevronRightIcon
                  class={`size-4 ${expanded.has(bibliography.id) ? 'rotate-90' : ''}`}
                /></button
              >
              <a
                class="sidebar-link min-w-0 flex-1"
                class:bg-accent={activeBibliography === bibliography.id}
                aria-current={activeBibliography === bibliography.id &&
                !activeEntry
                  ? 'page'
                  : undefined}
                href={resolve('/bibliography/[bibliographyId]', {
                  bibliographyId: bibliography.id,
                })}
                title={bibliography.title || bibliography.id}
                ><span class="block truncate"
                  >{bibliography.title || bibliography.id}</span
                ></a
              >
            </div>
            {#if expanded.has(bibliography.id)}
              <div
                id={`${uid}-${bibliography.id}-outline`}
                class="ml-4 min-w-0 border-l border-border pl-2"
              >
                {#if errors[bibliography.id]}<p
                    class="px-2 py-2 text-xs text-destructive"
                    role="alert"
                  >
                    {errors[bibliography.id]}
                  </p>
                  <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    onclick={() => load(bibliography.id)}
                    >Retry references</button
                  >
                {:else if !entries[bibliography.id]}<p
                    class="px-2 py-2 text-xs text-muted-foreground"
                    role="status"
                  >
                    Loading references…
                  </p>
                {:else}
                  {@const items = outline(bibliography.id)}
                  <ul>
                    {#each items.visible as [key, entry] (key)}
                      <li>
                        <a
                          class="sidebar-link"
                          class:bg-accent={activeBibliography ===
                            bibliography.id && activeEntry === key}
                          aria-current={activeBibliography ===
                            bibliography.id && activeEntry === key
                            ? 'page'
                            : undefined}
                          href={resolve(
                            '/bibliography/[bibliographyId]/entry/[entryId]',
                            { bibliographyId: bibliography.id, entryId: key },
                          )}
                          title={formatFormattableString(entry.title) || key}
                          ><bdi
                            class="block truncate"
                            lang={entry.language ?? ''}
                            >{formatFormattableString(entry.title) || key}</bdi
                          ><span
                            class="block truncate font-mono text-xs text-muted-foreground"
                            >{key}</span
                          ></a
                        >
                      </li>
                    {:else}<li class="px-2 py-2 text-xs text-muted-foreground">
                        No matching references.
                      </li>{/each}
                  </ul>
                  {#if items.all.length > items.visible.length}<button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onclick={() =>
                        (limits[bibliography.id] =
                          (limits[bibliography.id] ?? 100) + 100)}
                      >Show more references</button
                    >{/if}
                {/if}
              </div>
            {/if}
          </li>
        {:else}<li class="px-2 text-xs text-muted-foreground">
            No matching files.
          </li>{/each}
      </ul>
    </div>
  {/each}
</nav>
