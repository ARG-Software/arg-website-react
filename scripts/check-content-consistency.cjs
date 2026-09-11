#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_PATHS = [
  'index.html',
  'docs/use-cases',
  'public/llms.txt',
  'public/llms-full.txt',
  'plugins/seo-prerender',
  'src/backend/mcp/apps/api/mcpcontent.ts',
  'src/frontend/components',
  'src/frontend/constants',
  'src/frontend/data',
  'src/frontend/pages',
  'src/frontend/utils',
];
const CONTENT_EXTENSIONS = new Set(['.html', '.js', '.jsx', '.json', '.ts', '.txt']);
const PROHIBITED_PATTERNS = [
  { pattern: /\bArg Software\b/g, replacement: 'ARG Software' },
  { pattern: /\bJose Antunes\b/g, replacement: 'José Antunes' },
  { pattern: /\b(?:Sky Tracks|Skytracks)\b/g, replacement: 'SkyTracks' },
  { pattern: /\b(?:MbNetzwerk|MB-Netzwerk)\b/g, replacement: 'mb-netzwerk' },
  { pattern: /\bTvCine\b/g, replacement: 'TV Cine' },
  { pattern: /\b70\s*(?:EUR|USD)\b/gi, replacement: 'pricing starting around EUR 10,000' },
  { pattern: /\b6\s*(?:to|-|\u2013)\s*16\s*weeks\b/gi, replacement: '8–14 weeks' },
  { pattern: /Timeline:\s*Ongoing/g, replacement: 'a bounded featured engagement' },
  {
    pattern: /~1,000\+|~2,000|~770\s*ms|<2,000ms|<10ms|Daily monitoring coverage/g,
    replacement: 'the qualified canonical metric wording',
  },
];

function listFiles(targetPath) {
  const absolutePath = path.join(ROOT_DIR, targetPath);
  if (!fs.existsSync(absolutePath)) return [];

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) return listFiles(path.relative(ROOT_DIR, entryPath));
    if (CONTENT_EXTENSIONS.has(path.extname(entry.name))) return [entryPath];
    return [];
  });
}

function isAllowedException(filePath, line) {
  return (
    filePath === 'src/frontend/data/homePage.json' &&
    line.includes('Marc-Andre Mignault, Project Manager at Skytracks')
  );
}

const files = [...new Set(CONTENT_PATHS.flatMap(listFiles))];
const violations = [];

for (const absolutePath of files) {
  const filePath = path.relative(ROOT_DIR, absolutePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    if (isAllowedException(filePath, line)) return;

    for (const { pattern, replacement } of PROHIBITED_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        violations.push(`${filePath}:${index + 1} contains "${match[0]}"; use ${replacement}`);
      }
    }
  });
}

const projects = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'src/frontend/data/projects.json'), 'utf8')
);
const faq = fs.readFileSync(path.join(ROOT_DIR, 'src/frontend/data/faq.json'), 'utf8');
const llmsFull = fs.readFileSync(path.join(ROOT_DIR, 'public/llms-full.txt'), 'utf8');
const mojaloop = projects.find(project => project.slug === 'mojaloop');
const clearinghouse = projects.find(project => project.slug === 'peoples-clearinghouse');

if (mojaloop?.timeline !== '2021-2023') {
  violations.push('src/frontend/data/projects.json must set Mojaloop timeline to 2021-2023');
}
if (!mojaloop?.metrics.some(metric => metric.label === 'Transactions per second verified in load testing')) {
  violations.push('src/frontend/data/projects.json must qualify the Mojaloop throughput metric');
}
if (!clearinghouse?.metrics.some(metric => metric.displayValue === '1,000-2,000')) {
  violations.push('src/frontend/data/projects.json must preserve the PCH load-test range');
}
if (!faq.includes('8–14 weeks')) {
  violations.push('src/frontend/data/faq.json must use the canonical 8–14 week MVP range');
}
if (!faq.includes('EUR 10,000') || !llmsFull.includes('EUR 10,000')) {
  violations.push('FAQ and full LLM context must use the canonical EUR 10,000 starting budget');
}

if (violations.length > 0) {
  console.error('Content consistency check failed:\n');
  violations.forEach(violation => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`Content consistency check passed across ${files.length} files.`);
