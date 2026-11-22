# Article prompt: local AI on a laptop with no GPU

Data source: Google Search Console, 90 days to November 18, 2026 (`npm run seo:gsc`).
Fill the `[TODO]` items and paste the benchmark CSV before using it.

````markdown
You are writing a blog post for arg.software, the website of ARG Software, an architecture-first
software engineering company in Portugal. The audience is working developers and CTOs. Tone:
practical, direct, first-person from an engineer who actually ran the tests. No hype, no filler,
no emojis, no double hyphens in prose.

## Goal

Write the article: "Can a Normal Laptop Run AI? I Benchmarked Local LLMs on a 4-Year-Old i7 with No GPU".
It must answer, with measured data, the question most readers really have: "Will local AI run on
MY ordinary laptop, and is it usable?"

## Hard rule: no invented data

Every number (tokens/s, time to first token, RAM, battery drain, quality verdicts) must come from
the benchmark results I paste below. If a result is missing, write `[TODO: measure X]` in its place.
Never estimate, round up, or fill gaps from memory or other blogs. Community or third-party numbers
may appear only in a clearly labelled "for comparison" note, with a link to the source.

## Test machine (state this exactly in the article)

- CPU: Intel Core i7-1165G7 (11th gen, 4 cores / 8 threads)
- RAM: 16 GB LPDDR4x at 4267 MT/s (shared with the integrated GPU)
- GPU: Intel Iris Xe (integrated only, no dedicated graphics card)
- OS: Windows 11
- Runtimes: [TODO: Ollama version], [TODO: llama.cpp build + version, CPU and Vulkan]

## Benchmark results

[PASTE CSV / TABLES HERE: model, parameters, quantization, runtime, backend (CPU / Vulkan iGPU),
power state (plugged / battery), context size, prompt tokens, generated tokens,
time to first token, tokens/s, peak RAM, battery % per hour, usability grade per task]

## Structure

1. Cover image line: `![descriptive alt](/images/blog/[TODO-folder]/[slug]-header.webp)`
2. Intro (3-4 short paragraphs): the question, why most benchmarks use GPUs/Macs that readers
   don't have, what machine I used, and a one-sentence spoiler of the verdict.
3. `## The test setup`: hardware, runtimes, models, quantization, prompts, number of runs,
   how each metric was measured (Ollama `eval_count`/`eval_duration` or `llama-bench`,
   Task Manager / `powercfg /batteryreport`). Link the companion repo with the script and raw data:
   [TODO: ARG GitHub repo URL].
4. `## Which models are usable on a laptop without a GPU`: the main table (model size ladder,
   roughly 1B, 3-4B, 7-8B, 12-14B at Q4_K_M) plus a short read of the results.
5. `## Does quantization matter? Q4 vs Q5 vs Q8`: same model, speed / RAM / visible quality.
6. `## Can Intel Iris Xe integrated graphics speed it up?`: CPU vs Vulkan backend results.
   Report whatever happened, including "it didn't help".
7. `## Running AI on battery: speed and battery life`: plugged vs battery, drain per hour.
8. `## Is it actually usable? Coding vs chat vs summaries`: verdict table
   (usable / slow but OK / not worth it) per model per task, with 1-2 real output examples.
9. `## Local vs cloud: when a laptop is enough`: privacy, cost, speed trade-off. Cloud prices only
   from the providers' official pricing pages, with the date checked.
10. `## My recommendation by laptop`: short, concrete picks for 8 GB, 16 GB and 32 GB RAM machines
    based only on what was measured (mark 8 GB / 32 GB as extrapolated and explain why).
11. `## FAQ`: 4 questions phrased as people search them, format `- **Question?** Answer.`,
    answers only summarise the article. Use: "Can I run AI locally on a laptop without a GPU?",
    "How much RAM do I need to run a local LLM?", "Does local AI drain laptop battery?",
    "Can ChatGPT run locally?" (answer: no, but open models like [the ones tested] can).
12. `## Sources`: format `- [Publisher: Page title](url)`. Primary sources only: Ollama docs,
    llama.cpp README / llama-bench / quantization docs, Hugging Face model cards, licence texts,
    Intel spec page for the i7-1165G7, official cloud pricing pages, the ARG companion repo.
    No generic homepages, no Medium links, no blogs repeating other blogs.

## Internal links (2-3, as `[text](/blog/{slug}/)`)

- /blog/running-ai-locally-complete-guide/ (the hub guide: link to it early and from the recommendation)
- /blog/the-ai-big-lie-you-dont-need-32-gb-of-ram-for-vector-search-anymore/
- /blog/stop-hitting-claude-usage-limits/ (in the local vs cloud section)

## SEO

Target only keywords the article really covers (they come from Google Search Console):
- Primary: "run AI locally on a laptop without GPU" / "running AI models on CPU-only laptop"
- Secondary: "can I run AI locally", "best way to run local AI on a laptop without killing battery life",
  "local LLM RAM requirements", "Intel Iris Xe LLM"
Use the primary keyword in `seoTitle`, the first paragraph, and one H2. Don't keyword-stuff.

## Output

A single Markdown file with this frontmatter (copy author fields from an existing ARG post):

---
seoTitle: [primary keyword first, max 60 characters]
slug: [short kebab-case slug, e.g. run-ai-locally-laptop-no-gpu-benchmark]
author: José Antunes
authorUrl: [TODO]
authorType: Person
authorSameAs: [TODO]
tag: AI
tags: AI, Engineering Culture
title: [full article title]
subtitle: [meta description, ~150 characters, primary + one secondary keyword]
intro: [same as subtitle]
date: [Month D, YYYY]
dateModified: [same as date]
reviewedOn: [same as date]
readTime: [N min read]
---

Inline formatting only: **bold**, `code`, [text](url). No raw HTML. Tables in Markdown.
After the article, list every `[TODO]` you left so I can fill it in.
````
