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
const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

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

function findBlogProseDoubleHyphens() {
  const blogDir = path.join(ROOT_DIR, 'src/frontend/blog');
  const violations = [];

  for (const file of fs.readdirSync(blogDir).filter(name => name.endsWith('.md'))) {
    const absolutePath = path.join(blogDir, file);
    const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
    let inFrontmatter = lines[0]?.trim() === '---';
    let inCodeFence = false;

    lines.forEach((line, index) => {
      if (inFrontmatter) {
        if (index > 0 && line.trim() === '---') inFrontmatter = false;
        return;
      }
      if (line.trimStart().startsWith('```')) {
        inCodeFence = !inCodeFence;
        return;
      }
      if (inCodeFence || /^[\s|:-]+$/.test(line)) return;

      const prose = line
        .replace(/<!--.*?-->/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/\]\([^\s)]+\)/g, ']')
        .replace(/\b(?:https?:\/\/|mailto:|tel:)\S+/gi, '');
      if (prose.includes('--')) {
        violations.push(
          `src/frontend/blog/${file}:${index + 1} contains a double hyphen in prose`
        );
      }
    });
  }

  return violations;
}

function parseContentDate(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const writtenDate = /^(\w+)\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmed);
  if (writtenDate) {
    const [, monthName, day, year] = writtenDate;
    const month = MONTHS[monthName.toLowerCase()];
    if (month !== undefined) return new Date(Date.UTC(Number(year), month, Number(day)));
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function parseBlogFrontmatter(lines) {
  if (lines[0]?.trim() !== '---') return {};

  const frontmatter = {};
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() === '---') return frontmatter;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    frontmatter[key] = value;
  }

  return frontmatter;
}

function findBlogFrontmatterDateIssues() {
  const blogDir = path.join(ROOT_DIR, 'src/frontend/blog');
  const violations = [];

  for (const file of fs.readdirSync(blogDir).filter(name => name.endsWith('.md'))) {
    const lines = fs.readFileSync(path.join(blogDir, file), 'utf8').split(/\r?\n/);
    const frontmatter = parseBlogFrontmatter(lines);
    const publishedDate = parseContentDate(frontmatter.date);
    const modifiedDate = parseContentDate(frontmatter.dateModified || frontmatter.updated);
    const reviewedDate = parseContentDate(frontmatter.reviewedOn);

    if (!publishedDate) violations.push(`src/frontend/blog/${file} has an invalid date`);
    if ((frontmatter.dateModified || frontmatter.updated) && !modifiedDate) {
      violations.push(`src/frontend/blog/${file} has an invalid dateModified`);
    }
    if (frontmatter.reviewedOn && !reviewedDate) {
      violations.push(`src/frontend/blog/${file} has an invalid reviewedOn`);
    }
    if (frontmatter.reviewedOn && !modifiedDate) {
      violations.push(`src/frontend/blog/${file} has reviewedOn without dateModified`);
    }
    if (publishedDate && modifiedDate && modifiedDate < publishedDate) {
      violations.push(`src/frontend/blog/${file} has dateModified before date`);
    }
  }

  return violations;
}

const files = [...new Set(CONTENT_PATHS.flatMap(listFiles))];
const violations = [...findBlogProseDoubleHyphens(), ...findBlogFrontmatterDateIssues()];

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
