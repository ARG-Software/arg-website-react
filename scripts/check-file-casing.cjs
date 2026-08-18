#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

const RULES = [
  {
    root: 'src/components',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/pages',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/providers',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/hooks',
    extensions: ['.js'],
    pattern: /^use[A-Z][A-Za-z0-9]*\.js$/,
    description: 'usePascalThing.js',
    excludeDirectories: ['utils'],
  },
  {
    root: 'src/services',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/utils',
    extensions: ['.js'],
    pattern: /^(index|[a-z][A-Za-z0-9]*)\.js$/,
    description: 'camelCase.js or index.js',
  },
  {
    root: 'src/constants',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/workers',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/data',
    extensions: ['.json'],
    pattern: /^[a-z][A-Za-z0-9]*(?:\.[a-z]+)?\.json$/,
    description: 'camelCase.json',
  },
  {
    root: 'src/styles',
    extensions: ['.css'],
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*\.css$/,
    description: 'kebab-case.css or lowercase.css',
  },
  {
    root: 'src/blog',
    extensions: ['.md'],
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
    description: 'kebab-case.md',
  },
  {
    root: 'backend/rag/domain',
    extensions: ['.ts'],
    pattern: /^[A-Z][A-Za-z0-9]*\.ts$/,
    description: 'PascalCase.ts',
  },
  {
    root: 'backend/rag/application/ports',
    extensions: ['.ts'],
    pattern: /^[A-Z][A-Za-z0-9]*\.ts$/,
    description: 'PascalCase.ts',
  },
  {
    root: 'backend/rag/application',
    extensions: ['.ts'],
    pattern: /^[a-z][A-Za-z0-9]*\.ts$/,
    description: 'camelCase.ts',
    excludeDirectories: ['ports'],
  },
  {
    root: 'backend/rag/infrastructure/ingestion',
    extensions: ['.ts'],
    pattern: /^(?:[a-z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*Types)\.ts$/,
    description: 'camelCase.ts or PascalCaseTypes.ts',
  },
  {
    root: 'backend/rag/infrastructure/embeddings',
    extensions: ['.ts'],
    pattern: /^(?:[a-z][A-Za-z0-9]*Config|[A-Z][A-Za-z0-9]*Provider)\.ts$/,
    description: 'camelCaseConfig.ts or PascalCaseProvider.ts',
  },
  {
    root: 'backend/rag/infrastructure/llm',
    extensions: ['.ts'],
    pattern: /^(?:[a-z][A-Za-z0-9]*Config|[A-Z][A-Za-z0-9]*(?:Provider|Translator|Client))\.ts$/,
    description: 'camelCaseConfig.ts or PascalCase provider/client module',
  },
  {
    root: 'backend/rag/infrastructure/repositories',
    extensions: ['.ts'],
    pattern: /^(?:[a-z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*(?:Repository|Factory))\.ts$/,
    description: 'camelCase.ts or PascalCase repository/factory module',
  },
  {
    root: 'backend/rag/infrastructure/security',
    extensions: ['.ts'],
    pattern: /^[a-z][A-Za-z0-9]*\.ts$/,
    description: 'camelCase.ts',
  },
  {
    root: 'backend/rag/apps',
    extensions: ['.ts'],
    pattern: /^[a-z][A-Za-z0-9]*\.ts$/,
    description: 'camelCase.ts',
  },
  {
    root: 'backend/rag/scripts',
    extensions: ['.ts'],
    pattern: /^[a-z][A-Za-z0-9]*\.ts$/,
    description: 'camelCase.ts',
  },
  {
    root: 'backend/rag/tests',
    extensions: ['.ts'],
    pattern: /^(?:[A-Z][A-Za-z0-9]*|[a-z][A-Za-z0-9]*)(?:\.test)?\.ts$/,
    description: 'PascalCase.ts, camelCase.ts, or camelCase.test.ts',
  },
];

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }

    return entry.isFile() ? [entryPath] : [];
  });
}

const violations = RULES.flatMap(rule => {
  const directory = path.join(ROOT_DIR, rule.root);
  return listFiles(directory)
    .filter(filePath => rule.extensions.includes(path.extname(filePath)))
    .filter(filePath => !isInExcludedDirectory(filePath, rule.excludeDirectories ?? []))
    .filter(filePath => !rule.pattern.test(path.basename(filePath)))
    .map(filePath => ({
      filePath: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
      expected: rule.description,
    }));
});

function isInExcludedDirectory(filePath, excludedDirectories) {
  if (excludedDirectories.length === 0) return false;

  const parts = path.relative(ROOT_DIR, filePath).split(path.sep);
  return parts.some(part => excludedDirectories.includes(part));
}

if (violations.length > 0) {
  console.error('Filename casing check failed:\n');
  violations.forEach(({ filePath, expected }) => {
    console.error(`- ${filePath} should be ${expected}`);
  });
  process.exit(1);
}

console.log('Filename casing check passed.');
