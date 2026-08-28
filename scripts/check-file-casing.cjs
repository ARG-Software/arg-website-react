#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

const RULES = [
  {
    root: 'src/frontend/components',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/frontend/pages',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/frontend/providers',
    extensions: ['.jsx'],
    pattern: /^[A-Z][A-Za-z0-9]*\.jsx$/,
    description: 'PascalCase.jsx',
  },
  {
    root: 'src/frontend/hooks',
    extensions: ['.js'],
    pattern: /^use[A-Z][A-Za-z0-9]*\.js$/,
    description: 'usePascalThing.js',
    excludeDirectories: ['utils'],
  },
  {
    root: 'src/frontend/services',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/frontend/utils',
    extensions: ['.js'],
    pattern: /^(index|[a-z][A-Za-z0-9]*)\.js$/,
    description: 'camelCase.js or index.js',
  },
  {
    root: 'src/frontend/constants',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/frontend/workers',
    extensions: ['.js'],
    pattern: /^[a-z][A-Za-z0-9]*\.js$/,
    description: 'camelCase.js',
  },
  {
    root: 'src/frontend/data',
    extensions: ['.json'],
    pattern: /^[a-z][A-Za-z0-9]*(?:\.[a-z]+)?\.json$/,
    description: 'camelCase.json',
  },
  {
    root: 'src/frontend/styles',
    extensions: ['.css'],
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*\.css$/,
    description: 'kebab-case.css or lowercase.css',
  },
  {
    root: 'src/frontend/blog',
    extensions: ['.md'],
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
    description: 'kebab-case.md',
  },
  {
    root: 'src/backend',
    extensions: ['.ts', '.js', '.json', '.md'],
    pattern:
      /^[a-z0-9]+(?:\.(?:types|config|configuration|controller|repository|provider|factory|parser|translator|client|policy|response|request|usecase|error|constants|store|stores|handler|container|cookies|logger|api))?(?:\.test)?\.(?:ts|js|json|md)$/,
    description: 'lowercase filename with optional terminal dot suffix',
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

const backendImportExtensionViolations = listFiles(path.join(ROOT_DIR, 'src/backend'))
  .filter(filePath => path.extname(filePath) === '.ts')
  .flatMap(filePath => findRelativeTypeScriptImports(filePath));

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

if (backendImportExtensionViolations.length > 0) {
  console.error('Backend import extension check failed:\n');
  backendImportExtensionViolations.forEach(({ filePath, importPath }) => {
    console.error(
      `- ${filePath} imports ${importPath}; use the NodeNext runtime .js specifier instead`
    );
  });
  process.exit(1);
}

console.log('Filename casing check passed.');

function findRelativeTypeScriptImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const importPattern = /(?:from\s+['"]|import\(\s*['"])(\.{1,2}\/[^'"]+\.ts)['"]/g;
  const matches = [];

  for (const match of source.matchAll(importPattern)) {
    matches.push({
      filePath: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
      importPath: match[1],
    });
  }

  return matches;
}
