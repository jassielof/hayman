<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  const status = $derived(page.status || 500);
  const message = $derived(page.error?.message ?? 'Something went wrong');
  const catImageUrl = $derived(`https://http.cat/${status}.jpg`);
</script>

<main class="flex flex-col" style="min-height: calc(100vh - 4rem);">
  <section class="flex flex-1 items-center justify-center p-4">
    <div class="card max-w-lg">
      <div class="card-body items-center text-center">
        <img
          src={catImageUrl}
          alt="HTTP {status} cat"
          class="mb-4 w-full max-w-md rounded-md"
          width="750"
          height="600"
        />
        <h2 class="card-title justify-center text-destructive">
          {message}
        </h2>
        <p class="text-sm text-muted-foreground">
          Status {status}
        </p>
        <p class="text-xs text-muted-foreground">
          Cat courtesy of
          <a
            class="underline underline-offset-2 hover:text-foreground"
            href="https://http.cat/"
            target="_blank"
            rel="noopener noreferrer"
          >
            http.cat
          </a>
        </p>
        <a class="btn btn-primary mt-4" href={resolve('/')}>Back to home</a>
      </div>
    </div>
  </section>
</main>
