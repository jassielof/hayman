<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import SettingsBootstrap from '$lib/components/SettingsBootstrap.svelte';
  import MutationToastHost from '$lib/components/MutationToastHost.svelte';
  import { ModeWatcher, toggleMode } from 'mode-watcher';
  import { Moon, Settings, Sun } from '@lucide/svelte';
  import './layout.css';
  import './hljs-theme.css';

  let { children } = $props();

  const settingsFrom = $derived(encodeURIComponent(page.url.pathname));
</script>

<svelte:head>
  <link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<ModeWatcher />
<SettingsBootstrap />
<MutationToastHost />

<header class="navbar">
  <a href={resolve('/')} class="brand-logo btn btn-ghost text-xl">Hayman</a>
  <div class="ml-auto flex items-center gap-1">
    <a
      href="{resolve('/settings')}?from={settingsFrom}"
      class="btn btn-ghost btn-square"
      aria-label="Settings"
    >
      <Settings class="size-5" />
    </a>
    <button
      type="button"
      class="btn btn-ghost btn-square"
      aria-label="Toggle dark mode"
      onclick={toggleMode}
    >
      <Sun class="size-5 dark:hidden" />
      <Moon class="hidden size-5 dark:inline" />
    </button>
  </div>
</header>

{@render children()}
