const js = require('@eslint/js');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['node_modules/**', 'dist/**', '*.config.js', 'vite-plugin-seo-prerender.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
       'react/react-in-jsx-scope': 'off',
       'react/prop-types': 'off',
       'react/no-unescaped-entities': 'off',
       'react/no-unknown-property': ['error', { ignore: ['fs-numbercount-element', 'fs-numbercount-start', 'fs-numbercount-end', 'validate'] }],
       'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
       'prettier/prettier': ['error', { singleQuote: true, semi: true }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];