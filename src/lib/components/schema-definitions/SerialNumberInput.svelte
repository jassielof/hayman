<script lang="ts">
  import type { BibliographyEntry } from '$lib/types/hayagriva';
  import { Plus, X } from '@lucide/svelte';

  type SerialNumberObject = Exclude<
    NonNullable<BibliographyEntry['serial-number']>,
    string | number
  >;

  let {
    value = $bindable()
  }: {
    value: BibliographyEntry['serial-number'];
  } = $props();

  const uid = $props.id();

  const KNOWN_KEYS = [
    'serial',
    'doi',
    'isbn',
    'issn',
    'pmid',
    'pmcid',
    'arxiv'
  ] as const;

  const isKnownKey = (key: string): key is (typeof KNOWN_KEYS)[number] =>
    KNOWN_KEYS.includes(key as (typeof KNOWN_KEYS)[number]);

  let serial = $state('');
  let doi = $state('');
  let isbn = $state('');
  let issn = $state('');
  let pmid = $state('');
  let pmcid = $state('');
  let arxiv = $state('');
  let customSerials: { key: string; value: string }[] = $state([]);

  function toNonEmptyString(v: unknown): string {
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  }

  // Populate form fields from parent value (incoming data)
  $effect(() => {
    if (typeof value === 'string' || typeof value === 'number') {
      serial = String(value ?? '');
      doi = '';
      isbn = '';
      issn = '';
      pmid = '';
      pmcid = '';
      arxiv = '';
      customSerials = [];
    } else if (value && typeof value === 'object') {
      const serialObject = value as SerialNumberObject;
      // Use nullish coalescing to avoid "undefined" text in inputs
      serial = toNonEmptyString(serialObject.serial ?? '');
      doi = toNonEmptyString(serialObject.doi ?? '');
      isbn = toNonEmptyString(serialObject.isbn ?? '');
      issn = toNonEmptyString(serialObject.issn ?? '');
      pmid = toNonEmptyString(serialObject.pmid ?? '');
      pmcid = toNonEmptyString(serialObject.pmcid ?? '');
      arxiv = toNonEmptyString(serialObject.arxiv ?? '');

      const nextCustom: { key: string; value: string }[] = [];
      for (const [key, val] of Object.entries(serialObject)) {
        if (!isKnownKey(key) && val !== undefined) {
          nextCustom.push({ key, value: toNonEmptyString(val) });
        }
      }
      customSerials = nextCustom;
    } else {
      serial = '';
      doi = '';
      isbn = '';
      issn = '';
      pmid = '';
      pmcid = '';
      arxiv = '';
      customSerials = [];
    }
  });

  function buildOutgoing():
    | string
    | number
    | {
        [k: string]: string;
      }
    | undefined {
    const hasStandard =
      !!doi || !!isbn || !!issn || !!pmid || !!pmcid || !!arxiv;
    const validCustoms = customSerials.filter(
      ({ key, value }) => key.trim() && value.trim()
    );

    if (!serial && !hasStandard && validCustoms.length === 0) {
      return undefined;
    }

    if (serial && !hasStandard && validCustoms.length === 0) {
      // keep as string to mirror UrlInput behavior
      return serial;
    }

    const obj: Record<string, string> = {};
    if (serial) obj.serial = serial;
    if (doi) obj.doi = doi;
    if (isbn) obj.isbn = isbn;
    if (issn) obj.issn = issn;
    if (pmid) obj.pmid = pmid;
    if (pmcid) obj.pmcid = pmcid;
    if (arxiv) obj.arxiv = arxiv;

    for (const { key, value } of validCustoms) {
      obj[key] = value;
    }

    return obj;
  }

  function deepEqualSerial(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    const aIsObj = a && typeof a === 'object';
    const bIsObj = b && typeof b === 'object';
    if (aIsObj !== bIsObj) return false;
    if (!aIsObj) return false; // primitives already handled above

    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord).sort();
    const bKeys = Object.keys(bRecord).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) return false;
      if (aRecord[aKeys[i]] !== bRecord[bKeys[i]]) return false;
    }
    return true;
  }

  // Reformat content for outgoing data (for the parent)
  $effect(() => {
    const next = buildOutgoing();
    if (!deepEqualSerial(value, next)) {
      value = next;
    }
  });
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend">Serial Number</legend>

  <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
    <div>
      <label for="{uid}-serial-number-serial" class="label pb-1">Serial</label>
      <input
        id="{uid}-serial-number-serial"
        type="text"
        placeholder="SN12345"
        class="input input-sm w-full"
        bind:value={serial}
      />
    </div>
    <div>
      <label for="{uid}-serial-number-doi" class="label pb-1">DOI</label>
      <input
        id="{uid}-serial-number-doi"
        type="text"
        placeholder="10.1103/PhysRevB.102.165126"
        class="input input-sm w-full"
        bind:value={doi}
      />
    </div>
    <div>
      <label for="{uid}-serial-number-isbn" class="label pb-1">ISBN</label>
      <input
        id="{uid}-serial-number-isbn"
        type="text"
        placeholder="978-3-16-148410-0"
        class="input input-sm w-full"
        bind:value={isbn}
      />
    </div>
    <div>
      <label for="{uid}-serial-number-issn" class="label pb-1">ISSN</label>
      <input
        id="{uid}-serial-number-issn"
        type="text"
        placeholder="2049-3630"
        class="input input-sm w-full"
        bind:value={issn}
      />
    </div>
    <div>
      <label for="{uid}-serial-number-pmid" class="label pb-1">PMID</label>
      <input
        id="{uid}-serial-number-pmid"
        type="text"
        placeholder="17284678"
        class="input input-sm w-full"
        bind:value={pmid}
      />
    </div>
    <div>
      <label for="{uid}-serial-number-pmcid" class="label pb-1">PMCID</label>
      <input
        id="{uid}-serial-number-pmcid"
        type="text"
        placeholder="PMC1790863"
        class="input input-sm w-full"
        bind:value={pmcid}
      />
    </div>
    <div class="md:col-span-2">
      <label for="{uid}-serial-number-arxiv" class="label pb-1">ArXiv</label>
      <input
        id="{uid}-serial-number-arxiv"
        type="text"
        placeholder="2003.13722"
        class="input input-sm w-full"
        bind:value={arxiv}
      />
    </div>
  </div>

  <div class="divider">Custom serials</div>

  <!-- TODO: For each known serial, add a verify button, to either ping or redirect to validate they are valid serials, to known pages. -->
  {#each customSerials as serialItem, i (i)}
    <div class="flex items-end gap-2">
      <div class="flex-1">
        <label for="{uid}-custom-serial-key-{i}" class="label pb-1">Key</label>
        <input
          id="{uid}-custom-serial-key-{i}"
          type="text"
          placeholder="zbl"
          class="input input-sm w-full"
          bind:value={serialItem.key}
        />
      </div>
      <div class="flex-1">
        <label for="{uid}-custom-serial-value-{i}" class="label pb-1"
          >Value</label
        >
        <input
          id="{uid}-custom-serial-value-{i}"
          type="text"
          placeholder="0634.60011"
          class="input input-sm w-full"
          bind:value={serialItem.value}
        />
      </div>
      <button
        type="button"
        class="btn btn-square btn-sm btn-error"
        onclick={() => {
          customSerials.splice(i, 1);
        }}
      >
        <X class="size-4" />
      </button>
    </div>
  {/each}

  <button
    type="button"
    class="btn w-full btn-outline btn-sm"
    onclick={() => {
      customSerials.push({ key: '', value: '' });
    }}
  >
    <Plus class="size-4" /> Add custom serial
  </button>
</fieldset>
