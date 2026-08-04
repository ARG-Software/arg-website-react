# auth.md for ARG Software

ARG Software does not currently offer self-service OAuth, OpenID Connect, or automated agent registration for protected APIs.

## Agent Access

Agents may use the public discovery resources below without registration:

- Website: `https://arg.software/`
- LLM summary: `https://arg.software/llms.txt`
- Full LLM context: `https://arg.software/llms-full.txt`
- API catalog: `https://arg.software/.well-known/api-catalog`
- OpenAPI document: `https://arg.software/.well-known/openapi.json`
- MCP server card: `https://arg.software/.well-known/mcp/server-card.json`

## Protected Actions

The public website assistant and contact verification endpoints use ALTCHA verification, origin checks, and rate limits. They are intended for the website UI and are not an OAuth-protected API product.

ARG does not currently provide programmatic credentials, client registration, or delegated authorization for agents.

## Registration Requests

For partner integrations or agent access requests, contact `hello@arg.software` with:

- Organization name
- Agent or application name
- Intended use case
- Expected request volume
- Contact email

ARG will review requests manually.
