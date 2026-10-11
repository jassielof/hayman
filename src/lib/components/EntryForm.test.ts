import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { Author, BibliographyEntry } from '@hayman/hayagriva-schema';
import EntryFormHarness from './__tests__/EntryFormHarness.svelte';

let destroy: (() => Promise<void>) | undefined;

afterEach(async () => {
  await destroy?.();
  destroy = undefined;
  document.body.replaceChildren();
});

function render(entry: BibliographyEntry) {
  const component = mount(EntryFormHarness, {
    target: document.body,
    props: { initial: entry },
  });
  destroy = () => unmount(component);
  flushSync();
}

function inputs(label: string, root: ParentNode = document.body) {
  return [...root.querySelectorAll('label')]
    .filter((element) => element.textContent?.trim() === label)
    .map(
      (element) => document.getElementById(element.htmlFor) as HTMLInputElement,
    );
}

function type(
  input: HTMLInputElement,
  text: string,
  offset = input.value.length,
) {
  input.focus();
  input.setSelectionRange(offset, offset);
  expect(document.activeElement).toBe(input);
  for (const character of text) {
    const caret = input.selectionStart!;
    input.setRangeText(
      character,
      input.selectionStart!,
      input.selectionEnd!,
      'end',
    );
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: character }),
    );
    flushSync();
    expect(input.isConnected).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(caret + character.length);
  }
}

function entry(): BibliographyEntry {
  return JSON.parse(
    document.querySelector('[data-testid="entry"]')!.textContent!,
  );
}

function click(text: string, root: ParentNode = document.body) {
  const button = [...root.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === text,
  );
  expect(button, `button ${text}`).toBeDefined();
  button!.click();
  flushSync();
}

const personFields = ['author', 'editor', 'affiliated'] as const;

function withPeople(
  field: (typeof personFields)[number],
  people: Author,
): BibliographyEntry {
  return {
    type: 'Book',
    [field]:
      field === 'affiliated' ? [{ role: 'translator', names: people }] : people,
  };
}

function people(field: (typeof personFields)[number]) {
  const data = entry();
  return field === 'affiliated' ? data.affiliated?.[0].names : data[field];
}

describe('entry form focus and bound data', () => {
  it.each(['author', 'editor', 'affiliated'] as const)(
    'keeps focus while typing a full name in a multi-person %s field',
    (field) => {
      render({
        type: 'Book',
        [field]:
          field === 'affiliated'
            ? [{ role: 'translator', names: ['', 'Second person'] }]
            : ['', 'Second person'],
      });
      const input = inputs('Full Name')[0];
      type(input, 'Gruber, Hans');
      expect(input.value).toBe('Gruber, Hans');
      const expected = ['Gruber, Hans', 'Second person'];
      expect(entry()[field]).toEqual(
        field === 'affiliated'
          ? [{ role: 'translator', names: expected }]
          : expected,
      );
    },
  );

  it.each(['Author', 'Editor', 'Names'])(
    'supports the reported add-two-people workflow for %s',
    (label) => {
      render({ type: 'Book' });
      if (label === 'Names') {
        click('Affiliated');
        click('Add Affiliated Person');
      } else {
        click(`Add ${label}`);
      }
      click('Add Person');
      type(inputs('Full Name')[0], 'Gruber, Hans');
      type(inputs('Full Name')[1], 'Doe, Jane');
      expect(
        people(
          label === 'Author'
            ? 'author'
            : label === 'Editor'
              ? 'editor'
              : 'affiliated',
        ),
      ).toEqual(['Gruber, Hans', 'Doe, Jane']);
    },
  );

  describe.each(personFields)('%s', (field) => {
    it('preserves the caret when inserting into the middle of an existing name', () => {
      render(withPeople(field, ['Gruber, Hans', 'Other']));
      type(inputs('Full Name')[0], 'Dr. ', 0);
      expect(people(field)).toEqual(['Dr. Gruber, Hans', 'Other']);
    });

    it('allows a newly added person to switch to detailed editing without losing focus', () => {
      render(withPeople(field, ['', 'Other']));
      const first = inputs('Full Name')[0].closest('fieldset')!;
      first.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      flushSync();
      type(inputs('Family Name')[0], 'Gruber');
      type(inputs('Given Name')[0], 'Hans');
      expect(people(field)).toEqual([
        { name: 'Gruber', 'given-name': 'Hans' },
        'Other',
      ]);
    });

    it('keeps both duplicate and empty name rows independently editable', () => {
      render(withPeople(field, ['', '', 'Gruber, Hans', 'Gruber, Hans']));
      type(inputs('Full Name')[1], 'Doe, Jane');
      type(inputs('Full Name')[3], ' Jr.');
      expect(people(field)).toEqual([
        '',
        'Doe, Jane',
        'Gruber, Hans',
        'Gruber, Hans Jr.',
      ]);
    });

    it.each([
      ['Family Name', 'name'],
      ['Given Name', 'given-name'],
      ['Prefix', 'prefix'],
      ['Suffix', 'suffix'],
      ['Alias', 'alias'],
    ])(
      'keeps detailed %s focused and updates only the edited person',
      (label, key) => {
        render(withPeople(field, [{ name: 'Gruber' }, { name: 'Doe' }]));
        const input = inputs(label)[0];
        type(input, 'Hans');
        expect(people(field)).toEqual([
          { name: 'Gruber', [key]: key === 'name' ? 'GruberHans' : 'Hans' },
          { name: 'Doe' },
        ]);
      },
    );

    it('preserves surviving people when deleting rows and collapsing to a single person', () => {
      render(
        withPeople(field, [
          'First',
          { name: 'Middle', 'given-name': 'M' },
          'Last',
        ]),
      );
      const middle = inputs('Family Name')[0].closest('fieldset')!;
      click('Remove', middle);
      expect(people(field)).toEqual(['First', 'Last']);
      type(inputs('Full Name')[1], ' person');
      click('Remove', inputs('Full Name')[0].closest('fieldset')!);
      expect(people(field)).toBe('Last person');
      type(inputs('Full Name')[0], ' remaining');
      expect(people(field)).toBe('Last person remaining');
      click('Remove', inputs('Full Name')[0].closest('fieldset')!);
      expect(people(field)).toBeUndefined();
    });
  });

  it('preserves focus and bindings when editing people in multiple parent references', () => {
    render({
      type: 'Chapter',
      parent: [
        { type: 'Book', author: ['', 'Second'] },
        { type: 'Book', editor: [{ name: 'Doe' }, { name: 'Other' }] },
      ],
    });
    type(inputs('Full Name')[0], 'Gruber, Hans');
    type(inputs('Family Name')[0], ' Jr.');
    expect(entry().parent).toEqual([
      { type: 'Book', author: ['Gruber, Hans', 'Second'] },
      { type: 'Book', editor: [{ name: 'Doe Jr.' }, { name: 'Other' }] },
    ]);
  });

  it('keeps custom identifier keys and values focused without changing neighboring identifiers', () => {
    render({ type: 'Book', 'serial-number': { zbl: '123', mr: '456' } });
    type(inputs('Key')[0], '-extra');
    type(inputs('Value')[0], '789');
    expect(entry()['serial-number']).toEqual({
      'zbl-extra': '123789',
      mr: '456',
    });
  });
});
