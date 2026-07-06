export const SCREENSHOT_DEMO_BIBLIOGRAPHY_ID = 'screenshot-demo';

import type { Bibliography } from '$lib/types/bibliography';

export const screenshotDemoBibliography: Bibliography = {
  metadata: {
    id: SCREENSHOT_DEMO_BIBLIOGRAPHY_ID,
    title: 'Sample Bibliography',
    description: 'Demo entries for PWA store screenshots',
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z'
  },
  data: {
    knuth1984: {
      type: 'book',
      title: 'The TeXbook',
      author: ['Knuth, Donald E.'],
      date: '1984',
      publisher: 'Addison-Wesley'
    },
    lamport1994: {
      type: 'book',
      title: 'LaTeX: A Document Preparation System',
      author: ['Lamport, Leslie'],
      date: '1994',
      publisher: 'Addison-Wesley'
    },
    typst2023: {
      type: 'web',
      title: 'Typst: A new markup-based typesetting system',
      author: ['Typst Developers'],
      date: '2023',
      url: 'https://typst.app'
    }
  }
};
