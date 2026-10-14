<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Dialog } from 'bits-ui';
  import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
  import WorkspaceSidebar from '#lib/components/WorkspaceSidebar.svelte';
  import { tauriBackend } from '#lib/services/tauri-backend.js';
  import { pageContext } from '#lib/utils/page-context.js';
  import type { BibliographyMetadata } from '#lib/types/bibliography-metadata.js';
  import type { BibliographyProject } from '#lib/types/project.js';
  import SettingsBootstrap from '#lib/components/SettingsBootstrap.svelte';
  import MutationToastHost from '#lib/components/MutationToastHost.svelte';
  import { ModeWatcher, theme, userPrefersMode } from 'mode-watcher';
  import {
    BookOpenIcon,
    MonitorIcon,
    MoonIcon,
    SettingsIcon,
    SunIcon,
    PanelLeftIcon,
    XIcon,
  } from '@lucide/svelte';
  import {
    applyThemeMode,
    getThemeMode,
    nextThemeMode,
    themeModeLabel,
  } from '#lib/utils/theme-mode.js';
  import './layout.css';
  import './hljs-theme.css';

  let { children } = $props();

  const settingsPath = resolve('settings');
  const settingsActive = $derived(page.url.pathname === settingsPath);
  const themeMode = $derived(
    getThemeMode(userPrefersMode.current, theme.current),
  );
  let bibliographies = $state<BibliographyMetadata[]>([]);
  let projects = $state<BibliographyProject[]>([]);
  let sidebarError = $state<string>();
  let revision = $state(0);
  let wide = $state(false);
  let sidebarOpen = $state(true);
  let mobileOpen = $state(false);
  let refreshGeneration = 0;
  const context = $derived(
    pageContext(
      page.url.pathname,
      page.params,
      page.data,
      bibliographies,
      projects,
      page.status,
    ),
  );
  async function refreshNavigation() {
    const token = ++refreshGeneration;
    try {
      const [files, groups] = await Promise.all([
        tauriBackend.listMetadata(),
        tauriBackend.listProjects(),
      ]);
      if (token !== refreshGeneration) return;
      bibliographies = files;
      projects = groups;
      sidebarError = undefined;
      revision += 1;
    } catch (caught) {
      if (token === refreshGeneration) sidebarError = String(caught);
    }
  }
  onMount(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      wide = media.matches;
      if (wide) mobileOpen = false;
    };
    update();
    media.addEventListener('change', update);
    try {
      sidebarOpen = localStorage.getItem('hayman-sidebar-open') !== 'false';
    } catch {
      /* Optional UI preference only. */
    }
    void refreshNavigation();
    const unsubscribe = tauriBackend.subscribe(() => {
      void refreshNavigation();
    });
    return () => {
      unsubscribe();
      media.removeEventListener('change', update);
      refreshGeneration += 1;
    };
  });
  afterNavigate(() => {
    mobileOpen = false;
  });
  function toggleSidebar(event: MouseEvent) {
    (event.currentTarget as HTMLButtonElement).focus({ preventScroll: true });
    if (!wide) {
      mobileOpen = !mobileOpen;
      return;
    }
    sidebarOpen = !sidebarOpen;
    try {
      localStorage.setItem('hayman-sidebar-open', String(sidebarOpen));
    } catch {
      /* Storage can be unavailable. */
    }
  }
  function navigateDrawer(event: KeyboardEvent) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey)
      return;
    // Some WebKit hosts skip links in native Tab order. Include navigation links
    // explicitly; Bits UI still owns modal isolation, Escape and focus restoration.
    const content = event.currentTarget as HTMLElement;
    const controls = [
      ...content.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled)',
      ),
    ].filter(
      (control) => control.tabIndex >= 0 && control.getClientRects().length > 0,
    );
    if (!controls.length) return;
    event.preventDefault();
    event.stopPropagation();
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next =
      index < 0
        ? event.shiftKey
          ? controls.length - 1
          : 0
        : (index + (event.shiftKey ? -1 : 1) + controls.length) %
          controls.length;
    controls[next].focus();
  }
</script>

<svelte:head><title>{context.title} · Hayman</title></svelte:head>

<ModeWatcher defaultMode="system" track={true} />
<SettingsBootstrap />
<MutationToastHost />

<a class="skip-link" href="#main-content">Skip to main content</a>

<header class="navbar sticky top-0 z-40 gap-2 px-2 sm:px-4">
  <button
    type="button"
    class="btn btn-ghost btn-square"
    aria-label={`${(wide ? sidebarOpen : mobileOpen) ? 'Close' : 'Open'} library sidebar`}
    aria-expanded={wide ? sidebarOpen : mobileOpen}
    aria-controls={(wide ? sidebarOpen : mobileOpen)
      ? 'workspace-sidebar'
      : undefined}
    onclick={toggleSidebar}><PanelLeftIcon class="size-5" /></button
  >
  <a href={resolve('/')} class="brand-logo btn btn-ghost px-2 text-xl sm:px-4"
    >Hayman</a
  >
  <Breadcrumbs items={context.items} />
  <div class="ml-auto flex shrink-0 items-center gap-1">
    {#if settingsActive}
      <span
        class="btn btn-ghost btn-square cursor-default bg-accent"
        role="img"
        aria-label="Settings (current page)"
        aria-current="page"
      >
        <SettingsIcon class="size-5" />
      </span>
    {:else}
      <a
        href={settingsPath}
        class="btn btn-ghost btn-square"
        aria-label="Settings"
      >
        <SettingsIcon class="size-5" />
      </a>
    {/if}
    <button
      type="button"
      class="btn btn-ghost btn-square"
      aria-label={`${themeModeLabel(themeMode)}. Change theme mode`}
      title={`${themeModeLabel(themeMode)} — click to change`}
      onclick={() => applyThemeMode(nextThemeMode(themeMode))}
    >
      {#if themeMode === 'system'}
        <MonitorIcon class="size-5" />
      {:else if themeMode === 'light'}
        <SunIcon class="size-5" />
      {:else if themeMode === 'sepia'}
        <BookOpenIcon class="size-5" />
      {:else}
        <MoonIcon class="size-5" />
      {/if}
    </button>
  </div>
</header>

{#snippet navigation()}
  <WorkspaceSidebar
    {bibliographies}
    {projects}
    activeBibliography={page.params.bibliographyId}
    activeEntry={page.params.entryId}
    {revision}
    error={sidebarError}
    onRetry={() => {
      void refreshNavigation();
    }}
  />
{/snippet}

<div class="flex min-h-[calc(100dvh-3.5rem)]">
  {#if wide && sidebarOpen}
    <aside
      id="workspace-sidebar"
      aria-label="Workspace"
      class="sticky top-14 h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card p-3"
    >
      {@render navigation()}
    </aside>
  {/if}
  <div class="min-w-0 flex-1">
    <!-- Route components that retain local form state must be recreated when
         switching bibliography/entry IDs, but not for a shallow query change. -->
    {#key page.url.pathname}{@render children()}{/key}
  </div>
</div>

<Dialog.Root bind:open={mobileOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/45" />
    <Dialog.Content
      id="workspace-sidebar"
      onkeydowncapture={navigateDrawer}
      class="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto border-r border-border bg-card p-4 shadow-xl"
    >
      <div class="mb-4 flex items-center justify-between gap-2">
        <Dialog.Title class="font-semibold">Library navigation</Dialog.Title
        ><Dialog.Close
          class="btn btn-ghost btn-square"
          aria-label="Close library sidebar"
          ><XIcon class="size-5" /></Dialog.Close
        >
      </div>
      <Dialog.Description class="sr-only"
        >Switch bibliography files, projects and references.</Dialog.Description
      >
      {@render navigation()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
