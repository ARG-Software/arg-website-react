# Article Review Backlog

This file captures the remaining article-review work and Medium handoff requirements.

## Rules

- Do not commit, push, merge, or create PRs without explicit user authorization.
- Preserve links to ARG-owned companion repositories.
- Preserve solid, article-specific citations when they support corrected claims.
- Do not restore generic product-homepage links such as Node.js, TypeScript, React, Angular, or similar vendor homepages unless they are directly needed as a citation.
- Do not restore Medium signup, byline, publication, or promotional links.
- Keep `dateModified` for SEO and `reviewedOn` for visible article headers.
- Keep Medium synchronization manual until website changes are reviewed and approved.

## Reviewed

These are treated as reviewed work across the active article branches, even if not all are merged into `main` yet. User approval and Medium synchronization remain pending until the complete review set is presented.

- `nx-nestjs-monorepo-boilerplate.md`
- `angular-5-to-19-migration.md`
- `chrome-extension-react-vite.md`
- `enforce-clean-architecture-typescript.md`
- `from-anemic-models-to-behaviour-rich-aggregates-behavior-driven-design-in-typescript.md`
- `functional-error-handling-typescript-result-pattern.md`
- `pure-typescript-ddd-achieving-true-persistence-ignorance-with-mikroorm.md`
- `stop-using-any-a-practical-migration-plan-for-legacy-typescript-apps.md`
- `typescript-dependency-injection-without-framework.md`
- `typescript-rewritten-in-go.md`
- `pragmatic-clean-architecture-aspnet-core.md`
- `goodbye-docker-desktop-wsl2.md`
- `local-kubernetes-nestjs-postgresql.md`
- `dependency-injection-anti-patterns-aspnet-core.md`
- `circuit-breaker-pattern-aspnet-core.md`
- `running-ai-locally-complete-guide.md`
- `clinejection-github-issue-supply-chain-attack.md`
- `cqrs-without-mediatr.md`
- `testcontainers-best-practices.md`
- `stop-hitting-claude-usage-limits.md`
- `api-architecture-styles-every-developer-should-know.md`
- `api-versioning-in-net-10-minimal-apis-a-practical-production-ready-guide.md`
- `debug-microservices-prometheus-opentelemetry.md`
- `datetime-mistakes-that-are-silently-breaking-your-csharp-app.md`
- `how-to-log-complex-systems-like-a-senior-backend-engineer.md`
- `stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee.md`
- `the-ai-big-lie-you-dont-need-32-gb-of-ram-for-vector-search-anymore.md`
- `adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis.md`
- `why-your-jwt-implementation-probably-breaks.md`
- `the-stack-nobody-hypes-but-serious-ctos-keep-choosing.md`
- `building-gaspar-part-1-we-built-an-ai-assistant-that-sells-heres-the-architecture.md`
- `building-gaspar-part-2-three-llm-calls-per-question-a-rag-pipeline-that-knows-what-its-doing.md`
- `building-gaspar-part-3-the-knowledge-design-behind-a-business-ai-assistant-that-doesnt-guess.md`
- `building-gaspar-part-4-guardrails-as-architecture-how-we-stopped-our-chatbot-from-lying-about-us.md`
- `building-gaspar-part-5-keeping-an-ai-assistant-online-affordable-and-actually-useful.md`
- `ai-architectural-changes-nobody-wants.md`
- `the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn.md`
- `the-most-important-decision-in-web3-isnt-what-you-put-on-chain-its-what-you-dont.md`
- `the-code-review-collapse-surviving-the-ai-tsunami.md`
- `why-software-engineering-fundamentals-still-win-in-the-age-of-ai.md`
- `the-word-sabotaging-your-engineering-team.md`
- `ai-doesnt-replace-talent-it-exposes-it.md`
- `the-art-of-pull-requests.md`
- `stop-worrying-embrace-chaos.md`

## Remaining Articles To Review

None. All articles in this review programme have received a correction pass. The combined changes still require user review before commit, publication, or Medium synchronization.

## Repository Link Restoration

The following ARG-owned companion repository links were restored or verified in the active review changes:

- `angular-5-to-19-migration.md`: `https://github.com/ARG-Software/Angular-Redux`
- `chrome-extension-react-vite.md`: `https://github.com/ARG-Software/Chrome-Extension-ReactVite-Boilerplate`
- `pragmatic-clean-architecture-aspnet-core.md`: `https://github.com/ARG-Software/Clean-Architecture`
- `local-kubernetes-nestjs-postgresql.md`: `https://github.com/ARG-Software/Kubernetes-Poc`
- `nx-nestjs-monorepo-boilerplate.md`: `https://github.com/ARG-Software/Nx-Monorepo-Boilerplate`

## Medium Replacement Deliverables

At the end of each approved article batch, create Medium handoff files that contain only the corrected sections that need manual replacement on Medium.

Suggested location:

```text
docs/medium-replacements/<batch-name>/
```

Suggested files per article:

- `<slug>.html`: HTML snippets for the corrected sections, ready to paste into Medium with links preserved.
- `<slug>.md`: Markdown source for the same snippets, useful for review and diffing.
- `<slug>.notes.md`: short checklist of changed sections, links restored, and any Medium-only formatting caveats.

The replacement files should not include unchanged article text. They should focus on the corrected paragraphs, lists, headings, and code blocks that need to replace content in Medium.

## Verification Checklist Per Batch

- Restore approved repository and citation links in website Markdown.
- Verify links render as anchors in prerendered HTML.
- Run `npm run check:content`.
- Run `npm run test:prerender`.
- Run `npm run blog:check-images`.
- Run `npm run build` when the batch is ready for final review.
- Generate Medium replacement files for the batch.
- Review diffs with the user before any commit, push, merge, or PR action.
