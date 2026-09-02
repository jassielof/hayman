import { hayagrivaService } from '$lib/services/hayagriva.service';
import type { Bibliography } from '$lib/types/bibliography';
import exampleYaml from './screenshot-example.yml?raw';

export const SCREENSHOT_DEMO_BIBLIOGRAPHY_ID = 'screenshot-demo';

const primaryBibliography: Bibliography = {
  metadata: {
    id: SCREENSHOT_DEMO_BIBLIOGRAPHY_ID,
    title: 'Sample Bibliography',
    description: 'Hayagriva schema example entries for PWA screenshots',
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  },
  data: hayagrivaService.import(exampleYaml),
};

export const screenshotDemoBibliographies: Bibliography[] = [
  primaryBibliography,
  {
    metadata: {
      id: 'literature-review',
      title: 'Literature Review — Open Research',
      description: 'Sources collected for an open-science literature review',
      createdAt: '2024-05-12T09:30:00.000Z',
      updatedAt: '2024-06-02T14:15:00.000Z',
    },
    data: Object.fromEntries(
      Object.entries(primaryBibliography.data).slice(3, 9),
    ),
  },
  {
    metadata: {
      id: 'methods-reading-list',
      title: 'Research Methods Reading List',
      description: 'Core books and papers for the methods seminar',
      createdAt: '2024-04-20T16:00:00.000Z',
      updatedAt: '2024-05-28T11:45:00.000Z',
    },
    data: Object.fromEntries(Object.entries(primaryBibliography.data).slice(8)),
  },
];
