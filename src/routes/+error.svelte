<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
</script>

<main class="flex flex-col" style="min-height: calc(100vh - 4rem);">
  <section class="flex flex-1 items-center justify-center p-4">
    <div class="card max-w-md">
      <div class="card-body">
        <h2 class="card-title text-destructive">
          {page.error?.message ?? 'Something went wrong'}
        </h2>
        <p class="text-sm text-muted-foreground">
          Status {page.status}
        </p>
        <a class="btn btn-primary mt-4" href={resolve('/')}>Back to home</a>
      </div>
    </div>
  </section>
</main>
