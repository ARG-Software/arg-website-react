# Arg Architect content plan

Status: planned 2026-11-28, nothing published yet. Update the tracker at the end as posts ship.

Goal: bring in leads for ARG by showing Arg Architect (the free audit browser extension, launch post `/blog/website-audit-browser-extension/`) at work on sites everyone knows, and by explaining how it differs from other audit tools.

Every post follows `docs/content-guide.md` (frontmatter, keyword rule, `## Sources`, cover, checks, ingest).

---

## Track 1: Audits of famous sites

One site per post. Each famous name gets its own search entry, and the series gives a steady flow of posts. A roundup comes at the end.

### Order

| # | Site | Slug |
|---|---|---|
| 1 | chatgpt.com / openai.com | `openai-website-audit` |
| 2 | instagram.com | `instagram-website-audit` |
| 3 | whatsapp.com | `whatsapp-website-audit` |
| 4 | x.com | `x-website-audit` |
| 5 | claude.ai / anthropic.com | `claude-website-audit` |
| 6 | youtube.com | `youtube-website-audit` |
| 7 | netflix.com | `netflix-website-audit` |
| 8 | amazon.com | `amazon-website-audit` |
| 9 | spotify.com | `spotify-website-audit` |
| 10 | linkedin.com | `linkedin-website-audit` |
| 11 | tiktok.com | `tiktok-website-audit` |
| 12 | gemini.google.com | `gemini-website-audit` |
| — | Roundup: "We audited the biggest sites on the web" | `famous-websites-audit-results` |

### How each audit is made

1. José runs Arg Architect on the site's public homepage (logged out, desktop, a clean browser profile) and sends the report and screenshots.
2. Record the date and the extension version. Results are a snapshot of that day.
3. Claude writes the post from the report. Nothing in the post goes beyond what the report shows.

### Post structure

- **Title:** a hook with the name, e.g. "We Audited ChatGPT's Website. Here's How It Scored." `seoTitle`: "{Site} Website Audit: Security, Speed and AI Readiness".
- **Intro:** why this site, and a reminder that the audit is free and runs locally.
- **Score card:** a screenshot plus a table of the five scores (security, performance, efficiency, accessibility, AI readiness).
- **3–5 findings:** the most surprising ones, in plain words, each with why it matters.
- **What your site can learn:** practical takeaways for a smaller team.
- **Method box:** the date, the version, the page and the conditions.
- **FAQ**, then CTAs: install the extension, and book a review with ARG.
- **Tags:** `Security, Frontend` (plus `AI` when the AI-readiness findings lead the post).
- **Links:** to the launch post, the matching comparison post once it exists, and the other audits.

### Rules

- **Security:** only publicly visible facts (headers, cookies, TLS, exposed metadata). Never anything that works as a recipe for attacking the site.
- **Tone:** neutral and fair. Mention what the site does well, not only the failures.
- **Re-audits:** a re-audit updates `dateModified` and keeps the old scores in a short "What changed" note.

---

## Track 2: Arg Architect vs other tools

Only the apps are compared: purpose, checks, setup, privacy and when to use each. We do not run both tools on sites for these posts.

### Order

| # | Compared with | Slug |
|---|---|---|
| 1 | Lighthouse (covers PageSpeed Insights, which runs Lighthouse) | `arg-architect-vs-lighthouse` |
| 2 | GTmetrix | `arg-architect-vs-gtmetrix` |
| 3 | WebPageTest | `arg-architect-vs-webpagetest` |
| 4 | Mozilla Observatory and securityheaders.com | `arg-architect-vs-mozilla-observatory` |
| 5 | WAVE and axe DevTools | `arg-architect-vs-wave-axe` |
| — | Roundup: "Best free website audit tools" | `free-website-audit-tools` |

### Post structure

- **What each tool is for:** who it's built for and where it runs (extension, DevTools, web app, CLI).
- **Feature table:** checks covered side by side (security, performance, efficiency, accessibility, AI readiness, reports, history).
- **What only one of them does:** stated honestly on both sides.
- **Setup and privacy:** account needed or not, and whether data leaves the device.
- **When to use which:** including the cases where the other tool is the better choice.
- **FAQ**, CTAs, and `## Sources` with each competitor's official docs. Check every claim about a competitor against those docs on the day of writing.
- **Tags:** `Frontend, Security`.

---

## Schedule

One post a week. Two audits, then one comparison: audit, audit, comparison. Start with `openai-website-audit`, then `instagram-website-audit`, then `arg-architect-vs-lighthouse`.

## Tracker

| Post | Status | Published |
|---|---|---|
| openai-website-audit | waiting for the audit report | |
| instagram-website-audit | waiting for the audit report | |
| arg-architect-vs-lighthouse | ready to outline | |
