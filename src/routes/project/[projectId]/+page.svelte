<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { tauriBackend } from '$lib/services/tauri-backend';
  import type { Bibliography } from '$lib/types/bibliography';
  import type { BibliographyProject } from '$lib/types/project';
  import { formatAuthor } from '$lib/formatters/author';
  import { formatFormattableString } from '$lib/formatters/formattable-string';
  import {
    DownloadIcon,
    FileTextIcon,
    SearchIcon,
    Settings2Icon,
  } from '@lucide/svelte';
  import { hayagrivaService } from '$lib/services/hayagriva.service';
  import type { Hayagriva } from '@hayman/hayagriva-schema';
  import { onMount } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  let project = $state<BibliographyProject | undefined>();
  let bibliographies = $state<Bibliography[]>([]);
  let availableBibliographies = $state<Bibliography[]>([]);
  let errorMessage = $state<string | undefined>();
  let actionMessage = $state<string | undefined>();
  let search = $state('');
  let manageFiles = $state(false);
  let selectedFiles = new SvelteSet<string>();

  onMount(async () => {
    try {
      project = (await tauriBackend.listProjects()).find(
        (item) => item.id === page.params.projectId,
      );
      if (!project) throw new Error('Project was not found.');
      availableBibliographies = await BibliographyService.getAll();
      bibliographies = availableBibliographies.filter((item) =>
        project?.bibliographyIds.includes(item.metadata.id),
      );
      for (const id of project.bibliographyIds) selectedFiles.add(id);
    } catch (error) {
      errorMessage = String(error);
    }
  });

  const entries = $derived(
    bibliographies.flatMap((bibliography) =>
      Object.entries(bibliography.data).map(([entryId, entry]) => ({
        bibliography,
        entryId,
        entry,
      })),
    ),
  );
  const duplicateKeys = $derived.by(() => {
    const counts = new SvelteMap<string, number>();
    for (const item of entries) {
      counts.set(item.entryId, (counts.get(item.entryId) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([entryId]) => entryId),
    );
  });
  const filtered = $derived(
    entries.filter(({ entryId, entry, bibliography }) =>
      [
        entryId,
        formatFormattableString(entry.title),
        entry.author ? formatAuthor(entry.author) : '',
        bibliography.metadata.title,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ),
  );

  function exportMergedYaml() {
    if (!project) return;
    if (duplicateKeys.size > 0) {
      actionMessage = `Resolve repeated citation keys before exporting: ${[...duplicateKeys].join(', ')}`;
      return;
    }
    actionMessage = undefined;
    const merged: Hayagriva = {};
    for (const bibliography of bibliographies) {
      Object.assign(merged, bibliography.data);
    }
    hayagrivaService.export(merged, {
      asFile: true,
      filename: `${project.id}.yaml`,
    });
  }

  function toggleFile(id: string) {
    if (selectedFiles.has(id)) selectedFiles.delete(id);
    else selectedFiles.add(id);
  }

  async function saveFiles() {
    if (!project) return;
    try {
      project = await tauriBackend.saveProject({
        ...project,
        bibliographyIds: [...selectedFiles],
      });
      bibliographies = availableBibliographies.filter((item) =>
        selectedFiles.has(item.metadata.id),
      );
      manageFiles = false;
      actionMessage = undefined;
    } catch (error) {
      actionMessage = String(error);
    }
  }
</script>

<main class="mx-auto w-full max-w-6xl p-6">
  <Breadcrumbs
    items={[
      { label: 'Home', href: '/' },
      { label: project?.title ?? 'Project' },
    ]}
  />
  {#if errorMessage}
    <div class="alert alert-error" role="alert">{errorMessage}</div>
  {:else if !project}
    <div class="grid min-h-80 place-content-center" role="status">
      <span class="loading loading-xl loading-spinner"></span>
    </div>
  {:else}
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold tracking-wider text-primary uppercase">
          Bibliography project
        </p>
        <h1 class="text-3xl font-bold">{project.title}</h1>
        {#if project.description}<p class="mt-1 text-muted-foreground">
            {project.description}
          </p>{/if}
        <p class="mt-2 text-sm text-muted-foreground">
          {bibliographies.length} files · {entries.length} entry occurrences · {duplicateKeys.size}
          repeated keys
        </p>
      </div>
      <button
        type="button"
        class="btn btn-primary"
        onclick={exportMergedYaml}
        disabled={entries.length === 0}
      >
        <DownloadIcon class="size-4" /> Export merged Hayagriva
      </button>
      <button
        type="button"
        class="btn btn-outline"
        onclick={() => (manageFiles = !manageFiles)}
        aria-expanded={manageFiles}
      >
        <Settings2Icon class="size-4" /> Manage files
      </button>
    </header>

    {#if actionMessage}<div class="alert alert-warning mb-4" role="alert">
        {actionMessage}
      </div>{/if}
    {#if manageFiles}
      <section class="card mb-4 p-4">
        <h2 class="font-semibold">Files in this project</h2>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          {#each availableBibliographies as bibliography (bibliography.metadata.id)}
            <label
              class="flex cursor-pointer items-center gap-2 rounded border border-border p-2"
            >
              <input
                type="checkbox"
                class="checkbox"
                checked={selectedFiles.has(bibliography.metadata.id)}
                onchange={() => toggleFile(bibliography.metadata.id)}
              />
              <span class="truncate text-sm">{bibliography.metadata.title}</span
              >
            </label>
          {/each}
        </div>
        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            onclick={saveFiles}>Save files</button
          >
        </div>
      </section>
    {/if}

    <label class="input mb-4 flex items-center gap-2">
      <SearchIcon class="size-4 text-muted-foreground" />
      <input
        class="w-full border-0 bg-transparent"
        placeholder="Search every file in this project…"
        bind:value={search}
      />
    </label>

    <div class="grid gap-3">
      {#each filtered as item (`${item.bibliography.metadata.id}:${item.entryId}`)}
        <a
          class="card block p-4 transition hover:border-primary/40 hover:bg-accent/40"
          href={resolve(
            `/bibliography/${item.bibliography.metadata.id}/entry/${item.entryId}`,
          )}
        >
          <div class="flex items-start gap-3">
            <FileTextIcon class="mt-1 size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-serif text-lg font-semibold">
                  {formatFormattableString(item.entry.title) || item.entryId}
                </h2>
                {#if duplicateKeys.has(item.entryId)}<span
                    class="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning-foreground"
                    >Repeated key</span
                  >{/if}
              </div>
              {#if item.entry.author}<p class="text-sm italic">
                  {formatAuthor(item.entry.author)}
                </p>{/if}
              <p class="mt-1 font-mono text-xs text-muted-foreground">
                {item.entryId} · {item.bibliography.metadata.title}
              </p>
            </div>
          </div>
        </a>
      {:else}
        <p
          class="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground"
        >
          No entries match this search.
        </p>
      {/each}
    </div>
  {/if}
</main>
