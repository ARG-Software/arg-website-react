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
    .filter(filePath => !rule.pattern.test(path.basename(filePath)))
    .map(filePath => ({
      filePath: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
      expected: rule.description,
    }));
});

if (violations.length > 0) {
  console.error('Filename casing check failed:\n');
  violations.forEach(({ filePath, expected }) => {
    console.error(`- ${filePath} should be ${expected}`);
  });
  process.exit(1);
}

console.log('Filename casing check passed.');
