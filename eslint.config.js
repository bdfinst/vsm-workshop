import js from '@eslint/js'
import globals from 'globals'
import svelte from 'eslint-plugin-svelte'

export default [
  { ignores: ['dist', '.svelte-kit', 'spikes'] },
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.{js,svelte}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: null,
      },
    },
  },
]
