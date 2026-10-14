// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { focusEntryField } from './focus-entry-field';

afterEach(() => document.body.replaceChildren());

it('opens nested disclosures and targets the correct parent, affiliation and person', () => {
  document.body.innerHTML = `<details><summary>Parent</summary>
    <div data-entry-field="parent.1.affiliated"><input aria-label="Other group">
      <details><summary>Affiliation</summary><div data-entry-field="parent.1.affiliated.1.names">
        <div data-person-index="0"><input data-value-key="name"></div>
        <details><summary>Person</summary><div data-person-index="1"><input data-value-key="alias"></div></details>
      </div></details>
    </div></details>`;
  expect(
    focusEntryField(document.body, 'parent.1.affiliated.1.names.1.alias'),
  ).toBe(true);
  expect(document.activeElement).toBe(
    document.querySelector('[data-value-key="alias"]'),
  );
  expect(
    [...document.querySelectorAll('details')].every((details) => details.open),
  ).toBe(true);
  expect(focusEntryField(document.body, 'absent')).toBe(false);
});
