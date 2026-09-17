<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { BibliographyService } from '$lib/services/bibliography.service';
  import { tauriBackend } from '$lib/services/tauri-backend';
  import type { Bibliography } from '$lib/types/bibliography';
  import type { BibliographyProject } from '$lib/types/project';
  import { FolderPlusIcon, SaveIcon } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let bibliographies = $state<Bibliography[]>([]);
  let selected = new SvelteSet<string>();
  let title = $state('');
  let id = $state('');
  let description = $state('');
  let manuallyEditedId = $state(false);
  let errorMessage = $state<string | undefined>();
  let saving = $state(false);

  onMount(async () => {
    bibliographies = await BibliographyService.getAll();
  });

  function slug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function updateTitle(value: string) {
    title = value;
    if (!manuallyEditedId) id = slug(value);
  }

  function toggle(bibliographyId: string) {
    if (selected.has(bibliographyId)) selected.delete(bibliographyId);
    else selected.add(bibliographyId);
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    errorMessage = undefined;
    const now = new Date().toISOString();
    const project: BibliographyProject = {
      id: id.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      bibliographyIds: [...selected],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await tauriBackend.saveProject(project);
      await goto(resolve(`/project/${project.id}`));
    } catch (error) {
      errorMessage = String(error);
    } finally {
      saving = false;
    }
  }
</script>

<main class="mx-auto w-full max-w-3xl p-6">
  <Breadcrumbs
    items={[{ label: 'Home', href: '/' }, { label: 'New project' }]}
  />
  <form class="card" onsubmit={submit}>
    <div class="card-body space-y-5">
      <div>
        <div class="flex items-center gap-2">
          <FolderPlusIcon class="size-6 text-primary" />
          <h1 class="text-2xl font-bold">New bibliography project</h1>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          Group several Hayagriva files without copying or modifying their
          entries.
        </p>
      </div>

      {#if errorMessage}<div class="alert alert-error" role="alert">
          {errorMessage}
        </div>{/if}

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="label"
          >Title
          <input
            class="input mt-1"
            required
            value={title}
            oninput={(event) => updateTitle(event.currentTarget.value)}
          />
        </label>
        <label class="label"
          >Project ID
          <input
            class="input mt-1 font-mono"
            required
            bind:value={id}
            oninput={() => (manuallyEditedId = true)}
          />
        </label>
      </div>
      <label class="label"
        >Description
        <textarea class="textarea mt-1" bind:value={description}></textarea>
      </label>

      <fieldset>
        <legend class="font-semibold">Hayagriva files</legend>
        <p class="mb-3 text-sm text-muted-foreground">
          A file can belong to any number of projects. Its YAML remains the
          source of truth.
        </p>
        {#if bibliographies.length === 0}
          <p class="rounded-md border border-dashed border-border p-4 text-sm">
            Link or create a bibliography before creating a project.
          </p>
        {:else}
          <div class="grid gap-2 sm:grid-cols-2">
            {#each bibliographies as bibliography (bibliography.metadata.id)}
              <label
                class="flex cursor-pointer gap-3 rounded-md border border-border p-3 hover:bg-accent"
              >
                <input
                  class="checkbox mt-1"
                  type="checkbox"
                  checked={selected.has(bibliography.metadata.id)}
                  onchange={() => toggle(bibliography.metadata.id)}
                />
                <span class="min-w-0">
                  <span class="block truncate font-medium"
                    >{bibliography.metadata.title}</span
                  >
                  <span
                    class="block truncate font-mono text-xs text-muted-foreground"
                    >{bibliography.metadata.filePath}</span
                  >
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </fieldset>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <a class="btn btn-outline" href={resolve('/')}>Cancel</a>
        <button
          class="btn btn-primary"
          disabled={saving || selected.size === 0}
        >
          {#if saving}<span class="loading loading-spinner"
            ></span>{:else}<SaveIcon class="size-4" />{/if}
          Create project
        </button>
      </div>
    </div>
  </form>
</main>
