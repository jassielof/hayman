<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import SettingsBootstrap from '$lib/components/SettingsBootstrap.svelte';
  import MutationToastHost from '$lib/components/MutationToastHost.svelte';
  import { ModeWatcher, toggleMode } from 'mode-watcher';
  import { MoonIcon, SettingsIcon, SunIcon } from '@lucide/svelte';
  import './layout.css';
  import './hljs-theme.css';

  let { children } = $props();

  const settingsPath = resolve('/settings');
  const settingsActive = $derived(page.url.pathname === settingsPath);
</script>

<ModeWatcher />
<SettingsBootstrap />
<MutationToastHost />

<header class="navbar">
  <a href={resolve('/')} class="brand-logo btn btn-ghost text-xl">Hayman</a>
  <div class="ml-auto flex items-center gap-1">
    {#if settingsActive}
      <span
        class="btn btn-ghost btn-square cursor-default bg-accent"
        aria-label="Settings"
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
      aria-label="Toggle dark mode"
      onclick={toggleMode}
    >
      <SunIcon class="size-5 dark:hidden" />
      <MoonIcon class="hidden size-5 dark:inline" />
    </button>
  </div>
</header>

{@render children()}
