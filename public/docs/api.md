# ARG Software API Notes

ARG Software exposes a small public API surface for the website assistant, human verification, and read-only agent discovery.

## Discovery

- API catalog: `https://arg.software/.well-known/api-catalog`
- OpenAPI document: `https://arg.software/.well-known/openapi.json`
- LLM summary: `https://arg.software/llms.txt`
- Full LLM context: `https://arg.software/llms-full.txt`
- Agent registration notes: `https://arg.software/auth.md`
- MCP server card: `https://arg.software/.well-known/mcp/server-card.json`

## Assistant Endpoints

- `GET /api/assistant/challenge` returns an ALTCHA challenge for browser-side proof-of-work.
- `POST /api/assistant/ask` accepts a verified assistant question payload and returns an answer with citations and optional actions.
- `GET /api/assistant/ui-copy` returns localized assistant widget copy.

The assistant API is intended for the ARG website UI. It is protected with ALTCHA verification, origin checks, and rate limits.

## Security Verification Endpoints

- `GET /api/security/challenge` returns an ALTCHA challenge for browser-side human verification.
- `POST /api/security/verify` verifies an ALTCHA payload before protected form submissions.

## MCP Endpoint

- `POST /mcp` exposes read-only Model Context Protocol tools for public ARG information.

The MCP endpoint does not send email, submit forms, create leads, authenticate users, or expose private RAG data.

## Human Contact

For partnership, project, or agent integration questions, contact `hello@arg.software`.
