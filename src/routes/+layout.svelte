<script lang="ts">
  import { resolve } from '$app/paths';
  import { ModeWatcher, toggleMode } from 'mode-watcher';
  import { Moon, Sun } from '@lucide/svelte';
  import './layout.css';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<ModeWatcher />

<header class="navbar">
  <a href={resolve('/')} class="btn text-xl btn-ghost">Hayagriva Manager</a>
  <div class="ml-auto">
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
