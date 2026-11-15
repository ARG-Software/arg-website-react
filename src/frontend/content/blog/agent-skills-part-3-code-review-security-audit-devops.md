---
seoTitle: AI Code Review and Security Audit Agent Skills
slug: agent-skills-part-3-code-review-security-audit-devops
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Security, DevOps
title: Part 3: Skills That Check the Work: Code Review, Security Audit, Web Audit and DevOps
subtitle: Open-source agent skills for AI code review, source-code security audits, website audits and DevOps setup, with evidence behind every finding.
intro: Open-source agent skills for AI code review, source-code security audits, website audits and DevOps setup, with evidence behind every finding.
date: November 15, 2026
dateModified: November 15, 2026
reviewedOn: November 15, 2026
readTime: 10 min read
---

![Agent skills Part 3 cover for code review, security audit and DevOps, with a shield, a checklist and a CI pipeline](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-part-3-code-review-security-audit-devops-header.webp)

Part 3 of 3 in **Skills We Give Our Coding Agents**. [Part 1](/blog/agent-skills-part-1-dotnet-nx-mcp-backend/) covered what an agent skill is and our back-end skills, and [Part 2](/blog/agent-skills-part-2-angular-react-native-browser-extension/) the front end. This part covers the skills that check the work.

The first two parts were about telling an agent how to build. This one is about the other half of the job: checking that it was built that way, that it is safe, and that the repository around it is ready for production.

AI reviews have a reputation problem, and it is mostly earned. They flag style nits, invent issues that are not in the code, and mark everything as critical. A report with forty findings where ten are wrong is worse than no report, because someone has to read all forty to find out which ten.

So the four skills in this part share one rule above all others: **no finding without evidence**. Every problem names the file, the line, the header or the element, and anything that cannot be confirmed is reported as unknown rather than failed.

![Where each agent skill checks the work: DevOps setup, code review and security audit on the PR, web audit live](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-where-the-checks-sit-technical-illustration-2.webp)

## ARG Code Review: the reviewer's side of the base

**What goes wrong without it.** Generic AI reviews read the diff and comment on what they see. They miss what is not there: the architecture test nobody added, the helper copied instead of reused, the breaking change with no note. Those are exactly the shortcuts that make a codebase hard to change later.

**What the skill makes the agent do.** It reviews pull requests, branches and diffs in any stack. It detects the stack and applies the matching ARG skill's rules when that skill is installed, and the shared ARG rules otherwise, so it works for Angular, .NET, React Native, Nx, browser extensions, MCP servers and more.

It checks what reviews often miss: layer boundaries, missing architecture tests, copied helpers, magic numbers, missing tests, leaked secrets, outdated documentation and unmarked breaking changes. Every finding is verified against the code before it is reported, ranked by severity, labelled **blocking**, **suggestion** or **question**, and given a file, a line and a concrete fix.

It never approves or merges. It posts comments on the pull request only when you ask, and on later rounds it reports which earlier findings were resolved.

**Where it fits.** The other ARG skills tell an agent how to make a change. This one checks that the change was made that way. Use it as a first review before a teammate looks, or as a second opinion on a change you are unsure about. It does not replace the human review we describe in [the art of pull requests](/blog/the-art-of-pull-requests/); it makes that review shorter.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-code-review
```

Full details: [ARG Code Review skill](/skills/arg-code-review/).

## ARG Security Audit: findings with a real trust boundary

**What goes wrong without it.** Point an agent at a repository and ask for a security review, and you often get a list of scary words: injection, XSS, insecure deserialization, with no proof that any of it is reachable. Real issues hide among the false alarms.

**What the skill makes the agent do.** It finds vulnerabilities by reading the source, defensively. It works in two modes. Focused questions, such as whether a route is exploitable or how to triage a reported vulnerability, are answered directly in the conversation. The full workflow runs only when you ask for a complete audit or report.

A full audit maps the product first: its users and their permissions, every entry point, the trust boundaries and the dangerous sinks. It then hunts by attack class in priority order and records what was checked in a coverage ledger, so gaps are visible instead of hidden.

![A security audit finding with who can exploit it, the missing control, safe reproduction and fix, or marked unknown](/images/blog/agent-skills-part-3-code-review-security-audit-devops/agent-skills-anatomy-of-a-finding-technical-illustration-3.webp)

Findings are verified independently before they are reported. Only confirmed findings get a severity. When exploitability depends on a deployment fact the code does not show, the finding is marked as needing validation. Every finding names who can exploit it, which control should have stopped them, how to reproduce it safely, and the smallest fix. The output is a validated `findings.json` and a report.

It is safe by design: target code runs only in a local sandbox, and deployed systems are never probed. When the audit leads to fixes, the usual ARG workflow applies, with fix branches, reviewed pull requests and CI before merge.

**Where it came from.** It applies our own rules to security work: a finding needs a real trust boundary and an observed result, and an unknown is never reported as a failure. The workflow, with its two modes, coverage ledger, attack-class hunting and independent verification, is inspired by Cloudflare's open-source security audit skill under the MIT licence, reorganised and rewritten for the ARG base. It works on APIs, services, CLIs, libraries, browser extensions, mobile apps and MCP servers. For the wider landscape of risks it hunts for, the OWASP Top 10 (2025 edition) is the standard reference.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-security-audit
```

Full details: [ARG Security Audit skill](/skills/arg-security-audit/).

## ARG Web Audit: a scored report for any public site

**What goes wrong without it.** Website audits tend to be either a single score with no explanation or a hundred warnings with no priority. Neither tells a developer what to fix first.

**What the skill makes the agent do.** It audits any website for security, performance, accessibility and AI readiness. The checks cover security headers (CSP, HSTS, cookies, CORS), Core Web Vitals (LCP, CLS, TBT), page weight, caching, compression, third-party dependencies, accessibility basics, and AI readiness signals such as `robots.txt`, the sitemap, `llms.txt` and structured data.

Only evidence a browser can observe is used. When something cannot be observed, the check is marked unknown instead of failed, and scores reflect how much was actually measured. Numeric checks earn graded credit instead of a pass or fail cliff, so a page just past a threshold is not scored the same as one far beyond it. Every problem names the offending files, headers or elements and comes with a recommendation you can hand straight to a developer.

**Where it came from.** This is the method behind ARG Architect, the browser extension we covered in [Part 2](/blog/agent-skills-part-2-angular-react-native-browser-extension/), which scores any website in one click. It only observes what a normal visit shows and never sends attack payloads, so it is safe to run on any public site: your own app before a release, or a competitor's site as a benchmark.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-web-audit
```

Full details: [ARG Web Audit skill](/skills/arg-web-audit/).

## ARG DevOps Setup: the pipeline every ARG project runs on

**What goes wrong without it.** Every skill in this series assumes a delivery pipeline: CI before merge, reviewed pull requests, versioned releases, secrets out of git. Many repositories, especially older ones, have only some of that. Ask an agent to "set up CI" and it may overwrite the workflow the team already depends on.

**What the skill makes the agent do.** It detects the stack (Node and TypeScript, Nx, .NET, Python, Go or Rust) and shows a table of what the repository already has, what is partly there and what is missing, before changing anything.

Then it adds only the missing pieces: CI with a verify job and a pull request title check, a ruleset protecting the default branch, squash merges, a PR template and `CODEOWNERS`, release-please, Dependabot, an `AGENTS.md` for every coding agent, `.env` handling, a lib folder and architecture tests. Existing CI, agent rules and release tooling are extended, never overwritten. Everything goes on one setup branch, and rulesets, secrets, pushes and the pull request each wait for your approval. It never merges.

An optional local stack runs in Docker Compose: the database the app uses, Prometheus and Grafana watching the app's `/metrics` endpoint, and Portainer to see the running containers. If you want to go further with metrics and traces, our guide to [debugging slow microservices with Prometheus and OpenTelemetry](/blog/debug-microservices-prometheus-opentelemetry/) picks up from there.

**Where it fits.** The other skills describe what a project needs. This one puts it in place on an existing repository without breaking what the team relies on, so the project is ready for production work, and for coding agents, from the next pull request.

```bash
npx skills add ARG-Software/arg-agent-skills --skill arg-devops-setup
```

Full details: [ARG DevOps Setup skill](/skills/arg-devops-setup/).

## The full loop

Across the three parts, the ten skills form one loop. The build skills from Parts 1 and 2 tell the agent how to make a change. DevOps Setup makes sure the repository can carry that change safely. Code Review and Security Audit check the pull request before it merges. Web Audit checks what actually reached users.

Each step uses evidence, not opinion, and each one leaves the final decision with a person. That is the standard we hold our own engineers to, and it is the one we want our agents to follow. If you want a person to look at your system with the same lens, that is what our [architecture review](/audit/architecture-review/) is for.

All ten skills are open source, MIT-licensed and installable in one command:

```bash
npx skills add ARG-Software/arg-agent-skills
```

Browse them all on the [skills page](/skills/).

## FAQ

- **Can an AI agent do code review?** Yes, as a first pass. The ARG Code Review skill verifies every finding against the code, ranks it by severity, labels it blocking, suggestion or question, and gives a file, a line and a fix. It never approves or merges, so a person still makes the call.
- **Is an AI security audit safe to run?** The ARG Security Audit skill only reads source code and runs target code in a local sandbox. It never probes deployed systems, and anything it cannot confirm is marked as needing validation instead of reported as a vulnerability.
- **What does a website audit check for AI readiness?** The ARG Web Audit skill checks `robots.txt`, the sitemap, `llms.txt` and structured data, alongside security headers, Core Web Vitals, caching, page weight and accessibility basics.
- **Will the DevOps skill overwrite my existing CI?** No. It shows what the repository already has first, extends existing CI and release tooling instead of replacing it, puts every change on one setup branch and waits for your approval before pushing or opening the pull request.

## Sources

- [OWASP: OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Agent Skills: Overview](https://agentskills.io/)
- [ARG Software: arg-agent-skills](https://github.com/ARG-Software/arg-agent-skills)
