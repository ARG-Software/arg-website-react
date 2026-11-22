# SEO changes from Google Search Console (November 2026)

Data: `sc-domain:arg.software`, 90 days to November 18, 2026, pulled with `npm run seo:gsc`.
Re-run the report after each change and compare after 4-6 weeks.

## Baseline

| Period | Clicks | Impressions | CTR | Avg position |
|---|---|---|---|---|
| Last 28 days | 127 | 12,591 | 1.0% | 8.6 |
| Last 90 days | 361 | 30,991 | 1.2% | 9.2 |

Impressions per half-month grew from about 2,000 (late August) to about 7,700 (early November); clicks only from 37 to 73. Google shows the site far more, but results at positions 7-11 are not being chosen. Desktop is 87% of impressions. The US has the most impressions (3,247) but a 0.7% CTR; Germany, the UK, Switzerland and Ukraine click at 2-4%.

## 1. Rewrite titles and descriptions (low CTR, high impressions)

Follow `docs/content-guide.md`: only target keywords the body covers, and keep `slug` unchanged. Bump `dateModified` when the content changes.

- [ ] **`nx-nestjs-monorepo-boilerplate`**: 1,854 imp, 1.6% CTR, position 8.7
  - Current: `Nx NestJS Monorepo Boilerplate: Nx vs Turborepo`
  - Searches with 0 clicks: "nx nestjs" (200 imp, pos 8.3), "nestjs monorepo" (94, pos 9.8), "nestjs nx" (32, pos 8.9).
  - Direction: lead with "NestJS monorepo with Nx"; "Nx vs Turborepo" earns nothing in Search Console, so consider dropping it from the title.
- [ ] **`typescript-7-rewritten-in-go`** (file `typescript-rewritten-in-go.md`): 3,607 imp, 0.3% CTR, position 7.7
  - Current: `TypeScript 7 Native Go Port: What to Do`
  - Searches: "typescript go" (109, pos 11.3), "typescript-go" (35, pos 15), "typescript go rewrite" (25, pos 8.1), "typescript 7" (23, pos 17.9).
  - Direction: use the searched phrasing ("TypeScript Go", "tsgo"); "What to Do" is vague.
- [ ] **`running-ai-locally-complete-guide`**: 4,107 imp, 0.4% CTR, position 8.2
  - Current: `Ollama vs LM Studio: Run AI Locally (Complete Guide)`
  - Searches are questions, not tool comparisons: "can i run ai locally" (96, pos 9.3), "run ai locally" (59, pos 13.9), "how to run ai locally" (36), "running ai locally" (26), "can chatgpt be run locally".
  - Direction: lead with "How to Run AI Locally"; keep Ollama vs LM Studio as secondary. Add an FAQ answer for "Can ChatGPT run locally?" if the body covers it.
- [ ] **`goodbye-docker-desktop-wsl2`**: 2,363 imp, 0.7% CTR, position 11.2
  - Current: `Docker Desktop Alternative: Docker Engine in WSL 2`
  - Searches: "docker desktop wsl2" (pos 9), "docker vmm vs wsl2" (30, pos 9.4), "docker desktop + wsl2", "best wsl distro for docker", "can i install docker without docker desktop".
  - Direction: match "Docker without Docker Desktop on WSL2". Only use "Docker VMM vs WSL2" if a real section is added.
- [ ] **`stop-hitting-claude-usage-limits`**: 750 imp, 0.3% CTR, position 8. Review title and description against its queries.
- [ ] **`stop-trusting-your-message-broker-why-idempotency-is-the-only-real-guarantee`**: 401 imp, 0.2% CTR, position 8.2. Review title and description against its queries.
- [ ] **`api-architecture-styles-every-developer-should-know`**: 759 imp, 0.4% CTR, position 18.9
  - Searches: "api styles" (23, pos 8.6), "api architecture" (43, pos 26.9), "architecture api" (46, pos 27.5).

## 2. Near-miss keywords (positions 8-20)

- [ ] **"jwt logout"**: 51 imp, position 17.5, on `why-your-jwt-implementation-probably-breaks`. The title already says "JWT Logout Problem" and the body covers logout, so this is a ranking issue, not missing content. Strengthen with a dedicated H2 ("How to log out a JWT") and an FAQ entry if not already there.
- [ ] **"nestjs integration test"**: 44 imp, position 9.5, on `testcontainers-best-practices-nestjs`. Make sure "integration test" appears in an H2 and the description.
- [ ] **"typescript dependency injection"**: 27 imp, position 10.9, on `typescript-dependency-injection-without-framework`.
- [ ] **"typescript throw exception"**: 20 imp, position 16.1, on `functional-error-handling-typescript-result-pattern`. Add only if the body covers throwing vs returning errors.
- [ ] **"running ai models on cpu only laptop"**: 60 imp, position 22.8. Not covered today; target it with the new benchmark article (`docs/prompts/run-ai-locally-laptop-benchmark.md`).

## 3. Brand

- [ ] **Homepage** averages position 18.2 and ranks for no non-brand keyword. Review its title and description for one service keyword.
- [ ] **"arg-insights"** (52 imp, pos 9.8, matched to `/blog/`) and **"arg technology"** (88 imp, pos 37-43): people search these names. Decide whether they are old names that should appear on the site.
- [ ] **"ard software"** (142 imp, pos 45): typo of the brand. Nothing to do unless it grows.
- "arg software" is healthy: positions 1-3 on `/`, `/about-us/`, `/working-with-us/`.

## 4. Technical checks

- [ ] **Sitemap**: the API listed no submitted sitemap (possibly only because the service account is Restricted). Check **Indexing > Sitemaps** in Search Console and submit `https://arg.software/sitemap.xml` if missing. `robots.txt` already declares it.
- [ ] **`/audit` vs `/audit/`**: both got impressions for "arg software". `public/_redirects` already 301s `/audit` to `/audit/`; confirm in **Pages** that only `/audit/` is indexed.
- [ ] **`why-software-engineering-fundamentals-still-win-in-the-age-of-ai`**: 1,031 imp, position 4.3, 0 clicks, only 9 impressions with a visible query, steady 60-80 a day from late October to early November. Likely long-tail or automated; monitor, no action.

## 5. New content

- [ ] Benchmark article: local LLMs on a CPU-only laptop (i7-1165G7, 16 GB, Iris Xe). Prompt: `docs/prompts/run-ai-locally-laptop-benchmark.md`. Link it both ways with `running-ai-locally-complete-guide`.
- Alternatives: TypeScript 7 (tsgo) build times on the Nx monorepo; a month of AI coding agent costs.

## What is working (keep)

- TypeScript result pattern: positions 1-3 for "typescript result pattern" / "result pattern typescript".
- API versioning in .NET 10: top clicker (47 clicks, 2.3% CTR).
- "pragmatic clean architecture" at position 3.7; "cqrs - home alternatives" at 4.1.
- Google shows section links (`#...`) for several posts, a sign the heading structure works.
