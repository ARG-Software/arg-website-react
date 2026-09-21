const EMOJI_SEQUENCE =
  /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\p{Emoji_Modifier}|\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\p{Emoji_Modifier}|\uFE0F|\uFE0E)?)*|(?:[\d#*])\uFE0F?\u20E3|\p{Regional_Indicator}{2}|[\u200D\uFE0F\uFE0E]/gu;

function stripEmojis(value) {
  return String(value || '')
    .replace(EMOJI_SEQUENCE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '');
}

function stripEmojisFromMarkdown(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  let inFrontmatter = lines[0]?.trim() === '---';
  let inCodeFence = false;

  return lines
    .map((line, index) => {
      if (inFrontmatter) {
        if (index > 0 && line.trim() === '---') {
          inFrontmatter = false;
          return line;
        }

        const colon = line.indexOf(':');
        if (colon === -1) return line;
        return `${line.slice(0, colon + 1)}${stripEmojis(line.slice(colon + 1))}`;
      }

      if (line.trimStart().startsWith('```')) {
        inCodeFence = !inCodeFence;
        return line;
      }

      if (inCodeFence) return line;
      return stripEmojis(line);
    })
    .join('\n');
}

function findMarkdownEmoji(raw, filePath) {
  const lines = String(raw || '').split(/\r?\n/);
  let inFrontmatter = lines[0]?.trim() === '---';
  let inCodeFence = false;
  const violations = [];

  lines.forEach((line, index) => {
    if (inFrontmatter) {
      if (index > 0 && line.trim() === '---') {
        inFrontmatter = false;
        return;
      }
      EMOJI_SEQUENCE.lastIndex = 0;
      if (EMOJI_SEQUENCE.test(line)) {
        violations.push(`${filePath}:${index + 1} contains an emoji in frontmatter`);
      }
      return;
    }

    if (line.trimStart().startsWith('```')) {
      inCodeFence = !inCodeFence;
      return;
    }

    if (inCodeFence) return;

    EMOJI_SEQUENCE.lastIndex = 0;
    if (EMOJI_SEQUENCE.test(line)) {
      violations.push(`${filePath}:${index + 1} contains an emoji in prose`);
    }
  });

  return violations;
}

module.exports = {
  stripEmojis,
  stripEmojisFromMarkdown,
  findMarkdownEmoji,
};
