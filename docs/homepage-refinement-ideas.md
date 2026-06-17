# Homepage Refinement Ideas

Reference notes from the discarded `feature/awwwards-visual-direction` branch. These are not applied to the site. Use this file to compare what may be worth reintroducing later.

## Context

The experimental branch moved too far toward a generic premium/template direction. The pieces below are the only parts worth reconsidering: subtle hero atmosphere, sharper copy in selected areas, and one real layout bug fix.

## Hero Visual

The subtle red/violet overlay on top of the video was the strongest visual addition. It preserved the existing hero structure while adding depth and brand warmth.

```css
/* Subtle hero video overlay */
.hero_wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(12, 0, 46, 0.06), rgba(12, 0, 46, 0.34)),
    radial-gradient(circle at 52% 42%, rgba(240, 6, 13, 0.1), transparent 34%);
  pointer-events: none;
}

.hero_contain.container.padding-global {
  position: relative;
  z-index: 1;
}
```

Optional supporting refinements:

```css
.hero_heading.heading-style-h1 {
  letter-spacing: -0.045em;
}

.hero_heading .heading_text,
.hero_heading .text-color-gradiant {
  text-wrap: balance;
}

.hero_bottom_paragraph {
  color: rgba(255, 255, 255, 0.78);
  line-height: var(--line-body);
}

@media screen and (max-width: 767px) {
  .hero_heading.heading-style-h1 {
    letter-spacing: -0.035em;
  }
}
```

Keep if: it improves contrast and atmosphere without making the hero feel heavier.

Avoid if: it darkens the video too much or reduces the original refinement.

## Hero Copy

Original:

```text
Building digital solutions
that grow with you

Your partner in creating scalable, reliable solutions
```

Alternative tried:

```text
Building software systems
that hold up as you scale

Product engineering for fintech, media and high-growth teams where reliability matters.
```

CTA alternatives tried:

```text
Share a challenge
Write to us
Start a build
Talk to the team
```

Keep if: the site should sound more engineering-led and less agency-led.

Avoid if: the original phrasing feels more elegant in the hero composition.

## About Copy

Original highlight:

```text
endless potential
```

Alternative highlight:

```text
built to endure
```

Alternative paragraph:

```text
ARG builds digital products with the discipline needed after launch: the moment traffic grows, teams change, integrations multiply and every shortcut starts to surface. We pair product judgement with technical rigour so your software is ready for where the business is going, not just where it is today.
```

Alternative principles:

```text
Architecture before acceleration.
Clean code as a product decision.
Partnership beyond the first release.
```

Optional editorial styling:

```css
.about_heading .heading-style-h2 {
  text-wrap: balance;
}

.about_paragraph {
  max-width: 42rem;
}

.about_paragraph p:first-child {
  margin-bottom: 2rem;
}

.about_paragraph p:not(:first-child) {
  position: relative;
  margin-top: 0.55rem;
  margin-bottom: 0.55rem;
  padding-left: 1.1rem;
  color: #0c002e;
  font-size: var(--type-body-small);
  line-height: var(--line-body);
}

.about_paragraph p:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 0.45rem;
  height: 1px;
  background: linear-gradient(90deg, #f0060d, #7904fd);
}
```

Keep if: we want the About section to communicate engineering discipline more clearly.

Avoid if: the bullets start feeling like a generic values list.

## Services Copy Options

The services copy can be made more precise without changing layout.

Suggested infinity band:

```text
Custom Software
Product Engineering
Cloud Infrastructure
Prototyping
Automation
MVP Delivery
Backend Systems
Frontend Applications
```

Example service copy direction:

```text
Product Discovery + Prototyping
We turn rough product ideas into a technical plan the team can actually build from. That means clarifying users, workflows, constraints and risks before committing to architecture, scope and delivery.

MVP Launch
We help you ship a first version without confusing speed with shortcuts. The focus stays on the features that validate the product, the architecture that will not block the next phase and the feedback loops that matter after launch.

Backend Development
The parts users do not see decide how far the product can go. We design APIs, databases, integrations and background systems with reliability, observability and future change in mind.
```

Keep if: the current services copy feels too playful or generic.

Avoid if: changing all service copy makes the page feel too dry.

## Other Homepage Copy Options

Projects heading:

```text
Selected systems. Built to last.
Selected Work
```

Work stats heading and paragraph:

```text
Built for the long run

We work in the parts of a product that keep showing up after launch: architecture, delivery, reliability and iteration. The goal is fewer surprises, clearer decisions and software that does not need to be rewritten when the business grows.
```

Team heading and paragraph:

```text
Small team, senior ownership

You work directly with the people designing and building the system. No layers, no handoffs, no blurred accountability.
```

Social heading:

```text
Notes from outside our website
```

Contact CTA:

```text
Have something to build?
Let's make it resilient

Tell us what has to work, scale or recover. We will help you shape the next move.

View our work
Open portfolio
Start a conversation
2 minutes
```

Keep selectively. A full copy pass risks flattening the existing personality.

## Layout Bug To Keep

The project grid had a real selector issue in the experimental work review.

Problem pattern:

```css
.projects_item_wrap:nth-child(1n) { ... }
.projects_item_wrap:nth-child(2n) { ... }
.projects_item_wrap:nth-child(3n) { ... }
.projects_item_wrap:nth-child(4n) { ... }
.projects_item_wrap:nth-child(5n) { ... }
.projects_item_wrap:nth-child(6n) { ... }
```

Why it is risky:

```text
1n matches every project.
2n matches the 2nd, 4th, 6th, etc.
3n matches the 3rd, 6th, etc.
The 6th project can inherit multiple layout positions and overlap earlier projects.
```

Safer pattern:

```css
.projects_item_wrap:nth-child(1) { ... }
.projects_item_wrap:nth-child(2) { ... }
.projects_item_wrap:nth-child(3) { ... }
.projects_item_wrap:nth-child(4) { ... }
.projects_item_wrap:nth-child(5) { ... }
.projects_item_wrap:nth-child(6) { ... }
```

This is not an aesthetic experiment. If the issue exists on `preview`, it should be fixed independently.

## Avoid

Avoid these from the discarded branch:

- Glassmorphism hero panels.
- SaaS-style status cards.
- Large generic premium/Awwwards blocks.
- Replacing the homepage composition instead of refining it.
- Copy changes that make ARG sound like any other agency.

## Awwwards Direction Note

Copy can reduce template smell, but it will not win Awwwards by itself. The real work should be art direction, interaction, motion, project storytelling, performance and precision of execution.

## Future Social Feed Direction

The homepage currently uses Elfsight for the LinkedIn/social feed. It works for now, but styling and layout control are limited because the embed owns the rendered markup.

Future replacement direction:

- Build an ARG-owned `SocialFeed`/`SocialPostCard` UI and render from local JSON, e.g. `src/data/socialPosts.json`.
- Keep the data shape source-agnostic so the frontend does not care whether posts are curated manually or synced automatically.
- Use Buffer as the likely automation source instead of LinkedIn directly, since ARG already posts through Buffer and Buffer exposes an API for sent posts.
- Add a future GitHub Actions workflow that fetches sent LinkedIn-channel posts from Buffer weekly and updates the JSON through a PR.
- Required GitHub secrets would likely be `BUFFER_API_KEY`, `BUFFER_ORGANIZATION_ID`, and `BUFFER_LINKEDIN_CHANNEL_ID`.
- Keep Elfsight until the current subscription/time window makes sense to replace.

Preferred future flow:

```text
Buffer LinkedIn post
-> scheduled GitHub Action
-> Buffer API fetches sent posts
-> normalize into src/data/socialPosts.json
-> custom ARG-styled React cards render the feed
```

Avoid scraping LinkedIn directly. It is brittle, likely blocked, and not worth building around.
