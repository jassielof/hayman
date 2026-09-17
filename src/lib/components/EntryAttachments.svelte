<script lang="ts">
  import { tauriBackend, type Attachment } from '$lib/services/tauri-backend';
  import { open } from '@tauri-apps/plugin-dialog';
  import {
    CheckIcon,
    FileIcon,
    LinkIcon,
    Trash2Icon,
    TriangleAlertIcon,
  } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let {
    bibliographyId,
    entryId,
  }: {
    bibliographyId: string;
    entryId: string;
  } = $props();

  let attachments = $state<Attachment[]>([]);
  let loading = $state(true);
  let errorMessage = $state<string | undefined>();
  let copiedId = $state<number | undefined>();

  async function refresh() {
    loading = true;
    try {
      attachments = await tauriBackend.listAttachments(bibliographyId, entryId);
      errorMessage = undefined;
    } catch (error) {
      errorMessage = String(error);
    } finally {
      loading = false;
    }
  }

  onMount(refresh);

  async function addAttachments() {
    const selected = await open({ multiple: true });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    try {
      for (const path of paths) {
        await tauriBackend.linkAttachment(bibliographyId, entryId, path);
      }
      await refresh();
    } catch (error) {
      errorMessage = String(error);
    }
  }

  async function removeAttachment(attachment: Attachment) {
    try {
      await tauriBackend.unlinkAttachment(attachment.id);
      attachments = attachments.filter((item) => item.id !== attachment.id);
    } catch (error) {
      errorMessage = String(error);
    }
  }

  async function copyPath(attachment: Attachment) {
    await navigator.clipboard.writeText(attachment.path);
    copiedId = attachment.id;
    setTimeout(() => (copiedId = undefined), 1600);
  }

  async function openAttachment(attachment: Attachment) {
    try {
      await tauriBackend.openAttachment(attachment.id);
    } catch (error) {
      errorMessage = String(error);
    }
  }
</script>

<section class="card mt-6" aria-labelledby="attachments-heading">
  <div class="card-body">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="attachments-heading" class="card-title">Attachments</h2>
        <p class="text-sm text-muted-foreground">
          Local files linked to this entry. Hayagriva YAML stays unchanged.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline"
        onclick={addAttachments}
      >
        <LinkIcon class="size-4" /> Attach files
      </button>
    </div>

    {#if errorMessage}
      <div class="alert alert-error" role="alert">{errorMessage}</div>
    {/if}

    {#if loading}
      <p class="text-sm text-muted-foreground" role="status">
        Loading attachments…
      </p>
    {:else if attachments.length === 0}
      <p
        class="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground"
      >
        No attachments. Files are referenced in place and are never moved or
        deleted by Hayman.
      </p>
    {:else}
      <ul class="divide-y divide-border rounded-md border border-border">
        {#each attachments as attachment (attachment.id)}
          <li class="flex items-center gap-3 p-3">
            {#if attachment.available}
              <FileIcon class="size-5 shrink-0 text-primary" />
            {:else}
              <TriangleAlertIcon class="size-5 shrink-0 text-warning" />
            {/if}
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              title={attachment.available
                ? 'Open attachment'
                : 'Attachment is missing'}
              disabled={!attachment.available}
              onclick={() => openAttachment(attachment)}
            >
              <span class="block truncate text-sm font-medium"
                >{attachment.name}</span
              >
              <span
                class="block truncate font-mono text-xs text-muted-foreground"
              >
                {attachment.available
                  ? attachment.path
                  : `Missing · ${attachment.path}`}
              </span>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              onclick={() => copyPath(attachment)}
            >
              Copy path
            </button>
            {#if copiedId === attachment.id}
              <span class="flex items-center gap-1 text-xs text-primary">
                <CheckIcon class="size-3" /> Copied
              </span>
            {/if}
            <button
              type="button"
              class="btn btn-sm btn-ghost btn-square"
              aria-label={`Unlink ${attachment.name}`}
              title="Unlink; the file will not be deleted"
              onclick={() => removeAttachment(attachment)}
            >
              <Trash2Icon class="size-4" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
