---
seoTitle: The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)
slug: the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn
tag: Architecture
title: The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)
subtitle: Stop over-engineering your .NET apps. Learn which Clean Architecture abstractions protect your domain and which just slow you down.
intro: Stop over-engineering your .NET apps. Learn which Clean Architecture abstractions protect your domain and which just slow you down.
date: June 6, 2026
readTime: 8 min read
---
![The Hidden Tax of “Clean” Code: Knowing Which Abstractions to Keep (and Which to Burn)](/images/blog/the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn/the-hidden-tax-of-clean-code-knowing-which-abstractions-to-keep-and-which-to-burn-header.webp)

There is a growing movement in the .NET community right now, and it is fueled by pure exhaustion. Developers are tired. They are tired of opening a pull request to add a single database column, only to realize they have to modify six different files, three interfaces, a mapping profile, and a MediatR pipeline.

In response, a dangerous counter-trend is emerging: “Delete all abstractions.”

Influencers and developers are arguing that we should abandon Clean Architecture entirely, inject DbContext directly into our Controllers (or Minimal APIs), and embrace the chaos. But swinging from one extreme (Enterprise Bloat) to the other (Spaghetti Code) is not the answer.

Clean Architecture isn’t dead, and abstractions aren’t inherently bad. The problem is that we’ve forgotten the difference between a protective architectural boundary and useless boilerplate.

Every abstraction you write is a loan. You pay interest on it every time you read the code, navigate the Solution Explorer, or onboard a new developer. Today, we are going to audit your ASP.NET Core architecture, identify the Good Tax you should happily pay, and cut the Bad Tax that is slowing your team down.

## The “Good Tax”: Defending the Data Access Boundary 🛡️

The loudest voices in the anti-abstraction crowd are telling you to stop hiding Entity Framework (EF) Core behind a repository or an interface. They argue, “DbContext is already a Unit of Work, and DbSet is already a Repository!”

They are missing the point of Domain-Driven Design.

Your database is infrastructure. It is a volatile, slow, external dependency. If you leak EF Core specific syntax, Include() statements, and relational foreign-key logic all over your application, your domain becomes a slave to your database schema.

Abstracting your Data Access Layer (DAL) is a tax you want to pay. Why?

- The Swap Factor: If you decide to move a heavy read-query to Dapper, or you partition your data into a NoSQL store, you only change the code in one place.
- True Persistence Ignorance: Your domain entities remain pure C# classes. They don’t need to know about database indices or column mapping.
- Testability: You can mock the interface to write lightning-fast unit tests for your complex business logic, without fighting with DbContextOptions or every so often the limited InMemory database provider.

Here is what a valuable abstraction looks like in .NET. Notice how the contract speaks the language of the Domain, not the database:

```csharp
// 1. The Contract (Lives in the Core/Domain Layer)
public interface IUserRepository
{
Task GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
Task SaveAsync(User user, CancellationToken cancellationToken = default);
}

// 2. The Implementation (Lives in the Infrastructure Layer)
public class UserRepository : IUserRepository
{
private readonly ApplicationDbContext _dbContext;
public UserRepository(ApplicationDbContext dbContext)
{
_dbContext = dbContext;
}
public async Task GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
{
// Infrastructure details like EF Core remain hidden here
return await _dbContext.Users
.AsNoTracking()
.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
{
var existingUser = await _dbContext.Users.FindAsync(new object[] { user.Id }, cancellationToken);

if (existingUser == null)
{
_dbContext.Users.Add(user);
}
else
{
_dbContext.Entry(existingUser).CurrentValues.SetValues(user);
}

await _dbContext.SaveChangesAsync(cancellationToken);
}
}
```

This abstraction pays for itself. It creates a wall between your pure business rules and the messy reality of SQL transactions.

## The “Bad Tax”: The Pass-Through Service Anti-Pattern 💸

If abstracting the database is good, where does .NET Clean Architecture go wrong? It fails when developers start abstracting things out of habit rather than necessity.

One of the most notorious is the Pass-Through Service.

You’ve seen this before. A developer is tasked with fetching a user profile. Because “Clean Architecture” supposedly demands strict layers, they create a Controller, an Interface, an Application Service, and a Repository.

Take a look at this example:

```csharp
// 🛑 THE ANTI-PATTERN

// 1. The useless interface
public interface IUserService
{
Task GetUserProfileAsync(Guid id);
}

// 2. The useless service implementation
public class UserService : IUserService
{
private readonly IUserRepository _userRepository;
public UserService(IUserRepository userRepository)
{
_userRepository = userRepository;
}
public async Task GetUserProfileAsync(Guid id)
{
// This service does literally nothing but call the repository
var user = await _userRepository.GetByIdAsync(id);
if (user == null) throw new NotFoundException("User not found");

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
public async Task Get(Guid id)
{
var user = await _userService.GetUserProfileAsync(id);
return Ok(user);
}
}
```

## Why is this bad?

This architecture provides zero value. The IUserService interface will never have a second implementation. You are never going to build a MockUserService because you can just mock the IUserRepository instead.

This is the code equivalent of a middle manager who takes an email from their boss and immediately forwards it to their team without adding any instructions. It is pure overhead, and it pollutes modern ASP.NET Core codebases.

## The Pragmatic Fix: Vertical Slices and Concrete Classes 🛠️

To fix this, we need to stop treating Clean Architecture like a rigid set of concentric circles that every request must sequentially pass through. If a request is just a simple data fetch, it doesn’t need a domain service. It just requires a handler.

Furthermore, we need to abandon the delusion that every class requires an interface for the built-in Microsoft Dependency Injection container to work. IServiceCollection is perfectly capable of injecting concrete classes.

Let’s refactor that pass-through service into a streamlined, pragmatic handler using ASP.NET Core Minimal APIs:

```csharp
// ✅ THE PRAGMATIC APPROACH

// 1. The Concrete Handler (No IGetUserProfileQuery interface needed!)
public class GetUserProfileHandler
{
// We inject the abstracted DAL, but keep the handler concrete
private readonly IUserRepository _userRepository;
public GetUserProfileHandler(IUserRepository userRepository)
{
_userRepository = userRepository;
}
public async Task HandleAsync(Guid id, CancellationToken ct)
{
var user = await _userRepository.GetByIdAsync(id, ct);
if (user == null) throw new NotFoundException("User not found");

return new UserDto(user.Id, user.Email);
}
}

// 2. Program.cs Registration
// The DI container handles concrete classes perfectly
builder.Services.AddScoped();

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

If we ever need to add complex business rules later (like checking if the user’s account is locked), we simply add that logic directly into the GetUserProfileHandler. We didn't sacrifice any maintainability, but we drastically reduced the cognitive load.

## A Litmus Test for Abstractions 🧪

Before you type public interface IWhatever or add a new layer to your application, put it through this simple three-question test. If it fails, delete it.

- Does this touch I/O or an external boundary?

If the code speaks to EF Core, the file system, a third-party API (like Stripe or Azure Blob Storage), or a message broker (like RabbitMQ), abstract it. These things are highly volatile, slow, and challenging to test. Put them behind an interface.

2. Will this genuinely have more than one implementation in production?

If you are building an e-commerce system and you support both CreditCardPaymentStrategy and PayPalPaymentStrategy, you absolutely need an IPaymentProcessor interface. If you are building a CalculateTaxService and it only calculates taxes one way, use a concrete class. Stop planning for a future that may never come.

3. Am I just mapping objects for the sake of it?

If your controller receives a DTO, maps it to a Domain Model, passes it to a service, maps it to an entity, and passes it to a repository - without executing a single if statement or business rule - you have failed. For simple CRUD operations, route your endpoint directly to your repository via a concrete query handler. Save the complex mapping for areas of the app that actually contain complex domain logic.

## The Bottom Line

Clean Architecture was never supposed to be a prison. It was designed to isolate the things that matter (your core domain rules) from the things that change (your frameworks and databases).

Defend your Data Access Layer with your life. Abstract your third-party APIs. But be ruthless with everything else. Delete the pass-through services. Drop the redundant interfaces. Stop paying the abstraction tax on code that doesn’t deserve it.

Architecture is not lost when noise is eliminated. You've finally found it.
