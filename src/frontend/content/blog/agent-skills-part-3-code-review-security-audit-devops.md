---
seoTitle: AI Code Review and Security Audit Agent Skills
slug: agent-skills-part-3-code-review-security-audit-devops
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Security, Operations
title: Skills That Check the Work: Code Review, Security Audit, Web Audit and DevOps
subtitle: Part 3 - Open-source agent skills for AI code review, source-code security audits, website audits and DevOps setup, with evidence behind every finding.
intro: Part 3 - Open-source agent skills for AI code review, source-code security audits, website audits and DevOps setup, with evidence behind every finding.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 10 min read
---

![Agent skills Part 3 cover for code review, security audit and DevOps, with a shield, a checklist and a CI pipeline](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-part-3-code-review-security-audit-devops-header.webp)

Part 3 of 3 in **Skills We Give Our Coding Agents**. [Part 1](/blog/agent-skills-part-1-dotnet-nx-mcp-backend/) covered what an agent skill is and our back-end skills, and [Part 2](/blog/agent-skills-part-2-angular-react-native-browser-extension/) the front end. This part covers the skills that check the work.

The first two parts were about telling an agent how to build. This one is about the other half: checking that it actually built it that way, that it's safe, and that the project around it is ready for real use.

AI code reviews have a bad reputation, and mostly they earned it. They nitpick style, invent problems that aren't in the code, and call everything critical. A report with forty findings where ten are wrong is worse than no report, because someone has to read all forty to find the ten.

So the four skills here share one rule above everything else: **no finding without proof**. Every problem points to the exact file, line, header or element. Anything that can't be confirmed is reported as unknown, not as a failure.

![Where each agent skill checks the work: DevOps setup, code review and security audit on the PR, web audit live](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-where-the-checks-sit-technical-illustration-2.webp)

## ARG Code Review: a first review before a person looks

**What goes wrong without it.** A typical AI review reads the changes and comments on what it sees. It misses what isn't there: the test nobody added, the helper someone copied instead of reusing, the change that breaks other code with no warning. Those are exactly the shortcuts that make code hard to change later.

**What the skill makes the agent do.** It reviews pull requests, branches and changes in any language or framework. It works out what the project uses and applies the matching ARG skill's rules if that skill is installed, or the shared ARG rules if not. So it works for Angular, .NET, React Native, Nx, browser extensions, MCP servers and more.

It looks for what reviews usually miss: code reaching across layers, missing tests, copied helpers, unexplained numbers in the code, leaked passwords and keys, out-of-date docs, and changes that break other code without saying so. Every finding is checked against the code before it's reported, ranked by how serious it is, labelled **blocking**, **suggestion** or **question**, and comes with a file, a line and a concrete fix.

It never approves or merges anything. It only posts comments on the pull request when you ask, and on the next round it tells you which earlier findings were fixed.

**Where it fits.** The other ARG skills tell an agent how to make a change. This one checks that it was done that way. Use it as a first review before a teammate looks, or as a second opinion when you're unsure about a change. It doesn't replace the human review we describe in [the art of pull requests](/blog/the-art-of-pull-requests/); it just makes that review shorter.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-code-review
```

Full details: [ARG Code Review skill](/skills/arg-code-review/).

## ARG Security Audit: real vulnerabilities, not scary words

**What goes wrong without it.** Ask an agent for a security review and you often get a list of scary words (injection, XSS, insecure deserialization) with no proof that anyone could actually exploit them. The real problems get lost among the false alarms.

**What the skill makes the agent do.** It looks for security holes by reading the code, to defend it, not to attack it. It works in two ways. Quick questions, like "can someone abuse this route?" or "how bad is this reported bug?", get answered right in the conversation. The full process runs only when you ask for a complete audit or report.

A full audit starts by mapping the product: who uses it and what each of them is allowed to do, every way data comes in, where trusted and untrusted data meet, and the spots where bad input could do damage. Then it goes through the common kinds of attack, most serious first, and keeps a list of what it checked, so you can see the gaps instead of guessing.

![A security audit finding with who can exploit it, the missing control, safe reproduction and fix, or marked unknown](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-anatomy-of-a-finding-technical-illustration-3.webp)

Every finding is double-checked before it's reported, and only confirmed findings get a severity. If whether something can be exploited depends on how the app is deployed, and the code doesn't show that, the finding is marked as needing a check. Every finding says who could exploit it, what should have stopped them, how to reproduce it safely, and the smallest fix. The output is a `findings.json` file and a written report.

It's safe by design: the code being audited only runs in a local sandbox, and it never touches live systems. When the audit leads to fixes, the usual ARG workflow applies: fix branches, reviewed pull requests and automated checks before merging.

**Where it came from.** It applies our own rules to security work. A finding has to show someone doing something they shouldn't be allowed to do, with a result you can actually see, and an unknown is never reported as a failure. The process, with its two modes, its list of what was checked, its hunt by kind of attack and its double-checking, is inspired by Cloudflare's open-source security audit skill under the MIT licence, reorganised and rewritten for our skills. It works on APIs, services, command-line tools, libraries, browser extensions, mobile apps and MCP servers. For the bigger picture of what it looks for, the OWASP Top 10 (2025 edition) is the standard list of the most common web security risks.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-security-audit
```

Full details: [ARG Security Audit skill](/skills/arg-security-audit/).

## ARG Web Audit: a scored report for any public site

**What goes wrong without it.** Website audits tend to be either one score with no explanation or a hundred warnings in no particular order. Neither tells a developer what to fix first.

**What the skill makes the agent do.** It checks any website for security, speed, accessibility and AI readiness. That includes security headers (the settings a site sends to tell the browser what's allowed, like CSP and HSTS), cookies, Core Web Vitals (Google's measures of how fast and stable a page feels), page weight, caching, compression, third-party scripts, accessibility basics, and the files that help AI tools and search engines read the site: `robots.txt`, the sitemap, `llms.txt` and structured data.

It only uses what a browser can actually see. If something can't be seen, the check is marked unknown instead of failed, and the score reflects how much was really measured. Checks based on numbers give partial credit instead of a hard pass or fail, so a page that just misses a limit doesn't score the same as one that misses it by a mile. Every problem points to the exact files, headers or elements and comes with a fix you can hand straight to a developer.

**Where it came from.** It's the method behind ARG Architect, the browser extension we covered in [Part 2](/blog/agent-skills-part-2-angular-react-native-browser-extension/), which scores any website in one click. It only looks at what a normal visit shows and never sends attacks, so it's safe to run on any public site: your own app before a release, or a competitor's site to compare.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-web-audit
```

Full details: [ARG Web Audit skill](/skills/arg-web-audit/).

## ARG DevOps Setup: the basics every ARG project runs on

**What goes wrong without it.** Every skill in this series assumes a project has the basics: automated checks before merging, reviewed pull requests, numbered releases, and passwords kept out of the code. Many projects, especially older ones, only have some of that. Ask an agent to "set up CI" and it may overwrite the setup the team already relies on.

**What the skill makes the agent do.** It works out what the project uses (Node and TypeScript, Nx, .NET, Python, Go or Rust) and shows a table of what's already there, what's half there and what's missing, before changing anything.

Then it adds only what's missing: automated checks on every pull request, including one for the title; protection on the main branch; squash merges; a pull request template and a `CODEOWNERS` file; automatic releases with release-please; automatic dependency updates with Dependabot; an `AGENTS.md` file with rules for coding agents; safe handling of `.env` secrets; a shared helpers folder; and architecture tests. What's already there gets extended, never overwritten. Everything goes on one branch, and branch rules, secrets, pushes and the pull request each wait for your approval. It never merges.

If you want, it can also set up a local environment with Docker Compose: the database your app uses, Prometheus and Grafana to chart the app's metrics, and Portainer to see what's running. If you want to go further with metrics and traces, our guide to [debugging slow microservices with Prometheus and OpenTelemetry](/blog/debug-microservices-prometheus-opentelemetry/) picks up from there.

**Where it fits.** The other skills describe what a project needs. This one puts it in place on an existing project without breaking what the team relies on, so the project is ready for real work, and for coding agents, from the next pull request.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-devops-setup
```

Full details: [ARG DevOps Setup skill](/skills/arg-devops-setup/).

## The full loop

Across the three parts, the ten skills form one loop. The build skills from Parts 1 and 2 tell the agent how to make a change. DevOps Setup makes sure the project can take that change safely. Code Review and Security Audit check the pull request before it's merged. Web Audit checks what actually reached your users.

Every step relies on proof, not opinion, and every step leaves the final call to a person. That's the standard we hold our own engineers to, and it's the one we want our agents to follow. If you want a person to look at your system the same way, that's what our [architecture review](/audit/architecture-review/) is for.

All ten skills are open source, MIT-licensed and installable with one command:

```bash
npx skills add ARG-Software/arg-agent-skills
```

Browse them all on the [skills page](/skills/).

## FAQ

- **Can an AI agent do code review?** Yes, as a first pass. The ARG Code Review skill checks every finding against the code, ranks it by how serious it is, labels it blocking, suggestion or question, and gives a file, a line and a fix. It never approves or merges, so a person still makes the call.
- **Is an AI security audit safe to run?** The ARG Security Audit skill only reads source code and runs the code being audited in a local sandbox. It never touches live systems, and anything it can't confirm is marked as needing a check instead of reported as a vulnerability.
- **What does a website audit check for AI readiness?** The ARG Web Audit skill checks `robots.txt`, the sitemap, `llms.txt` and structured data, alongside security headers, Core Web Vitals, caching, page weight and accessibility basics.
- **Will the DevOps skill overwrite my existing CI?** No. It first shows what the project already has, extends existing CI and release tools instead of replacing them, puts every change on one branch, and waits for your approval before pushing or opening the pull request.

## Sources

- [OWASP: OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Agent Skills: Overview](https://agentskills.io/)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
