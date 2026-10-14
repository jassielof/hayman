<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import SettingsBootstrap from '#lib/components/SettingsBootstrap.svelte';
  import MutationToastHost from '#lib/components/MutationToastHost.svelte';
  import { ModeWatcher, theme, userPrefersMode } from 'mode-watcher';
  import {
    BookOpenIcon,
    MonitorIcon,
    MoonIcon,
    SettingsIcon,
    SunIcon,
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
</script>

<ModeWatcher defaultMode="system" track={true} />
<SettingsBootstrap />
<MutationToastHost />

<a class="skip-link" href="#main-content">Skip to main content</a>

<header class="navbar">
  <a href={resolve('/')} class="brand-logo btn btn-ghost text-xl">Hayman</a>
  <div class="ml-auto flex items-center gap-1">
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

{@render children()}
