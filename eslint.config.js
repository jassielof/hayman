import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  globalIgnores(['json-schemas/', '.svelte-kit/', 'build/', 'coverage/']),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    files: ['src/**/*.{ts,svelte}'],
    languageOptions: { globals: globals.browser },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    files: [
      '*.{js,mjs,cjs,ts}',
      'scripts/**/*.{js,mjs,cjs,ts}',
      '**/*.config.{js,mjs,cjs,ts}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],

    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
    rules: {
      // Svelte rune props are intentionally declared with `let` so bindings work.
      'prefer-const': 'off',
    },
  },
  {
    files: ['src/lib/formatters/entry-type-formatter.ts'],
    rules: {
      // Lucide components are values rendered dynamically by Svelte.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['src/lib/components/ui/entry-preview-tabs.svelte'],
    rules: {
      'svelte/no-at-html-tags': 'off',
    },
  },
  {
    files: ['src/lib/components/TypstPreview.svelte'],
    rules: {
      'svelte/no-at-html-tags': 'off',
    },
  },
  {
    files: ['src/routes/settings/+page.svelte'],
    rules: {
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
);
