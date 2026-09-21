function normalizeHeadingText(text) {
  return text.replace(/^[-–—]\s*/, '').trim();
}

function normalizeCodeLanguage(language) {
  const normalized = (language || '').trim().toLowerCase();
  if (!normalized) return 'plaintext';
  if (normalized === 'text' || normalized === 'txt') return 'plaintext';
  return normalized;
}

function parseListItem(row) {
  const match = row.match(/^\*\*(.+?)\*\*\.?\s*(.*)/s);
  return match
    ? { label: match[1].replace(/\.$/, '') + '.', text: match[2].trim() }
    : { label: '', text: row };
}

function appendListItems(blocks, type, items) {
  const previous = blocks.at(-1);
  if (previous?.type === type) {
    previous.items.push(...items);
    return;
  }
  blocks.push({ type, items });
}

function splitIntoChunks(body) {
  const chunks = [];
  const lines = body.split('\n');
  let current = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      if (!inFence && current.length) {
        chunks.push(current.join('\n'));
        current = [];
      }
      inFence = !inFence;
      current.push(line);
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (line.trim() === '') {
      if (current.length) {
        chunks.push(current.join('\n'));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join('\n'));
  return chunks;
}

export function parseBlocks(body) {
  const blocks = [];
  let isFirstParagraph = true;

  for (const chunk of splitIntoChunks(body)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const code = trimmed.match(/^```(\w*)\r?\n([\s\S]*?)\r?\n```$/);
    if (code) {
      blocks.push({ type: 'code', lang: normalizeCodeLanguage(code[1]), text: code[2] });
      continue;
    }

    if (trimmed.startsWith('>')) {
      blocks.push({
        type: 'callout',
        text: trimmed
          .split('\n')
          .map(line => line.replace(/^>\s?/, ''))
          .join(' ')
          .trim(),
      });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', text: normalizeHeadingText(trimmed.slice(3)) });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'subheading', text: normalizeHeadingText(trimmed.slice(4)) });
      continue;
    }

    if (trimmed.split('\n').every(line => /^\s*\d+\.\s+/.test(line))) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^\s*\d+\.\s+/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      appendListItems(blocks, 'ordered-list', items);
      continue;
    }

    if (trimmed.split('\n').every(line => line.trimStart().startsWith('- '))) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^\s*-\s/, '').trim())
        .filter(Boolean)
        .map(parseListItem);
      appendListItems(blocks, 'list', items);
      continue;
    }

    if (trimmed.startsWith('![')) {
      const match = trimmed.match(/^!\[([^\]]*)\]\((\S+)(?:\s+["']([^"']*)["'])?\)/);
      if (match) {
        blocks.push({ type: 'image', alt: match[1], src: match[2], caption: match[3] || '' });
        continue;
      }
    }

    const text = trimmed.replace(/\r?\n/g, ' ');
    if (isFirstParagraph) {
      blocks.push({ type: 'lead', text });
      isFirstParagraph = false;
    } else {
      blocks.push({ type: 'paragraph', text });
    }
  }

  return blocks;
}
