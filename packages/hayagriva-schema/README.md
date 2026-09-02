# @hayman/hayagriva-schema

Reusable Zod schemas, inferred TypeScript types, and structural guards for the
Hayagriva bibliography format. The package has no dependency on Hayman's UI or
storage layer.

```ts
import {
  hayagrivaBibliographySchema,
  type Hayagriva
} from '@hayman/hayagriva-schema';

const result = hayagrivaBibliographySchema.safeParse(value);
```
