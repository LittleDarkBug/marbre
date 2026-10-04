import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import noMultilineComments from './lint/no-multiline-comments.js'
import noForbiddenChars from './lint/no-forbidden-chars.js'

const marbre = { rules: { 'no-multiline-comments': noMultilineComments, 'no-forbidden-chars': noForbiddenChars } }

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, marbre },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'marbre/no-multiline-comments': 'error',
      'marbre/no-forbidden-chars': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
