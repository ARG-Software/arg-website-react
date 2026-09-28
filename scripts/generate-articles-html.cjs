const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = process.cwd();
const SITE_URL = 'https://arg.software';

const BLOG_DIR = path.join(ROOT, 'src', 'frontend', 'blog');

const OUTPUT_DIR = path.join(
  ROOT,
  'external',
  'html',
  'medium-updates',
  'articles'
);

const escapeHtml = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const absoluteUrl = value => {
  if (value.startsWith('/')) {
    return `${SITE_URL}${value}`;
  }

  return value;
};

function parseArticle(raw) {
  const normalized = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/—/g, '-');

  const match = normalized.match(
    /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
  );

  if (!match) {
    throw new Error(
      'Article is missing valid YAML frontmatter.'
    );
  }

  const meta = {};

  for (const line of match[1].split('\n')) {
    const field = line.match(
      /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/
    );

    if (!field) {
      continue;
    }

    let value = field[2].trim();

    if (
      value.length >= 2 &&
      (
        (
          value.startsWith('"') &&
          value.endsWith('"')
        ) ||
        (
          value.startsWith("'") &&
          value.endsWith("'")
        )
      )
    ) {
      value = value.slice(1, -1);
    }

    meta[field[1]] = value;
  }

  return {
    meta,
    body: match[2].trim(),
  };
}

function renderInline(value) {
  let html = '';
  let text = '';
  let index = 0;

  const flushText = () => {
    html += escapeHtml(text);
    text = '';
  };

  while (index < value.length) {
    if (value[index] === '`') {
      const end = value.indexOf(
        '`',
        index + 1
      );

      if (end !== -1) {
        flushText();

        html += `<code>${escapeHtml(
          value.slice(index + 1, end)
        )}</code>`;

        index = end + 1;

        continue;
      }
    }

    if (value.startsWith('**', index)) {
      const end = value.indexOf(
        '**',
        index + 2
      );

      if (end !== -1) {
        flushText();

        html += `<strong>${renderInline(
          value.slice(index + 2, end)
        )}</strong>`;

        index = end + 2;

        continue;
      }
    }

    if (value[index] === '[') {
      const labelEnd = value.indexOf(
        '](',
        index + 1
      );

      if (labelEnd !== -1) {
        const urlEnd = value.indexOf(
          ')',
          labelEnd + 2
        );

        if (urlEnd !== -1) {
          flushText();

          const label = value.slice(
            index + 1,
            labelEnd
          );

          const href = absoluteUrl(
            value.slice(
              labelEnd + 2,
              urlEnd
            )
          );

          html += `<a href="${escapeHtml(
            href
          )}">${renderInline(label)}</a>`;

          index = urlEnd + 1;

          continue;
        }
      }
    }

    if (
      value[index] === '*' &&
      value[index + 1] !== '*'
    ) {
      const end = value.indexOf(
        '*',
        index + 1
      );

      if (end !== -1) {
        flushText();

        html += `<em>${renderInline(
          value.slice(index + 1, end)
        )}</em>`;

        index = end + 1;

        continue;
      }
    }

    text += value[index];
    index += 1;
  }

  flushText();

  return html;
}

const isBlank = line =>
  line.trim() === '';

const isFence = line =>
  /^```/.test(line.trimStart());

const isHeading = line =>
  /^#{2,3}\s+/.test(line);

const isQuote = line =>
  /^>\s?/.test(line);

const isImage = line =>
  /^!\[[^\]]*\]\([^\s)]+(?:\s+["'][^"']*["'])?\)\s*$/.test(
    line.trim()
  );

const isUnordered = line =>
  /^\s*-\s+/.test(line);

const isOrdered = line =>
  /^\s*\d+\.\s+/.test(line);

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map(cell =>
      cell
        .trim()
        .replace(/\\\|/g, '|')
    );
}

function isTableDelimiter(line) {
  const cells = splitTableRow(line);

  return (
    cells.length > 0 &&
    cells.every(cell =>
      /^:?-{3,}:?$/.test(cell)
    )
  );
}

function isBlockStart(lines, index) {
  const line = lines[index] || '';

  return (
    isFence(line) ||
    isHeading(line) ||
    isQuote(line) ||
    isImage(line) ||
    isUnordered(line) ||
    isOrdered(line) ||
    (
      index + 1 < lines.length &&
      line.includes('|') &&
      isTableDelimiter(
        lines[index + 1]
      )
    )
  );
}

function renderImage(line) {
  const match = line
    .trim()
    .match(
      /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)$/
    );

  if (!match) {
    return `<p>${renderInline(
      line
    )}</p>`;
  }

  const src = absoluteUrl(
    match[2]
  );

  const caption = match[3]
    ? `<figcaption>${renderInline(
        match[3]
      )}</figcaption>`
    : '';

  return `<figure><img src="${escapeHtml(
    src
  )}" alt="${escapeHtml(
    match[1]
  )}">${caption}</figure>`;
}

function renderTable(lines, index) {
  const headers =
    splitTableRow(lines[index]);

  const delimiters =
    splitTableRow(
      lines[index + 1]
    );

  const alignments =
    delimiters.map(cell => {
      if (
        cell.startsWith(':') &&
        cell.endsWith(':')
      ) {
        return 'center';
      }

      if (
        cell.endsWith(':')
      ) {
        return 'right';
      }

      return 'left';
    });

  const rows = [];

  let cursor =
    index + 2;

  while (
    cursor < lines.length &&
    lines[cursor].includes('|') &&
    !isBlank(lines[cursor])
  ) {
    rows.push(
      splitTableRow(
        lines[cursor]
      )
    );

    cursor += 1;
  }

  const head = headers
    .map(
      (
        cell,
        cellIndex
      ) =>
        `<th style="text-align:${
          alignments[cellIndex] ||
          'left'
        }">${renderInline(
          cell
        )}</th>`
    )
    .join('');

  const body = rows
    .map(
      row =>
        `<tr>${row
          .map(
            (
              cell,
              cellIndex
            ) =>
              `<td style="text-align:${
                alignments[
                  cellIndex
                ] ||
                'left'
              }">${renderInline(
                cell
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('\n');

  return {
    html:
      `<table>` +
      `<thead>` +
      `<tr>${head}</tr>` +
      `</thead>` +
      `<tbody>${body}</tbody>` +
      `</table>`,
    next: cursor,
  };
}

function renderOrderedList(
  lines,
  index
) {
  const firstNumber =
    Number.parseInt(
      lines[index].match(
        /^\s*(\d+)\./
      )[1],
      10
    );

  const items = [];

  let cursor = index;

  let hasDescriptions =
    false;

  while (
    cursor < lines.length
  ) {
    const itemMatch =
      lines[cursor].match(
        /^\s*(\d+)\.\s+(.+)$/
      );

    if (!itemMatch) {
      break;
    }

    const item = {
      number:
        Number.parseInt(
          itemMatch[1],
          10
        ),
      text:
        itemMatch[2],
      paragraphs: [],
    };

    items.push(item);

    cursor += 1;

    while (
      cursor <
        lines.length &&
      isBlank(
        lines[cursor]
      )
    ) {
      cursor += 1;
    }

    if (
      cursor <
        lines.length &&
      isOrdered(
        lines[cursor]
      )
    ) {
      continue;
    }

    if (
      cursor <
        lines.length &&
      !isBlockStart(
        lines,
        cursor
      )
    ) {
      const paragraphStart =
        cursor;

      const paragraphLines =
        [];

      while (
        cursor <
          lines.length &&
        !isBlank(
          lines[cursor]
        ) &&
        !isBlockStart(
          lines,
          cursor
        )
      ) {
        paragraphLines.push(
          lines[cursor]
        );

        cursor += 1;
      }

      let nextBlock =
        cursor;

      while (
        nextBlock <
          lines.length &&
        isBlank(
          lines[nextBlock]
        )
      ) {
        nextBlock += 1;
      }

      if (
        isOrdered(
          lines[
            nextBlock
          ] || ''
        ) ||
        hasDescriptions
      ) {
        item.paragraphs.push(
          paragraphLines.join(
            ' '
          )
        );

        hasDescriptions =
          true;

        cursor =
          nextBlock;

        if (
          isOrdered(
            lines[cursor] ||
              ''
          )
        ) {
          continue;
        }
      } else {
        cursor =
          paragraphStart;
      }
    }

    break;
  }

  const start =
    firstNumber === 1
      ? ''
      : ` start="${firstNumber}"`;

  const html = items
    .map(item => {
      const value =
        item.number ===
        firstNumber +
          items.indexOf(
            item
          )
          ? ''
          : ` value="${item.number}"`;

      const descriptions =
        item.paragraphs
          .map(
            paragraph =>
              `<p>${renderInline(
                paragraph
              )}</p>`
          )
          .join('');

      return `<li${value}>${renderInline(
        item.text
      )}${descriptions}</li>`;
    })
    .join('\n');

  return {
    html:
      `<ol${start}>` +
      `${html}` +
      `</ol>`,
    next: cursor,
  };
}

function renderBody(body) {
  const lines = body
    .replace(/\r\n/g, '\n')
    .split('\n');

  const blocks = [];

  let index = 0;

  while (
    index < lines.length
  ) {
    if (
      isBlank(
        lines[index]
      )
    ) {
      index += 1;
      continue;
    }

    const fence =
      lines[index]
        .trimStart()
        .match(
          /^```([^\s`]*)\s*$/
        );

    if (fence) {
      const code = [];

      index += 1;

      while (
        index <
          lines.length &&
        !/^```\s*$/.test(
          lines[
            index
          ].trimStart()
        )
      ) {
        code.push(
          lines[index]
        );

        index += 1;
      }

      if (
        index <
        lines.length
      ) {
        index += 1;
      }

      const language =
        fence[1]
          ? ` class="language-${escapeHtml(
              fence[1]
            )}"`
          : '';

      blocks.push(
        `<pre><code${language}>${escapeHtml(
          code.join('\n')
        )}</code></pre>`
      );

      continue;
    }

    const heading =
      lines[index].match(
        /^(#{2,3})\s+(.+)$/
      );

    if (heading) {
      const level =
        heading[1].length;

      blocks.push(
        `<h${level}>${renderInline(
          heading[2].replace(
            /^[-–—]\s*/,
            ''
          )
        )}</h${level}>`
      );

      index += 1;

      continue;
    }

    if (
      isQuote(
        lines[index]
      )
    ) {
      const quote = [];

      while (
        index <
          lines.length &&
        isQuote(
          lines[index]
        )
      ) {
        quote.push(
          lines[
            index
          ].replace(
            /^>\s?/,
            ''
          )
        );

        index += 1;
      }

      blocks.push(
        `<blockquote><p>${renderInline(
          quote.join(' ')
        )}</p></blockquote>`
      );

      continue;
    }

    if (
      isImage(
        lines[index]
      )
    ) {
      blocks.push(
        renderImage(
          lines[index]
        )
      );

      index += 1;

      continue;
    }

    if (
      index + 1 <
        lines.length &&
      lines[
        index
      ].includes('|') &&
      isTableDelimiter(
        lines[
          index + 1
        ]
      )
    ) {
      const table =
        renderTable(
          lines,
          index
        );

      blocks.push(
        table.html
      );

      index =
        table.next;

      continue;
    }

    if (
      isUnordered(
        lines[index]
      )
    ) {
      const items = [];

      while (
        index <
        lines.length
      ) {
        const item =
          lines[
            index
          ].match(
            /^\s*-\s+(.+)$/
          );

        if (!item) {
          break;
        }

        items.push(
          item[1]
        );

        index += 1;

        let next = index;

        while (
          next <
            lines.length &&
          isBlank(
            lines[next]
          )
        ) {
          next += 1;
        }

        if (
          isUnordered(
            lines[next] ||
              ''
          )
        ) {
          index = next;
        }
      }

      blocks.push(
        `<ul>${items
          .map(
            item =>
              `<li>${renderInline(
                item
              )}</li>`
          )
          .join(
            '\n'
          )}</ul>`
      );

      continue;
    }

    if (
      isOrdered(
        lines[index]
      )
    ) {
      const list =
        renderOrderedList(
          lines,
          index
        );

      blocks.push(
        list.html
      );

      index =
        list.next;

      continue;
    }

    const paragraph = [];

    while (
      index <
        lines.length &&
      !isBlank(
        lines[index]
      ) &&
      !isBlockStart(
        lines,
        index
      )
    ) {
      paragraph.push(
        lines[index]
      );

      index += 1;
    }

    if (
      paragraph.length
    ) {
      blocks.push(
        `<p>${renderInline(
          paragraph.join(
            ' '
          )
        )}</p>`
      );

      continue;
    }

    throw new Error(
      `Unsupported Markdown near: ${lines[index]}`
    );
  }

  return blocks.join(
    '\n\n'
  );
}

function extractHero(body) {
  const lines =
    body.split('\n');

  const imageIndex =
    lines.findIndex(
      isImage
    );

  if (
    imageIndex === -1
  ) {
    return {
      hero: '',
      body,
    };
  }

  const hero =
    renderImage(
      lines[imageIndex]
    );

  lines.splice(
    imageIndex,
    1
  );

  return {
    hero,
    body: lines
      .join('\n')
      .replace(
        /\n{3,}/g,
        '\n\n'
      )
      .trim(),
  };
}

function renderDocument(
  meta,
  body
) {
  const {
    hero,
    body: bodyWithoutHero,
  } = extractHero(body);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.title)}</title>
  <style>
    body {
      margin: 0;
      background: #fff;
      color: #242424;
      font-family: Georgia, 'Times New Roman', serif;
    }

    article {
      box-sizing: border-box;
      max-width: 760px;
      margin: 0 auto;
      padding: 48px 24px 96px;
    }

    h1 {
      margin: 0 0 12px;
      font: 700 42px/1.15 Arial, sans-serif;
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 0 0 32px;
      color: #6b6b6b;
      font: 400 22px/1.4 Arial, sans-serif;
    }

    h2 {
      margin: 52px 0 18px;
      font: 700 30px/1.25 Arial, sans-serif;
    }

    h3 {
      margin: 36px 0 14px;
      font: 700 23px/1.3 Arial, sans-serif;
    }

    p,
    li {
      font-size: 20px;
      line-height: 1.6;
    }

    p {
      margin: 0 0 26px;
    }

    ul,
    ol {
      margin: 0 0 30px;
      padding-left: 30px;
    }

    li {
      margin: 8px 0;
    }

    li p {
      margin: 10px 0 18px;
    }

    blockquote {
      margin: 32px 0;
      padding-left: 22px;
      border-left: 3px solid #242424;
      font-style: italic;
    }

    blockquote p {
      margin: 0;
    }

    figure {
      margin: 34px 0;
    }

    figure:first-of-type {
      margin-top: 10px;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption {
      margin-top: 8px;
      color: #6b6b6b;
      font: 14px/1.4 Arial, sans-serif;
      text-align: center;
    }

    pre {
      overflow-x: auto;
      margin: 30px 0;
      padding: 20px;
      border-radius: 6px;
      background: #f5f5f5;
      white-space: pre;
    }

    code {
      font-family: Consolas, 'Courier New', monospace;
    }

    p code,
    li code,
    blockquote code,
    td code {
      padding: 2px 5px;
      border-radius: 3px;
      background: #f2f2f2;
      font-size: 0.88em;
    }

    pre code {
      padding: 0;
      background: transparent;
      font-size: 14px;
      line-height: 1.55;
    }

    a {
      color: inherit;
      text-decoration: underline;
    }

    table {
      width: 100%;
      margin: 30px 0;
      border-collapse: collapse;
      font: 16px/1.5 Arial, sans-serif;
    }

    th,
    td {
      padding: 10px 12px;
      border: 1px solid #d7d7d7;
      vertical-align: top;
    }

    th {
      background: #f5f5f5;
      font-weight: 700;
    }
  </style>
</head>
<body>
<article>
  <h1>${renderInline(meta.title)}</h1>

  <p class="subtitle">${renderInline(
    meta.subtitle || ''
  )}</p>

  ${hero}

  ${renderBody(
    bodyWithoutHero
  )}
</article>
</body>
</html>
`;
}

const countMatches = (
  value,
  pattern
) =>
  [
    ...value.matchAll(
      pattern
    ),
  ].length;

function verifyDocument(
  meta,
  body,
  html,
  slug
) {
  const prose =
    body.replace(
      /^```[^\n]*\n[\s\S]*?^```\s*$/gm,
      ''
    );

  const source = {
    code:
      countMatches(
        body,
        /^```[^\n]*$/gm
      ) / 2,

    headings:
      countMatches(
        prose,
        /^#{2,3}\s+/gm
      ),

    images:
      countMatches(
        prose,
        /^!\[[^\]]*\]\([^\n]+\)$/gm
      ),

    links:
      countMatches(
        prose,
        /(?<!!)\[[^\]]+\]\([^)]+\)/g
      ),

    listItems:
      countMatches(
        prose,
        /^\s*(?:-|\d+\.)\s+/gm
      ),

    quotes:
      countMatches(
        prose,
        /^>\s?/gm
      ),

    tables:
      countMatches(
        prose,
        /^\s*\|?\s*:?-{3,}:?\s*\|/gm
      ),
  };

  const rendered = {
    code:
      countMatches(
        html,
        /<pre><code(?:\s|>)/g
      ),

    headings:
      countMatches(
        html,
        /<h[23]>/g
      ),

    images:
      countMatches(
        html,
        /<img\s/g
      ),

    links:
      countMatches(
        html,
        /<a\s/g
      ),

    listItems:
      countMatches(
        html,
        /<li(?:\s|>)/g
      ),

    quotes:
      countMatches(
        html,
        /<blockquote>/g
      ),

    tables:
      countMatches(
        html,
        /<table>/g
      ),
  };

  for (
    const key of
    Object.keys(source)
  ) {
    if (
      source[key] !==
      rendered[key]
    ) {
      throw new Error(
        `${slug}: ${key} count differs ` +
        `(Markdown ${source[key]}, HTML ${rendered[key]}).`
      );
    }
  }

  const emoji =
    new Set(
      `${meta.title}\n${meta.subtitle || ''}\n${body}`.match(
        /\p{Extended_Pictographic}/gu
      ) || []
    );

  for (
    const character of
    emoji
  ) {
    if (
      !html.includes(
        character
      )
    ) {
      throw new Error(
        `${slug}: emoji ${character} was not preserved.`
      );
    }
  }

  if (
    /\s(?:href|src)="\//.test(
      html
    )
  ) {
    throw new Error(
      `${slug}: an output URL is still root-relative.`
    );
  }
}

function getArticlePaths() {
  if (
    !fs.existsSync(
      BLOG_DIR
    )
  ) {
    throw new Error(
      `Blog directory does not exist: ${BLOG_DIR}`
    );
  }

  return fs
    .readdirSync(
      BLOG_DIR,
      {
        withFileTypes: true,
      }
    )
    .filter(
      entry =>
        entry.isFile() &&
        entry.name
          .toLowerCase()
          .endsWith('.md')
    )
    .map(
      entry =>
        path.join(
          'src',
          'frontend',
          'blog',
          entry.name
        )
    )
    .sort();
}

function sanitizeFileName(
  value
) {
  return value
    .replace(
      /[?#].*$/,
      ''
    )
    .replace(
      /\.[^.]+$/,
      ''
    )
    .replace(
      /[^a-zA-Z0-9-_]+/g,
      '-'
    )
    .replace(
      /^[-_]+|[-_]+$/g,
      ''
    )
    .toLowerCase();
}

function getImageFileName(
  imageUrl,
  index
) {
  try {
    const url =
      new URL(imageUrl);

    const basename =
      path.basename(
        url.pathname
      );

    const cleanName =
      sanitizeFileName(
        basename
      );

    if (cleanName) {
      return `${cleanName}.png`;
    }
  } catch {
    // Fall through.
  }

  return `image-${String(
    index + 1
  ).padStart(
    2,
    '0'
  )}.png`;
}

async function downloadImage(
  url
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 ArticleExporter/1.0',
          Accept:
            'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Failed to download image ${url}: ` +
      `${response.status} ${response.statusText}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

async function extractImagesToLocalPngs(
  html,
  articleOutputDir
) {
  const imagesDir =
    path.join(
      articleOutputDir,
      'images'
    );

  fs.mkdirSync(
    imagesDir,
    {
      recursive: true,
    }
  );

  const imageRegex =
    /<img\s+([^>]*?)src="([^"]+)"([^>]*)>/g;

  const matches =
    [
      ...html.matchAll(
        imageRegex
      ),
    ];

  const usedNames =
    new Set();

  let updatedHtml =
    html;

  for (
    let index = 0;
    index < matches.length;
    index += 1
  ) {
    const match =
      matches[index];

    const imageUrl =
      match[2];

    if (
      !/^https?:\/\//i.test(
        imageUrl
      )
    ) {
      continue;
    }

    let filename =
      getImageFileName(
        imageUrl,
        index
      );

    const parsed =
      path.parse(
        filename
      );

    let counter = 2;

    while (
      usedNames.has(
        filename
      )
    ) {
      filename =
        `${parsed.name}-${counter}${parsed.ext}`;

      counter += 1;
    }

    usedNames.add(
      filename
    );

    const outputPath =
      path.join(
        imagesDir,
        filename
      );

    console.log(
      `Downloading: ${imageUrl}`
    );

    try {
      const inputBuffer =
        await downloadImage(
          imageUrl
        );

      await sharp(
        inputBuffer
      )
        .png()
        .toFile(
          outputPath
        );

      const localSrc =
        `./images/${filename}`;

      const originalTag =
        match[0];

      const localTag =
        `<img ${match[1]}src="${localSrc}"${match[3]}>`;

      updatedHtml =
        updatedHtml.replace(
          originalTag,
          localTag
        );

      console.log(
        `Saved: ${path.relative(
          ROOT,
          outputPath
        )}`
      );
    } catch (
      error
    ) {
      console.error(
        `Could not download ${imageUrl}`
      );

      console.error(
        error.message
      );

      console.error(
        'Keeping the original remote URL.'
      );
    }
  }

  return updatedHtml;
}

async function main() {
  const articlePaths =
    getArticlePaths();

  fs.rmSync(
    OUTPUT_DIR,
    {
      recursive: true,
      force: true,
    }
  );

  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive: true,
    }
  );

  const records = [];

  for (
    const articlePath of
    articlePaths
  ) {
    const currentRaw =
      fs.readFileSync(
        path.join(
          ROOT,
          articlePath
        ),
        'utf8'
      );

    const current =
      parseArticle(
        currentRaw
      );

    const slug =
      current.meta.slug ||
      path.basename(
        articlePath,
        '.md'
      );

    console.log('');
    console.log(
      `Processing: ${slug}`
    );

    const articleOutputDir =
      path.join(
        OUTPUT_DIR,
        slug
      );

    fs.mkdirSync(
      articleOutputDir,
      {
        recursive: true,
      }
    );

    const outputPath =
      path.join(
        articleOutputDir,
        'index.html'
      );

    let html =
      renderDocument(
        current.meta,
        current.body
      );

    verifyDocument(
      current.meta,
      current.body,
      html,
      slug
    );

    html =
      await extractImagesToLocalPngs(
        html,
        articleOutputDir
      );

    fs.writeFileSync(
      outputPath,
      html,
      'utf8'
    );

    records.push({
      slug,
      title:
        current.meta.title,
      mediumUrl:
        current.meta.mediumUrl ||
        '',
      outputPath,
    });
  }

  const missingMediumUrls =
    records.filter(
      record =>
        !record.mediumUrl
    ).length;

  const index = [
    '# Medium Article HTML',
    '',
    `- Articles: ${records.length}`,
    `- Articles without a recorded Medium URL: ${missingMediumUrls}`,
    '- Each article is stored in its own folder.',
    '- Remote images are downloaded and converted to local PNG files when possible.',
    '',
    '| Article | Medium | HTML |',
    '| --- | --- | --- |',
    ...records.map(
      record => {
        const medium =
          record.mediumUrl
            ? `[Open story](${record.mediumUrl})`
            : '**Not recorded**';

        return (
          `| ${record.title.replace(
            /\|/g,
            '\\|'
          )} | ` +
          `${medium} | ` +
          `[Open HTML](./${record.slug}/index.html) |`
        );
      }
    ),
    '',
  ].join('\n');

  fs.writeFileSync(
    path.join(
      OUTPUT_DIR,
      'index.md'
    ),
    index,
    'utf8'
  );

  console.log('');
  console.log(
    `Generated ${records.length} articles in:`
  );

  console.log(
    path.relative(
      ROOT,
      OUTPUT_DIR
    )
  );

  console.log(
    `${missingMediumUrls} articles have no recorded Medium URL.`
  );
}

main().catch(
  error => {
    console.error('');
    console.error(
      'Generation failed:'
    );

    console.error(
      error
    );

    process.exit(1);
  }
);
