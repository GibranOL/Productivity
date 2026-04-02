import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // React 17+ — no need to import React in scope
      'react/react-in-jsx-scope': 'off',
      // PropTypes not used in this project
      'react/prop-types': 'off',

      // Common logic errors
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',

      // Catches real bugs
      'no-fallthrough': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',

      // Keep console.warn/error; warn on console.log left in production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Disable all formatting rules — Prettier owns that
  prettierConfig,
]
