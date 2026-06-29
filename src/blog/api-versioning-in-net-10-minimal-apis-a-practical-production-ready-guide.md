---
seoTitle: API Versioning in .NET 10 Minimal APIs: A Practical, Production-Ready Guide
slug: api-versioning-in-net-10-minimal-apis-a-practical-production-ready-guide
tag: Architecture
title: API Versioning in .NET 10 Minimal APIs: A Practical, Production-Ready Guide
subtitle: A guide for production-ready .NET Minimal APIs versioning, with practical examples following the best practices.
intro: A guide for production-ready .NET Minimal APIs versioning, with practical examples following the best practices.
date: April 27, 2026
readTime: 11 min read
---
### Learn how to implement API versioning in .NET 10 Minimal APIs using URL-based versioning, Swagger integration, and production-ready deprecation strategies.

![API Versioning in .NET 10 Minimal APIs: A Practical, Production-Ready Guide](/images/blog/api-versioning-in-net-10-minimal-apis-a-practical-production-ready-guide/api-versioning-in-net-10-minimal-apis-a-practical-production-ready-guide-header.webp)

API versioning allows systems to evolve from v1 to v2 without breaking existing consumers.

At some point, every API reaches a breaking point.

A seemingly simple change - renaming a field, restructuring a response, or removing a deprecated property - can quietly break mobile apps, dashboards, or third-party integrations in production.

And when that happens, the feedback is always the same: “We should have versioned the API.”

API versioning is how you evolve your contract without breaking existing consumers. It allows multiple API versions to coexist, so clients can migrate on their own timeline rather than being forced into immediate upgrades.

In this guide, we’ll look at how to implement API versioning in .NET 10 Minimal APIs using a practical, production-ready approach - covering routing strategies, Swagger configuration, deprecation handling, and real-world lifecycle management.

## What Is API Versioning?

API versioning is a strategy for managing change without breaking existing clients.

At its core, a version represents a contract between your system and its consumers. That contract defines exactly how data is structured, how endpoints behave, and what responses clients can expect.

When that contract changes in a way that breaks compatibility - such as renaming a field, changing a data type, or altering a response shape - you can’t simply overwrite the old behavior. Someone, somewhere, is still relying on it.

That’s where versioning comes in.

> Instead of forcing all consumers to adapt at once, you introduce a new version of the API (for example, v2) while keeping the existing one (v1) running. Both versions coexist, each serving a different contract, until clients are ready to migrate.

A version typically governs:

- Endpoint structure and routing
- Request and response schemas
- Query parameters and behavior
- Status codes and error formats
- Authentication or authorization rules

If any of these changes in a way that breaks existing clients, you are no longer evolving an API - you are replacing it. And replacement without coordination is what causes production failures.

Versioning is what turns breaking change into controlled change.

## Why Versioning Matters

Here’s the practical reality:

- Backward compatibility Older clients (such as a mobile app released months ago) continue to work.
- Safer deployments You can ship v2 without forcing immediate updates.
- Parallel development Frontend and backend teams can move at different speeds.
- Clear lifecycle management You can deprecate, sunset, and remove versions cleanly.
- Trust with external consumers Partners need stability - they can’t afford surprise breakages.

If your API is used by anything beyond a single frontend you fully control, versioning isn’t optional — it’s foundational.

## Versioning Policy (Keep It Consistent)

Before diving into breaking vs non-breaking changes, define a simple policy your team follows consistently.

A practical baseline:

- Only introduce a new version for breaking changes
- Use major versions only (v1, v2, v3)
- Avoid “just in case” version bumps
- Require review/approval for any breaking change

Why this matters:

> Without a shared policy, versioning becomes inconsistent. Different developers make different calls, and your API quickly becomes unpredictable.

> A clear rule set keeps your API stable and your team aligned.

## Breaking vs Non-Breaking Changes

The most critical judgment call: does this change require a new version?

### Breaking changes (require a new version)

- Removing or renaming fields
- Changing data types (e.g., string → int)
- Changing semantics (e.g., cents → dollars)
- Making optional fields required
- Altering status codes for existing flows
- Removing or renaming endpoints
- Changing authentication rules

### Non-breaking changes (same version)

- Adding optional fields
- Adding new endpoints
- Adding optional query parameters
- Performance improvements
- Bug fixes that don’t alter behavior

Rule of thumb: If a client who worked yesterday fails today, you introduced a breaking change.

## Reducing the Need for New Versions

Versioning is essential - but overusing it creates its own problems.

Before introducing a new version, consider whether the change can be made backward compatible:

- Add new fields instead of changing existing ones
- Keep old fields temporarily while introducing new ones
- Use sensible defaults for new data
- Prefer extending responses over reshaping them

A common pattern is to expand and contract:

- Add the new field or behavior
- Let clients migrate
- Remove the old behavior in a later version

The goal is simple: evolve your API without forcing unnecessary upgrades.

Versioning is a tool — not the first move.

## Versioning Strategies

There are multiple ways to version an API, but here’s the recommendation for modern systems:

👉 Use URL segment versioning with major versions only (v1, v2).

Why?

- Easy to see in logs and debugging tools
- Works cleanly with Swagger/OpenAPI
- Simple to test with curl or Postman
- Plays nicely with caching/CDNs
- Instantly understandable for new developers

We’ll focus on this approach first, then briefly cover header-based versioning later.

## Project Setup

Install the required packages:

```bash
dotnet add package Asp.Versioning.Http
dotnet add package Asp.Versioning.Mvc.ApiExplorer
dotnet add package Swashbuckle.AspNetCore
```

- Asp.Versioning.Http: core versioning support
- Asp.Versioning.Mvc.ApiExplorer: enables Swagger integration
- Swashbuckle.AspNetCore: generates OpenAPI docs

## Minimal API Versioning: Full Setup

### Step 1: Configure Services

```text
using Asp.Versioning;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApiVersioning(options =>
{
options.DefaultApiVersion = new ApiVersion(1, 0);
options.AssumeDefaultVersionWhenUnspecified = true;
options.ReportApiVersions = true;
options.ApiVersionReader = new UrlSegmentApiVersionReader();
})
.AddApiExplorer(options =>
{
options.GroupNameFormat = "'v'VVV";
options.SubstituteApiVersionInUrl = true;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();
```

### What these options do

- DefaultApiVersion → fallback version (v1)
- AssumeDefaultVersionWhenUnspecified → allows missing version
- ReportApiVersions → adds version headers automatically
- UrlSegmentApiVersionReader → reads version from /api/v1/...
- GroupNameFormat → formats Swagger groups (v1, v2)
- SubstituteApiVersionInUrl → injects version into routes

### Step 2: Define a Version Set

```text
var apiVersionSet = app.NewApiVersionSet()
.HasApiVersion(new ApiVersion(1, 0))
.HasApiVersion(new ApiVersion(2, 0))
.ReportApiVersions()
.Build();
```

This declares supported versions and enables reporting via headers.

### Step 3: Create v1 Endpoints

```csharp
var productsV1 = app.MapGroup("/api/v{version:apiVersion}/products")
.WithApiVersionSet(apiVersionSet)
.MapToApiVersion(1, 0);

productsV1.MapGet("", async (AppDbContext db) =>
{
var products = await db.Products
.Select(p => new ProductResponseV1(p.Id, p.Name, p.Price))
.ToListAsync();
return Results.Ok(products);
});

public record ProductResponseV1(int Id, string Name, decimal Price);
```

### Step 4: Create v2 with a New Contract

```csharp
var productsV2 = app.MapGroup("/api/v{version:apiVersion}/products")
.WithApiVersionSet(apiVersionSet)
.MapToApiVersion(2, 0);

public record ProductResponseV2(
int Id,
string Name,
decimal Price,
string Currency,
string Category,
bool IsAvailable);
```

Same route. Different response shape. Both versions coexist.

### Step 5: Run the App

```text
app.UseSwagger();
app.UseSwaggerUI();
app.Run();
```

Now:

- /api/v1/products → v1 response
- /api/v2/products → v2 response

Headers include:

```text
api-supported-versions: 1.0, 2.0
```

## Handling Unsupported or Invalid Versions

Not every request will use a valid or supported version — and how you handle that matters.

Common scenarios:

- A client requests a version that doesn’t exist (e.g., /api/v3/...)
- The version format is invalid (e.g., /api/vabc/...)
- The version is missing, and no default applies

Recommended approach:

- Return 400 Bad Request for invalid version formats
- Return 400 or 404 for unsupported versions (be consistent across your API)
- Include a clear error message with supported versions

For example:

```json
{
"error": "Unsupported API version",
"supportedVersions": ["1.0", "2.0"]
}
```

Clear, predictable errors reduce confusion and make integrations easier to debug.

Silent failures or inconsistent responses will cost you time later.

## Scaling the Structure

As your API grows, avoid cluttering Program.cs.

Use extension methods:

```csharp
public static class ProductEndpoints
{
public static void MapProductEndpointsV1(this IEndpointRouteBuilder app, ApiVersionSet set)
{
var group = app.MapGroup("/api/v{version:apiVersion}/products")
.WithApiVersionSet(set)
.MapToApiVersion(1, 0);

group.MapGet("", GetAllV1);
}

public static void MapProductEndpointsV2(this IEndpointRouteBuilder app, ApiVersionSet set)
{
var group = app.MapGroup("/api/v{version:apiVersion}/products")
.WithApiVersionSet(set)
.MapToApiVersion(2, 0);
group.MapGet("", GetAllV2);
}
}
```

Then:

```text
app.MapProductEndpointsV1(apiVersionSet);
app.MapProductEndpointsV2(apiVersionSet);
```

Clean, modular, and easy to remove old versions later.

## Deprecating a Version

```text
var apiVersionSet = app.NewApiVersionSet()
.HasDeprecatedApiVersion(new ApiVersion(1, 0))
.HasApiVersion(new ApiVersion(2, 0))
.Build();
```

Now responses include:

```text
api-deprecated-versions: 1.0
```

## Security Across Versions

Versioning doesn’t remove your responsibility to keep older versions secure.

Even if v1 is deprecated, it’s still running in production - and still exposed.

Keep in mind:

- Apply critical security fixes to all supported versions
- Avoid leaving known vulnerabilities in older endpoints
- Be careful not to expose sensitive data differently across versions
- If a version becomes unsafe to maintain, accelerate its retirement

In some cases, deprecation isn’t enough. Security issues may require forcing clients to upgrade sooner than planned.

Versioning protects clients from breaking changes — but it shouldn’t protect insecure behavior.

## Adding a Sunset Policy

```text
app.Use(async (context, next) =>
{
await next();

var version = context.GetRequestedApiVersion();

if (version?.MajorVersion == 1)
{
context.Response.Headers["Sunset"] = "Sat, 01 Nov 2026 00:00:00 GMT";
context.Response.Headers["Deprecation"] = "true";
}
});
```

This gives clients a clear, machine-readable deadline.

## Swagger per Version

```text
builder.Services.AddSwaggerGen(options =>
{
options.SwaggerDoc("v1", new OpenApiInfo
{
Title = "Products API",
Version = "v1",
Description = "Deprecated - migrate to v2"
});

options.SwaggerDoc("v2", new OpenApiInfo
{
Title = "Products API",
Version = "v2",
Description = "Current version"
});
});

app.UseSwaggerUI(options =>
{
options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1 (Deprecated)");
options.SwaggerEndpoint("/swagger/v2/swagger.json", "v2");
});
```

This avoids confusion and makes version selection explicit.

## Header Versioning (Alternative)

```text
options.ApiVersionReader = new HeaderApiVersionReader("X-Api-Version");
```

Example request:

```text
GET /api/products
X-Api-Version: 2.0
```

### When to use it

- URL must remain stable
- CDN/proxy constraints
- Contract requires header-based versioning

### When to avoid it

- Browser-based clients
- Manual testing via URL
- Discoverability matters

## Testing Versioned APIs

Versioning only works if each version remains stable over time - testing is what guarantees that.

Basic coverage:

- Test each version independently (/api/v1/..., /api/v2/...)
- Validate status codes and response shapes
- Verify default version behavior when unspecified
- Assert deprecation and sunset headers where applicable

Go a step further:

- Treat responses as contracts - they should not change unintentionally
- Use snapshot or contract tests to detect breaking changes
- Ensure v1 tests keep passing even as v2 evolves
- Test unsupported or invalid version requests

Example:

```csharp
[Fact]
public async Task GetProducts_V1_Works()
{
var response = await _client.GetAsync("/api/v1/products");
response.StatusCode.Should().Be(HttpStatusCode.OK);
}
```

### Key strategies

- Test each version independently
- Validate response contracts
- Assert deprecation headers
- Test unsupported versions
- Verify default version fallback

## Migration Playbook (v1 → v2)

### Phase 1: Build & Release

Introduce v2 without disrupting existing clients.

- Ship v2 alongside v1 (never replace in-place)
- Keep routes consistent where possible to reduce confusion
- Clearly document what changed and why
- Update Swagger/OpenAPI with separate versions
- Validate both versions independently (tests, contracts)

Goal: make v2 available and trustworthy without forcing adoption.

### Phase 2: Deprecate

Start signaling that v1 is on its way out.

- Mark v1 as deprecated in code and Swagger
- Add Deprecation and Sunset headers to responses
- Communicate proactively (release notes, email, partner channels)
- Stop adding new features to v1 (bug fixes only)

Goal: give consumers time and clarity to migrate.

### Phase 3: Monitor

Track real usage and support the transition.

- Log the requested API version for every request
- Track traffic per version (v1 vs v2)
- Identify clients still using v1
- Provide migration support where needed
- Freeze v1 completely (no changes beyond critical fixes)

This helps you answer:

- Who hasn’t migrated yet?
- Are there blockers preventing adoption?
- When is it safe to remove v1?

If you want a deeper dive into setting up logs, metrics, and tracing in .NET, we’ve covered that in a separate observability guide.

Goal: make data-driven decisions about deprecation.

### Phase 4: Retire

Remove the old version cleanly and intentionally.

- Remove v1 endpoints from the codebase
- Return 410 Gone for a limited time (grace period)
- Monitor for unexpected traffic or failures
- Fully clean up related code, tests, and documentation

Goal: simplify your system and eliminate maintenance overhead.

⚠️ Common mistake: never removing old versions. Set a deadline — and enforce it.

![API Versioning in .NET 10 Minimal APIs: A Practical, Production-Ready Guide](/images/blog/api-versioning-in-net-10-minimal-apis-a-practical-production-ready-guide/image-2.webp)

API versioning follows a controlled lifecycle: release new versions, deprecate old ones, monitor adoption, and retire safely.

> API versioning allows systems to evolve from v1 to v2 without breaking existing consumers.

## Final Thoughts

API versioning is one of those things teams skip - until it breaks production.

Once a small change takes down a mobile app or partner integration, the need becomes obvious.

The upside: with Minimal APIs and Asp.Versioning.Http in .NET 10, setting this up is straightforward and low-cost.

Recommendation:

- Start versioning from day one
- Use URL segment versioning
- Stick to major versions
- Communicate deprecations clearly
- Enforce sunset timelines

Adding versioning early is cheap. Adding it later - after clients depend on your API - is not.

There’s more you can build on top of this - like automated OpenAPI diffing in CI pipelines, client SDK versioning, deeper database evolution strategies, or aligning with standards such as RFC 8594 - but those are optimizations, not prerequisites.

Get the fundamentals right first. That’s what keeps your API stable as it evolves.
