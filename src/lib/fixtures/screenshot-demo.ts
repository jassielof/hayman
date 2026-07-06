import { hayagrivaService } from '$lib/services/hayagriva.service';
import type { Bibliography } from '$lib/types/bibliography';
import exampleYaml from './screenshot-example.yml?raw';

export const SCREENSHOT_DEMO_BIBLIOGRAPHY_ID = 'screenshot-demo';

export const screenshotDemoBibliography: Bibliography = {
  metadata: {
    id: SCREENSHOT_DEMO_BIBLIOGRAPHY_ID,
    title: 'Sample Bibliography',
    description: 'Hayagriva schema example entries for PWA screenshots',
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z'
  },
  data: hayagrivaService.import(exampleYaml)
};
