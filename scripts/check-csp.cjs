#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const HEADERS_PATH = path.join(DIST_DIR, '_headers');

if (!fs.existsSync(HEADERS_PATH)) {
  throw new Error('dist/_headers does not exist. Run the production build before checking CSP.');
}

const headers = fs.readFileSync(HEADERS_PATH, 'utf8');
const policy = /Content-Security-Policy:\s*([^\r\n]+)/.exec(headers)?.[1];
const scriptSources = /(?:^|;)\s*script-src\s+([^;]+)/.exec(policy || '')?.[1];

if (!scriptSources) {
  throw new Error('The deployed Content-Security-Policy does not define script-src.');
}
if (/['"]unsafe-(?:inline|eval)['"]/.test(scriptSources)) {
  throw new Error("script-src must not contain 'unsafe-inline' or 'unsafe-eval'.");
}

const htmlFiles = listHtmlFiles(DIST_DIR);
const missingHashes = [];
const inlineHashes = new Set();

for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, 'utf8');

  for (const script of getExecutableInlineScripts(html)) {
    const normalizedScript = script.replace(/\r\n?/g, '\n');
    const hash = `sha256-${crypto.createHash('sha256').update(normalizedScript).digest('base64')}`;
    inlineHashes.add(hash);

    if (!scriptSources.includes(`'${hash}'`)) {
      missingHashes.push(`${path.relative(ROOT_DIR, htmlPath).replace(/\\/g, '/')}: ${hash}`);
    }
  }
}

if (inlineHashes.size === 0) {
  throw new Error('No executable inline scripts were found in the production HTML.');
}
if (missingHashes.length > 0) {
  throw new Error(`CSP is missing hashes for executable inline scripts:\n${missingHashes.join('\n')}`);
}

console.log(
  `CSP validated for ${htmlFiles.length} HTML files and ${inlineHashes.size} inline script hash(es).`
);

function listHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

function getExecutableInlineScripts(html) {
  const scripts = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const attributes = match[1];
    if (/\bsrc\s*=/.test(attributes)) continue;

    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1].toLowerCase();
    if (type && type !== 'module' && type !== 'text/javascript' && type !== 'application/javascript') {
      continue;
    }

    scripts.push(match[2]);
  }

  return scripts;
}
