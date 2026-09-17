<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import SettingsBootstrap from '$lib/components/SettingsBootstrap.svelte';
  import MutationToastHost from '$lib/components/MutationToastHost.svelte';
  import { ModeWatcher, setMode, userPrefersMode } from 'mode-watcher';
  import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from '@lucide/svelte';
  import { nextThemeMode, themeModeLabel } from '$lib/utils/theme-mode';
  import './layout.css';
  import './hljs-theme.css';

  let { children } = $props();

  const settingsPath = resolve('/settings');
  const settingsActive = $derived(page.url.pathname === settingsPath);
</script>

<ModeWatcher defaultMode="system" track={true} />
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
      aria-label={`${themeModeLabel(userPrefersMode.current)}. Change theme mode`}
      title={`${themeModeLabel(userPrefersMode.current)} — click to change`}
      onclick={() => setMode(nextThemeMode(userPrefersMode.current))}
    >
      {#if userPrefersMode.current === 'system'}
        <MonitorIcon class="size-5" />
      {:else if userPrefersMode.current === 'light'}
        <SunIcon class="size-5" />
      {:else}
        <MoonIcon class="size-5" />
      {/if}
    </button>
  </div>
</header>

{@render children()}
