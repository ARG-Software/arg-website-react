---
seoTitle: The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)
slug: the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: Architecture
tags: Architecture, Refactoring
title: The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)
subtitle: Stop over-engineering your .NET apps. Learn which Clean Architecture abstractions protect your domain and which just slow you down.
intro: Stop over-engineering your .NET apps. Learn which Clean Architecture abstractions protect your domain and which just slow you down.
date: June 6, 2026
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 8 min read
---
![The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)](/images/blog/the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn/the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn-header.webp)

There is a growing movement in the .NET community right now, and it is fueled by pure exhaustion. Developers are tired. They are tired of opening a pull request to add a single database column, only to realize they have to modify six different files, three interfaces, a mapping profile, and a MediatR pipeline.

In response, a dangerous counter-trend is emerging: “Delete all abstractions.”

Influencers and developers are arguing that we should abandon Clean Architecture entirely, inject DbContext directly into our Controllers (or Minimal APIs), and embrace the chaos. But swinging from one extreme (Enterprise Bloat) to the other (Spaghetti Code) is not the answer.

Clean Architecture isn’t dead, and abstractions aren’t inherently bad. The problem is that we’ve forgotten the difference between a protective architectural boundary and useless boilerplate.

Every abstraction you write is a loan. You pay interest on it every time you read the code, navigate the Solution Explorer, or onboard a new developer. Today, we are going to audit your ASP.NET Core architecture, identify the Good Tax you should happily pay, and cut the Bad Tax that is slowing your team down.

## The “Good Tax”: Defending the Data Access Boundary

The loudest voices in the anti-abstraction crowd are telling you to stop hiding Entity Framework (EF) Core behind a repository or an interface. They argue, “`DbContext` is already a Unit of Work, and `DbSet` already provides repository-like access!” Microsoft itself describes a [`DbContext` as designed for a single unit of work](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/), so this is not a frivolous objection.

But it is not the whole design decision.

Your database is infrastructure: an external dependency with failure modes and a schema that will evolve. If you leak EF Core-specific syntax, `Include()` statements, and relational foreign-key logic through business code, your application can become tightly coupled to both EF Core and the database schema.

For a domain-rich application, a focused Data Access Layer (DAL) can be a tax worth paying. For straightforward CRUD, injecting `DbContext` into a thin endpoint or application handler can also be a defensible choice. The boundary earns its keep when it does at least one of these jobs:

- The Swap Factor: If you move a heavy read query to Dapper or partition some data into another store, callers can remain unchanged when the contract was designed around their needs. The implementation change will not always be confined to one file because different stores have different semantics.
- Persistence Ignorance: Your domain entities can remain plain C# classes. Database indexes and column mappings stay outside the domain.
- Testability: You can stub the contract for focused unit tests of business logic. You still need integration tests against the real database for query translation, constraints, transactions, and provider behavior. Microsoft’s [EF Core testing guidance](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy) specifically discourages the InMemory provider as a relational database fake and notes both the value and maintenance cost of repositories.

Here is what a valuable abstraction looks like in .NET. Notice how the contract speaks the language of the Domain, not the database:

```csharp
// 1. The Contract (Lives at the Core/Application Boundary)
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddOrUpdateAsync(User user, CancellationToken cancellationToken = default);
}

// 2. The Implementation (Lives in the Infrastructure Layer)
public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _dbContext;

    public UserRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<User?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        // Infrastructure details like EF Core remain hidden here.
        return _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task AddOrUpdateAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        var existingUser = await _dbContext.Users.FindAsync(
            new object[] { user.Id },
            cancellationToken);

        if (existingUser is null)
        {
            _dbContext.Users.Add(user);
        }
        else
        {
            _dbContext.Entry(existingUser).CurrentValues.SetValues(user);
        }
    }
}
```

In a domain-rich application, this abstraction can pay for itself. It creates a boundary between business rules and EF Core details. The repository stages the aggregate change; the application-level unit of work or transaction commits once after all related aggregate and outbox changes have been staged. Calling `SaveChangesAsync` inside every repository method would make multi-repository operations harder to keep atomic.

## The “Bad Tax”: The Pass-Through Service Anti-Pattern

If a data-access abstraction can be valuable, where does .NET Clean Architecture go wrong? It fails when developers start abstracting things out of habit rather than necessity.

One of the most notorious is the Pass-Through Service.

You’ve seen this before. A developer is tasked with fetching a user profile. Because “Clean Architecture” supposedly demands strict layers, they create a Controller, an Interface, an Application Service, and a Repository.

Take a look at this example:

```csharp
// 🛑 THE ANTI-PATTERN

// 1. The useless interface
public interface IUserService
{
    Task<UserDto> GetUserProfileAsync(Guid id);
}

// 2. The useless service implementation
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserDto> GetUserProfileAsync(Guid id)
    {
        // This service does nothing but call the repository and map the result.
        var user = await _userRepository.GetByIdAsync(id);
        if (user is null) throw new NotFoundException("User not found");

        return new UserDto(user.Id, user.Email);
    }
}

// 3. The Controller
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> Get(Guid id)
    {
        var user = await _userService.GetUserProfileAsync(id);
        return Ok(user);
    }
}
```

## Why is this bad?

In this example, the extra service boundary provides little independent value. It has no policy of its own, and tests can exercise the application behavior by stubbing `IUserRepository`. A second implementation is not the only reason to use an interface, but “every class gets one” is not a reason either.

This is the code equivalent of a middle manager who takes an email from their boss and immediately forwards it to their team without adding any instructions. It is pure overhead, and it pollutes modern ASP.NET Core codebases.

## The Pragmatic Fix: Vertical Slices and Concrete Classes

To fix this, we need to stop treating Clean Architecture like a rigid set of concentric circles that every request must sequentially pass through. If a request is just a simple data fetch, it doesn’t need a domain service. It just requires a handler.

Furthermore, we need to abandon the delusion that every class requires an interface for the built-in Microsoft Dependency Injection container to work. IServiceCollection is perfectly capable of injecting concrete classes.

Let’s refactor that pass-through service into a streamlined, pragmatic handler using ASP.NET Core Minimal APIs:

```csharp
// ✅ THE PRAGMATIC APPROACH

// 1. The Concrete Handler (No IGetUserProfileQuery interface needed!)
public class GetUserProfileHandler
{
    // We inject the abstracted DAL, but keep the handler concrete.
    private readonly IUserRepository _userRepository;

    public GetUserProfileHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserDto> HandleAsync(Guid id, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(id, ct);
        if (user is null) throw new NotFoundException("User not found");

        return new UserDto(user.Id, user.Email);
    }
}

// 2. Program.cs Registration
// The DI container handles concrete classes perfectly
builder.Services.AddScoped<GetUserProfileHandler>();

// 3. The Minimal API Endpoint
app.MapGet("/api/users/{id}", async (
Guid id,
GetUserProfileHandler handler,
CancellationToken ct) =>
{
    var dto = await handler.HandleAsync(id, ct);
    return Results.Ok(dto);
});
```

Notice what happened here:

- We kept the IUserRepository. Our database is still safely behind a boundary.
- We deleted the IUserService and the Pass-Through Service.
- We used a concrete class (GetUserProfileHandler) for our application logic.

If we later need application policy, such as deciding whether a locked account may be shown, we can add it to the handler or move a reusable domain rule to the domain. We have not removed a boundary the example currently needs, and we have reduced its cognitive load.

## A Litmus Test for Abstractions

Before you type `public interface IWhatever` or add a new layer to your application, put it through this three-question test. If it cannot justify its cost, do not add it yet.

1. Does this boundary isolate meaningful volatility or policy?

Code that speaks to a third-party API, file system, clock, message broker, or complex persistence model often benefits from a narrow contract. Direct EF Core use in a simple application is not automatically wrong; add the interface when it expresses application needs, protects domain code, enables a necessary test double, or contains queries you deliberately want to centralize.

2. Is there a genuine reason for callers to depend on a contract?

Multiple production implementations are one strong reason, but stable boundaries, test substitutes, and dependency direction can matter too. If an e-commerce system supports credit cards and PayPal behind the same application policy, an `IPaymentProcessor` contract may clarify that variation. If `CalculateTaxService` has one stable implementation and no useful boundary to protect, use a concrete class. Stop planning for a future that may never come.

3. Am I just mapping objects for the sake of it?

If your controller receives a DTO, maps it to a domain model, passes it to a service, maps it to an entity, and passes it to a repository without enforcing a business rule or protecting a boundary, inspect every hop. For simple CRUD operations, a concrete query handler using `DbContext` directly, or a focused repository where one already pays for itself, may be enough. Keep separate transport models when they prevent over-posting or stabilize an external API; do not map objects merely to satisfy a diagram.

## The Bottom Line

Clean Architecture was never supposed to be a prison. Its dependency rule is meant to isolate core policy from implementation details, not to prescribe the same number of layers for every application.

Defend boundaries that protect real domain rules. Wrap third-party APIs where your application needs a stable contract. But be ruthless with everything else. Delete pass-through services. Drop redundant interfaces. Stop paying the abstraction tax on code that does not deserve it.

Architecture is not lost when noise is eliminated. You've finally found it.
