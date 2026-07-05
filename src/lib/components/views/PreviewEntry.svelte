<script lang="ts">
  import { dateFormatter } from '$lib/formatters/date-formatter';
  import { getLanguageFlag } from '$lib/formatters/language';
  import type { BibliographyEntry } from '$lib/types/hayagriva';
  import { MAX_PARENT_DEPTH } from '$lib/validators/structure';
  import Self from './PreviewEntry.svelte';

  let {
    entry,
    baseHeadingLevel = 1,
    parentDepth = 0
  }: {
    entry: BibliographyEntry;
    baseHeadingLevel?: number;
    parentDepth?: number;
  } = $props();

  const clamp = (n: number) => Math.min(6, Math.max(1, n));
  const titleLevel = $derived(clamp(baseHeadingLevel));
  const sectionLevel = $derived(clamp(baseHeadingLevel + 2));
  const subSectionLevel = $derived(clamp(baseHeadingLevel + 3));
</script>

<article class="prose max-w-none">
  {#if entry.title}
    <svelte:element this={`h${titleLevel}`}>
      {#if typeof entry.title === 'object'}
        {entry.title.value}
      {:else}
        {entry.title}
      {/if}
    </svelte:element>
    {#if typeof entry.title === 'object' && entry.title.short}
      <p class="leading-0">
        <em>Short title: {entry.title.short}</em>
      </p>
    {/if}
  {/if}

  <ul>
    {#if entry.type}
      <li>
        <strong> Entry type: </strong>
        {entry.type}
      </li>
    {/if}
    {#if entry.date}
      <li><strong>Date:</strong> {dateFormatter(entry.date)}</li>
    {/if}
    {#if entry.language}
      <li>
        <strong>Language:</strong>
        {entry.language}
        {#if getLanguageFlag(entry.language)}
          {getLanguageFlag(entry.language)}
        {/if}
      </li>
    {/if}
  </ul>

  {#if entry.author}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Authors</svelte:element>
      {#if Array.isArray(entry.author)}
        <ul>
          {#each entry.author as person, i (`${typeof person === 'string' ? person : person.name}-${i}`)}
            <li>
              {#if typeof person === 'string'}
                {person}
              {:else if person && typeof person === 'object'}
                {person.prefix || ''}
                {person['given-name'] || ''}
                {person.name}
                {person.suffix || ''}
                {#if person.alias}<em>({person.alias})</em>{/if}
              {/if}
            </li>
          {/each}
        </ul>
      {:else if typeof entry.author === 'string'}
        <p>{entry.author}</p>
      {:else if entry.author && typeof entry.author === 'object'}
        <p>
          {entry.author.prefix || ''}
          {entry.author['given-name'] || ''}
          {entry.author.name}
          {entry.author.suffix || ''}
          {#if entry.author.alias}<em>({entry.author.alias})</em>{/if}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.editor}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Editors</svelte:element>
      {#if Array.isArray(entry.editor)}
        <ul>
          {#each entry.editor as person, i (`${typeof person === 'string' ? person : person.name}-${i}`)}
            <li>
              {#if typeof person === 'string'}
                {person}
              {:else if person && typeof person === 'object'}
                {person.prefix || ''}
                {person['given-name'] || ''}
                {person.name}
                {person.suffix || ''}
                {#if person.alias}<em>({person.alias})</em>{/if}
              {/if}
            </li>
          {/each}
        </ul>
      {:else if typeof entry.editor === 'string'}
        <p>{entry.editor}</p>
      {:else if entry.editor && typeof entry.editor === 'object'}
        <p>
          {entry.editor.prefix || ''}
          {entry.editor['given-name'] || ''}
          {entry.editor.name}
          {entry.editor.suffix || ''}
          {#if entry.editor.alias}<em>({entry.editor.alias})</em>{/if}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.abstract}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Abstract</svelte:element>
      {#if typeof entry.abstract === 'object'}
        <p>{entry.abstract.value}</p>
      {:else}
        <p>{entry.abstract}</p>
      {/if}
    </section>
  {/if}

  {#if entry.genre || entry.edition || entry.note}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Details</svelte:element>
      {#if entry.genre}
        <p>
          <strong>Genre:</strong>
          {#if typeof entry.genre === 'object'}
            {entry.genre.value}
          {:else}
            {entry.genre}
          {/if}
        </p>
      {/if}
      {#if entry.edition}
        <p><strong>Edition:</strong> {entry.edition}</p>
      {/if}
      {#if entry.note}
        <p>
          <strong>Note:</strong>
          {#if typeof entry.note === 'object'}
            {entry.note.value}
          {:else}
            {entry.note}
          {/if}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.publisher || entry.organization || entry.location}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Publication</svelte:element>
      {#if entry.publisher}
        <p>
          <strong>Publisher:</strong>
          {#if typeof entry.publisher === 'object'}
            {entry.publisher.name}
            {#if entry.publisher.location}
              ({entry.publisher.location})
            {/if}
          {:else}
            {entry.publisher}
          {/if}
        </p>
      {/if}
      {#if entry.organization}
        <p>
          <strong>Organization:</strong>
          {#if typeof entry.organization === 'object'}
            {entry.organization.value}
          {:else}
            {entry.organization}
          {/if}
        </p>
      {/if}
      {#if entry.location}
        <p>
          <strong>Location:</strong>
          {#if typeof entry.location === 'object'}
            {entry.location.value}
          {:else}
            {entry.location}
          {/if}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.volume || entry.issue || entry['page-range'] || entry.runtime}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Sizing</svelte:element>
      {#if entry.volume}
        <p><strong>Volume:</strong> {entry.volume}</p>
      {/if}
      {#if entry['volume-total']}
        <p><strong>Total Volumes:</strong> {entry['volume-total']}</p>
      {/if}
      {#if entry.issue}
        <p><strong>Issue:</strong> {entry.issue}</p>
      {/if}
      {#if entry['page-range']}
        <p><strong>Page Range:</strong> {entry['page-range']}</p>
      {/if}
      {#if entry['page-total']}
        <p><strong>Total Pages:</strong> {entry['page-total']}</p>
      {/if}
      {#if entry.runtime}
        <p><strong>Runtime:</strong> {entry.runtime}</p>
      {/if}
      {#if entry['time-range']}
        <p><strong>Time Range:</strong> {entry['time-range']}</p>
      {/if}
    </section>
  {/if}

  {#if entry.url}
    <section>
      <svelte:element this={`h${sectionLevel}`}>URL</svelte:element>
      {#if typeof entry.url === 'object'}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href={entry.url.value} target="_blank" rel="noopener noreferrer">
          {entry.url.value}
        </a>
        {#if entry.url.date}
          <p><em>(Accessed on: {entry.url.date})</em></p>
        {/if}
      {:else}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href={entry.url} target="_blank" rel="noopener noreferrer">
          {entry.url}
        </a>
      {/if}
    </section>
  {/if}

  {#if entry['serial-number']}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Serial Numbers</svelte:element>
      {#if typeof entry['serial-number'] === 'object' && !Array.isArray(entry['serial-number'])}
        <ul>
          {#each Object.entries(entry['serial-number'] as Record<string, string>) as [key, value] (key)}
            <li><strong>{key.toUpperCase()}:</strong> {value}</li>
          {/each}
        </ul>
      {:else}
        <p>
          {typeof entry['serial-number'] === 'number'
            ? entry['serial-number'].toString()
            : entry['serial-number']}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.archive || entry['archive-location'] || entry['call-number']}
    <section>
      <svelte:element this={`h${sectionLevel}`}>Archive</svelte:element>
      {#if entry.archive}
        <p>
          <strong>Name:</strong>
          {#if typeof entry.archive === 'object'}
            {entry.archive.value}
          {:else}
            {entry.archive}
          {/if}
        </p>
      {/if}
      {#if entry['archive-location']}
        <p>
          <strong>Location:</strong>
          {#if typeof entry['archive-location'] === 'object'}
            {entry['archive-location'].value}
          {:else}
            {entry['archive-location']}
          {/if}
        </p>
      {/if}
      {#if entry['call-number']}
        <p>
          <strong>Call Number:</strong>
          {#if typeof entry['call-number'] === 'object'}
            {entry['call-number'].value}
          {:else}
            {entry['call-number']}
          {/if}
        </p>
      {/if}
    </section>
  {/if}

  {#if entry.affiliated}
    <section>
      <svelte:element this={`h${sectionLevel}`}
        >Affiliated People</svelte:element
      >
      {#each entry.affiliated as affiliation, i (`${affiliation.role}-${i}`)}
        <svelte:element this={`h${subSectionLevel}`}>
          {affiliation.role.charAt(0).toUpperCase() + affiliation.role.slice(1)}
        </svelte:element>

        {#if Array.isArray(affiliation.names)}
          <ul>
            {#each affiliation.names as person, j (`${typeof person === 'string' ? person : person.name}-${j}`)}
              <li>
                {#if typeof person === 'string'}
                  {person}
                {:else if person && typeof person === 'object'}
                  {person.prefix || ''}
                  {person['given-name'] || ''}
                  {person.name}
                  {person.suffix || ''}
                  {#if person.alias}<em>({person.alias})</em>{/if}
                {/if}
              </li>
            {/each}
          </ul>
        {:else if typeof affiliation.names === 'string'}
          <p>{affiliation.names}</p>
        {:else if affiliation.names && typeof affiliation.names === 'object'}
          <p>
            {affiliation.names.prefix || ''}
            {affiliation.names['given-name'] || ''}
            {affiliation.names.name}
            {affiliation.names.suffix || ''}
            {#if affiliation.names.alias}<em>({affiliation.names.alias})</em
              >{/if}
          </p>
        {/if}
      {/each}
    </section>
  {/if}

  {#if entry.parent}
    <section>
      <svelte:element this={`h${sectionLevel}`}>
        {Array.isArray(entry.parent) ? 'Parent Entries' : 'Parent Entry'}
      </svelte:element>

      {#if parentDepth >= MAX_PARENT_DEPTH}
        <p>
          <em
            >Parent nesting too deep to display ({MAX_PARENT_DEPTH} levels max).</em
          >
        </p>
      {:else if Array.isArray(entry.parent)}
        {#each entry.parent as p, i (i)}
          <Self
            entry={p}
            baseHeadingLevel={baseHeadingLevel + 1}
            parentDepth={parentDepth + 1}
          />
        {/each}
      {:else}
        <Self
          entry={entry.parent}
          baseHeadingLevel={baseHeadingLevel + 1}
          parentDepth={parentDepth + 1}
        />
      {/if}
    </section>
  {/if}
</article>
