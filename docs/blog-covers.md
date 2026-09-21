# Blog cover images

Website covers are **2560×1440 WebP** on each post’s existing `/images/blog/.../*-header.webp` path. Medium featured images are **PNG** in `external/html/medium-updates/batch-3-vector-search/covers/{slug}.png`.

There is no cover pipeline. Convert a new PNG to WebP yourself (e.g. Squoosh, or `npx sharp-cli`), drop the WebP on the post header path, and copy the PNG into the Medium `covers/` folder.

## ChatGPT prompt

Paste one batch at a time. Caption each image with the exact `FILENAME` for Save As. Do not draw the filename on the artwork.

```
Generate a SEPARATE image for EACH numbered item. Do not combine them.
Caption each image with the exact FILENAME (for Save As). Do NOT draw the filename on the artwork.

GLOBAL STYLE:
2560x1440, 16:9, Swiss / Bauhaus print poster: strong grid, flat geometry, bold type.
NOT architecture: no buildings, no floorplans, no compass, no columns, no city.
Software objects + logos only.
COLOR LOCK: large dark blue #0c002e field (~40%+), plus #f0060d #c924d7 #7904fd, cream #f4f1ea for small type only. No other hues.
No photoreal, no people, no laptops.
Logos and short tech words required, spelled correctly.
Each poster: different composition.

1. FILENAME: {slug}.png
   {topic line with required logos/words}
```

ARG colors: ink `#0c002e`, red `#f0060d`, magenta `#c924d7`, violet `#7904fd`, cream `#f4f1ea`.

## New post

1. Generate `{slug}.png` at 16:9 with the prompt above.
2. Convert to 2560×1440 WebP and save as the markdown cover path (`![descriptive alt](/images/blog/.../header.webp)`).
3. Copy the PNG to `external/html/medium-updates/batch-3-vector-search/covers/{slug}.png`.
4. Use a descriptive cover alt (the topic, not a poetic title).
5. On Medium, replace the story’s featured image with that PNG.
