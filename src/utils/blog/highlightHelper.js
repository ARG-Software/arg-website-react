import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import graphql from 'highlight.js/lib/languages/graphql';
import http from 'highlight.js/lib/languages/http';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import powershell from 'highlight.js/lib/languages/powershell';
import protobuf from 'highlight.js/lib/languages/protobuf';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const LANGUAGE_REGISTRY = [
  ['bash', bash],
  ['csharp', csharp],
  ['graphql', graphql],
  ['html', xml],
  ['http', http],
  ['ini', ini],
  ['javascript', javascript],
  ['json', json],
  ['powershell', powershell],
  ['protobuf', protobuf],
  ['sql', sql],
  ['tsx', typescript],
  ['typescript', typescript],
  ['xml', xml],
  ['yaml', yaml],
];

LANGUAGE_REGISTRY.forEach(([name, language]) => {
  hljs.registerLanguage(name, language);
});

hljs.registerAliases(['promql'], { languageName: 'sql' });

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => HTML_ESCAPES[character]);
}

export function getCodeLineNumbers(code) {
  return code.split('\n').map((_, index) => index + 1);
}

export function getCodeLanguageLabel(lang) {
  if (lang === 'plaintext') return 'text';
  if (!lang) return 'code';
  return lang;
}

export function highlightCode(code, lang) {
  if (lang === 'plaintext') {
    return { html: escapeHtml(code), detectedLang: 'plaintext' };
  }
  if (lang && hljs.getLanguage(lang)) {
    const result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
    return { html: result.value, detectedLang: lang };
  }
  const result = hljs.highlightAuto(code);
  return { html: result.value, detectedLang: result.language || '' };
}
