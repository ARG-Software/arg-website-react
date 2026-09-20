---
seoTitle: The JWT Logout Problem: Why Stateless Auth Breaks
slug: why-your-jwt-implementation-probably-breaks
tag: Security
tags: Security, Backend
title: Why Your JWT Implementation Probably Breaks
subtitle: JWT logout is a revocation design problem. Here is how to handle access tokens, refresh tokens, rotation, and compromised sessions safely.
intro: JWT logout is a revocation design problem. Here is how to handle access tokens, refresh tokens, rotation, and compromised sessions safely.
date: July 6, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 11 min read
mediumUrl: https://medium.com/@arg-software/why-your-jwt-implementation-probably-breaks-0e3defac3f6e
---

## The Logout Problem: Why Your JWT Implementation Probably Breaks

![Why Your JWT Implementation Probably Breaks](/images/blog/why-your-jwt-implementation-probably-breaks/why-your-jwt-implementation-probably-breaks-header.webp)

The interview question sounds simple: "If JWTs are stateless, how do you log a user out?"

The production answer starts with a distinction. JWT is a token format. It does not require stateless validation, and not every access token is a JWT. OAuth access tokens may be self-contained or opaque. Logout behavior depends on the token type, validation path, threat model, and acceptable revocation delay.

## The Constraint Behind the Problem

A signed JWT is usually three base64url-encoded parts:

```text
eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9
.
eyJpc3MiOiJodHRwczovL2lkLmV4YW1wbGUuY29tIiwiYXVkIjoiYXBpIiwiZXhwIjoxNzkxMjQ0ODAwfQ
.
signature
```

Signing protects integrity and authenticity. It does not normally encrypt the claims; clients and anyone holding the token can read them.

A resource server can validate a self-contained access token locally by checking its signature and claims. Secure validation includes, at minimum:

- An allowlisted algorithm, not whichever algorithm the token requests
- A trusted signing key bound to the expected issuer
- Exact issuer validation
- Audience validation for the current API
- Expiration and, where applicable, not-before validation with limited clock skew
- Token-type and application-specific authorization checks

If that is the entire validation path, the server has no per-token state to change. Deleting a browser copy does not invalidate another copy already held by an attacker. A valid token remains valid until it expires, its signing key is withdrawn, or the resource server consults revocation state.

That is the real limitation: **offline validation cannot also provide immediate, individual revocation without another signal.**

## What the Obvious Answers Actually Do

### Delete the Token Client-Side

Clearing local credentials is a necessary part of logout. It stops that client from sending them again. It does not revoke stolen copies or credentials on another device.

### Use Short-Lived Access Tokens

Short lifetimes bound the replay window. They do not eliminate it. Five minutes may be acceptable for reading a low-risk profile and unacceptable for approving a payment. Set the lifetime from a risk assessment, not a universal number.

### Rotate the Signing Key

Emergency key withdrawal can invalidate every token signed only by the compromised key, provided all validators stop trusting it. That is an incident-response control, not normal per-user logout.

Planned key rotation is different: issuers generally publish old and new verification keys during an overlap so existing tokens continue to validate. Rotating a key does not inherently log everyone out.

## The Common Two-Token Design

Many systems separate credentials by purpose:

**Access token**

- Short-lived
- Presented to resource servers
- Narrow in audience and privilege
- Often validated locally when it is a JWT

**Refresh token**

- Longer-lived
- Presented only to the authorization server's token endpoint
- Stored and revocable as server-side grant or session state
- Used to obtain a new access token

The OAuth 2.0 Security Best Current Practice requires refresh tokens issued to public clients to be sender-constrained or rotated. Confidential clients must also protect and bind refresh tokens to the client to which they were issued.

For a browser application, prefer a mature authorization/session framework or a backend-for-frontend over inventing token storage. If a refresh token is held in a cookie, use HTTPS and appropriate `Secure`, `HttpOnly`, `SameSite`, `Path`, and lifetime settings. `HttpOnly` prevents JavaScript from reading the cookie; it does not stop an XSS payload from making authenticated requests through the browser. Cookie-based endpoints also need a CSRF strategy.

Never put authentication tokens in `localStorage` or `sessionStorage` when an `HttpOnly` cookie or BFF design can meet the requirement. Any script running in the origin can read Web Storage.

## Logout by Revoking the Refresh Session

On ordinary logout, revoke the current refresh grant and clear the client-side credentials. Revoking only the presented row is not enough: a concurrent rotation could already have created a successor token. Store only a hash of each high-entropy refresh token so a database read does not immediately expose usable credentials.

```csharp
public async Task LogoutAsync(
    string presentedRefreshToken,
    CancellationToken cancellationToken)
{
    var tokenHash = ComputeSha256(presentedRefreshToken);

    await using var transaction =
        await db.Database.BeginTransactionAsync(cancellationToken);

    var session = await db.RefreshTokens.SingleOrDefaultAsync(
        token => token.TokenHash == tokenHash,
        cancellationToken);

    if (session is null)
    {
        return; // Keep logout idempotent and do not reveal token validity.
    }

    var now = timeProvider.GetUtcNow();

    await db.RefreshGrants
        .Where(grant => grant.Id == session.GrantId && grant.RevokedAt == null)
        .ExecuteUpdateAsync(
            updates => updates.SetProperty(grant => grant.RevokedAt, now),
            cancellationToken);

    await db.RefreshTokens
        .Where(token => token.GrantId == session.GrantId && token.RevokedAt == null)
        .ExecuteUpdateAsync(
            updates => updates.SetProperty(token => token.RevokedAt, now),
            cancellationToken);

    await transaction.CommitAsync(cancellationToken);
}
```

SHA-256 is suitable here only because the refresh token is generated with enough cryptographic randomness to resist guessing. Passwords require a slow password-hashing function; random bearer credentials generally need a deterministic hash for indexed lookup. Compare hashes in constant time where the application performs the comparison itself.

The transaction above is only a sketch. Logout and rotation must serialize on the same grant row, or use an equivalent database-specific lock or compare-and-swap rule. Rotation must verify that the grant remains active before inserting a successor. Otherwise a concurrent refresh can survive logout.

Do not accept a user ID from the caller and assume it identifies the token owner. Resolve and revoke the presented token within its authenticated client/session context. Rate-limit the endpoint, avoid logging raw tokens, and expire or delete old rows.

After logout, that refresh token can no longer mint access tokens. A previously issued self-contained access token may still work until its expiry unless the resource server performs an online revocation check. This is a designed window, not something to hide from stakeholders.

OAuth deployments can expose the standardized revocation endpoint defined by RFC 7009. The authorization server must support refresh-token revocation and should support access-token revocation. Its policy may also revoke related tokens and the underlying grant.

## Immediate Access-Token Revocation

When the acceptable delay is effectively zero, the resource server needs current state. Common options include:

- Opaque access tokens validated through authorization-server introspection
- A denylist keyed by a unique token identifier such as `jti`
- A session or grant version checked on each request
- Sender-constrained tokens to make replay by a different sender harder

Each option trades local independence for stronger control.

### Denylist a Validated Token

Validate the token first. Do not parse an untrusted JWT and use attacker-controlled claims as authoritative revocation keys.

The snippets below assume ASP.NET Core bearer authentication is configured with `MapInboundClaims = false`, so registered JWT claim names such as `sub`, `jti`, and `exp` remain unchanged.

```csharp
public async Task EnsureNotRevokedAsync(
    ClaimsPrincipal principal,
    CancellationToken cancellationToken)
{
    var tokenId = principal.FindFirstValue(JwtRegisteredClaimNames.Jti)
        ?? throw new SecurityTokenException("Missing jti claim");

    if (await cache.KeyExistsAsync($"revoked:{tokenId}"))
    {
        throw new SecurityTokenException("Token has been revoked");
    }
}

public async Task RevokeValidatedTokenAsync(
    ClaimsPrincipal principal,
    CancellationToken cancellationToken)
{
    var tokenId = principal.FindFirstValue(JwtRegisteredClaimNames.Jti)
        ?? throw new SecurityTokenException("Missing jti claim");
    var expiresAt = long.Parse(
        principal.FindFirstValue(JwtRegisteredClaimNames.Exp)
            ?? throw new SecurityTokenException("Missing exp claim"),
        CultureInfo.InvariantCulture);
    var remainingLifetime =
        DateTimeOffset.FromUnixTimeSeconds(expiresAt) - timeProvider.GetUtcNow();

    if (remainingLifetime > TimeSpan.Zero)
    {
        await cache.StringSetAsync(
            $"revoked:{tokenId}",
            "1",
            remainingLifetime);
    }
}
```

This assumes the `ClaimsPrincipal` came from full signature, issuer, audience, lifetime, algorithm, and token-type validation. The denylist entry only needs to live until the access token expires.

The cost is not a universal latency number. It depends on topology, cache health, replication, and load. Define whether authentication fails closed or degrades when the revocation store is unavailable; that is a security and availability decision. A replicated cache can also have a small propagation window, so "immediate" still needs a measured service-level objective.

### Session or Grant Versioning

A version claim can invalidate all access tokens associated with a user or grant:

```csharp
var claims = new[]
{
    new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
    new Claim("session_version", user.SessionVersion.ToString()),
};
```

Every resource server must compare the claim with authoritative state before authorizing the request:

```csharp
var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
    ?? throw new SecurityTokenException("Missing sub claim");
var presentedVersion = int.Parse(
    principal.FindFirstValue("session_version")
        ?? throw new SecurityTokenException("Missing session version"),
    CultureInfo.InvariantCulture);

var currentVersion = await sessions.GetVersionAsync(subject, cancellationToken);

if (presentedVersion != currentVersion)
{
    throw new SecurityTokenException("Session has been superseded");
}
```

"Sign out everywhere" then revokes refresh sessions and increments the version in one transaction:

```csharp
public async Task LogoutEverywhereAsync(
    long userId,
    CancellationToken cancellationToken)
{
    var now = timeProvider.GetUtcNow();
    await using var transaction =
        await db.Database.BeginTransactionAsync(cancellationToken);

    await db.RefreshTokens
        .Where(token => token.UserId == userId && token.RevokedAt == null)
        .ExecuteUpdateAsync(
            updates => updates.SetProperty(
                token => token.RevokedAt,
                now),
            cancellationToken);

    await db.Users
        .Where(user => user.Id == userId)
        .ExecuteUpdateAsync(
            updates => updates.SetProperty(
                user => user.SessionVersion,
                user => user.SessionVersion + 1),
            cancellationToken);

    await transaction.CommitAsync(cancellationToken);
}
```

The access tokens are rejected on the next version check, not magically at the instant of the update. If version values are cached for 30 seconds, revocation can be delayed by about 30 seconds. Use invalidation or a sufficiently strict cache policy for the threat model, and be explicit about the resulting window.

Versioning all of a user's sessions is coarse-grained. A per-device grant or session version preserves unaffected devices and is often a better model.

## Refresh-Token Rotation and Reuse Detection

With rotation, every successful refresh returns a new refresh token and invalidates the one just presented. If an invalidated token is presented again, the authorization server treats the token family as potentially compromised.

The consume-and-replace operation must be atomic. A read followed by an unrelated update allows two concurrent requests to use the same token successfully.

At the persistence boundary, the transaction is conceptually:

```sql
BEGIN;

SELECT grant_id, revoked_at
FROM refresh_grants
WHERE id = (
    SELECT grant_id
    FROM refresh_tokens
    WHERE token_hash = :presented_hash
)
FOR UPDATE;

-- Reject an unknown or revoked grant.

SELECT id, family_id, user_id, expires_at, used_at, revoked_at
FROM refresh_tokens
WHERE token_hash = :presented_hash;

-- Reject unknown, expired, or revoked tokens.
-- If used_at is already set, revoke the active family and require re-authentication.

UPDATE refresh_tokens
SET used_at = CURRENT_TIMESTAMP
WHERE id = :current_id AND used_at IS NULL AND revoked_at IS NULL;

INSERT INTO refresh_tokens (
    token_hash,
    family_id,
    user_id,
    expires_at
) VALUES (
    :new_token_hash,
    :family_id,
    :user_id,
    :expires_at
);

COMMIT;
```

Generate the replacement with a cryptographically secure random number generator, return the raw value only once, and persist only its hash:

```csharp
var rawToken = WebEncoders.Base64UrlEncode(
    RandomNumberGenerator.GetBytes(32));
var tokenHash = ComputeSha256(rawToken);
```

The exact locking or compare-and-swap implementation is database-specific. Enforce uniqueness on token hashes, handle transaction serialization failures, and test two simultaneous refreshes. Some providers allow a short overlap or idempotency window to tolerate legitimate network retries; that reduces false compromise signals but increases replay tolerance, so document the tradeoff.

Token families also need an absolute lifetime. Rotating a token should not extend one stolen grant forever. Revoke the family after reuse, password reset, account recovery, explicit all-device logout, or other high-risk events according to policy.

Refresh-token rotation is not generically "OAuth compliance." RFC 9700 requires public-client refresh tokens to be either sender-constrained or rotated. Rotation is one standards-backed replay-detection option.

![JWT implementation validation and security failure example](/images/blog/why-your-jwt-implementation-probably-breaks/why-your-jwt-implementation-probably-breaks-2.webp)

## What a Production Policy Looks Like

Use mechanisms according to risk rather than layering every control onto every request:

**Ordinary logout:** revoke the current refresh session, clear client credentials, and accept the documented remaining access-token lifetime.

**Sign out one device:** revoke that device's grant or session. Avoid invalidating unrelated sessions unless that is the product contract.

**Sign out everywhere or password reset:** revoke all relevant refresh grants and advance user/session state checked by resource servers.

**Suspected compromise or admin lockout:** revoke refresh grants and use online access-token revocation, introspection, or a denylist where immediate denial is required.

**Signing-key compromise:** withdraw the key, reject affected tokens, rotate credentials, and run the incident-response plan. This is broader than logout.

For every path, record security events without recording raw tokens, make revocation idempotent, and test behavior during cache, database, and authorization-server failures.

## Should You Use JWT Access Tokens?

Use self-contained JWT access tokens when independent validation provides a concrete benefit, such as several resource servers operating across a boundary where an introspection call on every request would be undesirable.

Even then, follow the JWT and OAuth profiles:

- Prefer asymmetric signatures so resource servers do not hold a signing secret
- Validate algorithm, signature, issuer, audience, expiration, and token type
- Restrict audience, scope, and privileges
- Do not put secrets or unnecessary personal data in readable claims
- Treat access tokens as opaque at the client; their format may change
- Consider DPoP or mutual TLS where sender-constrained tokens are practical

For a conventional same-origin web application, a mature server-side session cookie is often simpler. Logout and per-session revocation are direct because authorization state is already online. "Redis-backed" is one implementation option, not a requirement; use the framework and persistence model that meet availability and security needs.

## The Principles to Remember

1. A JWT is a format, not a session architecture.
2. Offline validation and immediate individual revocation are competing properties.
3. Client-side deletion ends that client's use; server-side revocation handles replay elsewhere.
4. Short-lived access tokens bound exposure, while refresh grants carry the longer-lived session risk.
5. Refresh-token rotation needs atomic replacement and family-level reuse handling.
6. Every cache introduces a measurable revocation delay unless it is synchronously invalidated.
7. The right design follows the threat model, not a claim that one pattern handles "99%" of systems.

JWTs are useful, but they do not remove state from authentication as a whole. They move decisions about state, consistency, and revocation to architecture boundaries. Make those decisions explicit before production makes them for you.

## References

- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 7009: OAuth 2.0 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
