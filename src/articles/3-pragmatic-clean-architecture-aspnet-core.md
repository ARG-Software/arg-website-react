---
seoTitle: Pragmatic Clean Architecture in ASP.NET Core
slug: pragmatic-clean-architecture-aspnet-core
tag: .NET · Architecture
title: Taming the Chaos: A Developer's Guide to Pragmatic Clean Architecture in ASP.NET Core
subtitle: As applications grow, so does their complexity. Here's how Pragmatic Clean Architecture brings order without overengineering.
date: May 3, 2025
readTime: 15 min read
mediumUrl: https://arg-software.medium.com/taming-the-chaos-a-developers-guide-to-pragmatic-clean-architecture-in-net-%EF%B8%8F-c0b05de359a7
excerpt: As applications grow, logic gets duplicated, domain rules leak into controllers, and infrastructure dependencies become tightly coupled with core logic. Pragmatic Clean Architecture addresses this by introducing clear boundaries between layers and enforcing strict separation of concerns.
---

![Taming the Chaos](/images/articles/taming-the-chaos/taming-the-chaos-header.webp)

As applications grow, so does their complexity. Over time, logic gets duplicated, domain rules leak into controllers, and infrastructure dependencies become tightly coupled with core logic. This tangled codebase becomes harder to test, maintain, and extend - especially when teams scale or features rapidly evolve.

## Enter Pragmatic Clean Architecture

![Enter clean Architecture](/images/articles/taming-the-chaos/enter-clean-architecture.webp)

Pragmatic Clean Architecture (PCA) addresses this complexity by introducing clear boundaries between layers and enforcing strict separation of concerns.

At the heart of PCA lies the Dependency Inversion Principle - high-level modules (Domain and Application layers) should not depend on low-level details such as databases, frameworks, or external APIs. Instead, both layers depend on abstractions. This inversion ensures that core business logic stays stable and decoupled, even as infrastructure or technologies change.

Combined with Domain-Driven Design (DDD), PCA enables teams to model business processes in code, enforcing rules where they matter most. DDD is an approach introduced by Eric Evans that emphasizes modeling software to match the business domain, creating a shared language between developers and domain experts.

## How PCA Differs from Classic Clean Architecture

Traditional Clean Architecture, as introduced by Robert C. Martin, promotes concentric layers with strict dependency rules. While powerful in theory, it often results in excessive indirection, interface bloat, and difficulty evolving features, especially in smaller teams or fast-paced environments.

Martin's Clean Architecture is based on the fundamental "Dependency Rule": source code dependencies can only point inward toward higher-level policies, with inner circles containing business rules and outer circles containing implementation details.

Pragmatic Clean Architecture retains the core principles but applies them in a simplified, developer-friendly way:

- **Simpler layer application.** Uses the same four layers but avoids over-fragmentation.
- **Less boilerplate.** Introduces interfaces only when they serve a clear purpose.
- **Vertical feature alignment.** Organizes code by feature or use case rather than layer type.
- **Lightweight in-process messaging.** This approach uses in-process communication (e.g., with MediatR) to decouple request handling from business logic.

From This (Horizontal Slicing):

```
📦 Controllers
└── BookingController.cs
📦 Domain
└── Entities
    └── Booking.cs
📦 Application
└── Commands
    └── ReserveBookingCommand.cs
📦 Infrastructure
└── Repositories
    └── BookingRepository.cs
📦 Mapping
└── MappingProfile.cs
```

To This (Vertical Slicing):

```
📦 Bookings
├── Booking.cs
├── ReserveBookingCommand.cs
├── ReserveBookingHandler.cs
├── BookingRepository.cs
├── BookingController.cs
└── MappingProfile.cs
```

## The Four Layers of Pragmatic Clean Architecture

Let's explore how PCA is applied in a .NET apartment booking platform.

### 1. Domain Layer: The Pure Core

The Domain Layer contains entity models and rules - implemented in pure C# without any dependencies on frameworks or infrastructure. This isolation allows for easy testing and long-term maintainability.

Entities encapsulate both data and behavior. For example, the Booking entity includes logic for confirming a booking and raising a domain event:

```csharp
public sealed class Booking : Entity
{
    public Result Confirm(DateTime utcNow)
    {
        if (Status != BookingStatus.Reserved)
        {
            return Result.Failure(BookingErrors.NotReserved);
        }

        Status = BookingStatus.Confirmed;
        ConfirmedOnUtc = utcNow;

        RaiseDomainEvent(new BookingConfirmedDomainEvent(Id));

        return Result.Success();
    }
  // Additional methods...
}
```

We use domain events to signal necessary business state changes - allowing other parts of the system to react without coupling directly to the entity logic.

Value Objects represent concepts where identity doesn't matter - only the attributes do. Unlike entities that need unique identifiers, value objects are defined by their attributes and are immutable. In Bookify, the Money class is a good example:

```csharp
public record Money(decimal Amount, Currency Currency)
{
    public static Money operator +(Money first, Money second)
    {
        if (first.Currency != second.Currency)
        {
            throw new InvalidOperationException("Currencies have to be equal");
        }

        return new Money(first.Amount + second.Amount, first.Currency);
    }

    public static Money Zero() => new(0, Currency.None);

    public static Money Zero(Currency currency) => new(0, currency);

    public bool IsZero() => this == Zero(Currency);
}
```

Domain Services come into play when business logic doesn't naturally belong to any single entity. You should consider using a Domain Service when the operation involves multiple entities, the logic represents a domain process, or the operation is stateless.

A nice example is a PricingService that calculates booking prices based on multiple factors:

```csharp
public sealed class PricingService
{
    public Money CalculatePrice(Apartment apartment, DateRange period)
    {
        var priceForPeriod = apartment.Price * period.Length;
        
        var cleaningFee = apartment.CleaningFee;
        
        var amenitiesUpgrade = CalculateAmenitiesUpgrade(apartment);
        
        return priceForPeriod + cleaningFee + amenitiesUpgrade;
    }
    
    private Money CalculateAmenitiesUpgrade(Apartment apartment)
    {
        // Calculate price increase based on premium amenities
    }
}
```

All infrastructure-facing components are defined as interfaces in the Domain layer, such as:

```csharp
public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> IsOverlappingAsync(
        Apartment apartment,
        DateRange duration,
        CancellationToken cancellationToken = default);
    void Add(Booking booking);
}
```

These interfaces define what external systems need to do without specifying how they do it, allowing the domain to stay pure while still communicating its needs to the outside world.

### 2. Application Layer: The Orchestrator

The Application Layer orchestrates business use cases, coordinating the interaction between input and domain entities using commands, queries, and service abstractions.

We use the Command Query Responsibility Segregation (CQRS) pattern, utilizing MediatR. CQRS separates read operations (queries) from write operations (commands), allowing each to be optimized independently:

```csharp
public record ReserveBookingCommand(
    Guid ApartmentId,
    Guid UserId,
    DateOnly StartDate,
    DateOnly EndDate) : ICommand<Guid>;

internal sealed class ReserveBookingCommandHandler : ICommandHandler<ReserveBookingCommand, Guid>
{
    private readonly IUserRepository _userRepository;
    private readonly IApartmentRepository _apartmentRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PricingService _pricingService;
    private readonly IDateTimeProvider _dateTimeProvider;

    // Constructor with dependency injection...

    public async Task<Result<Guid>> Handle(
        ReserveBookingCommand command,
        CancellationToken cancellationToken)
    {
        // Application logic here...
    }
}
```

CQRS is particularly valuable in Clean Architecture for several key reasons:

- **Separation of concerns.** By dividing read and write operations, each can be designed according to its specific requirements. Commands often involve complex business rules and validation, while queries are optimized for retrieval performance and "can improve the performance, scalability, and security of an application".
- **Simplified command handlers.** Command handlers can focus exclusively on domain logic without the complexity of also handling query optimization, making them more maintainable.
- **Independent scaling.** Read and write operations often have different performance profiles and scaling needs. CQRS allows each side to scale independently based on its specific load patterns.
- **Better alignment with domain events.** CQRS naturally aligns with event-driven architectures, making it easier to implement features like the Outbox Pattern, which we will explore below.
- **Enhanced testability.** The clear separation makes it easier to test business rules independently of data retrieval operations.

MediatR, as the in-process messaging library, provides the infrastructure for dispatching commands and queries to their appropriate handlers without coupling the API controllers directly to the handlers themselves.

Input validation is performed using FluentValidation, which is injected into MediatR through a pipeline behavior. This keeps validation concerns separate from business logic, ensuring consistency across all commands and queries:

```csharp
public class ValidationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseCommand
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }
        var context = new ValidationContext<TRequest>(request);
        var validationErrors = _validators
            .Select(validator => validator.Validate(context))
            .Where(validationResult => validationResult.Errors.Any())
            .SelectMany(validationResult => validationResult.Errors)
            .Select(validationFailure => new ValidationError(
                validationFailure.PropertyName,
                validationFailure.ErrorMessage))
            .ToList();
        if (validationErrors.Any())
        {
            throw new Exceptions.ValidationException(validationErrors);
        }
        return await next();
    }
}
```

For each command or query, a specific validator class is defined. For example, here's how validation for the ReserveBookingCommand might look:

```csharp
public class ReserveBookingCommandValidator : AbstractValidator<ReserveBookingCommand>
{
    public ReserveBookingCommandValidator()
    {
        RuleFor(x => x.ApartmentId)
            .NotEmpty()
            .WithMessage("Apartment ID is required");
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
        RuleFor(x => x.StartDate)
            .NotEmpty()
            .WithMessage("Start date is required");
        RuleFor(x => x.EndDate)
            .NotEmpty()
            .WithMessage("End date is required")
            .GreaterThan(x => x.StartDate)
            .WithMessage("End date must be after start date");
        RuleFor(x => x)
            .Must(x => (x.EndDate - x.StartDate).Days <= 14)
            .WithMessage("Booking duration cannot exceed 14 days");
    }
}
```

The Application Layer relies only on domain-level abstractions, such as IBookingRepository and IUnitOfWork. These are injected into handlers to manage persistence and transactions. This approach facilitates easy mocking and ensures that infrastructure concerns remain separate from business workflows.

### 3. Infrastructure Layer: The Implementor

The Infrastructure Layer handles all external concerns - databases, messaging systems, identity providers, and file storage.

We use Entity Framework Core (EF) for data access, implementing the repository interfaces defined in the Domain layer:

```csharp
internal sealed class ApartmentRepository : Repository<Apartment>, IApartmentRepository
{
    public ApartmentRepository(ApplicationDbContext dbContext)
        : base(dbContext)
    {
    }
    
    public async Task<List<Apartment>> GetAvailableAsync(
        SearchApartmentsQuery query,
        CancellationToken cancellationToken = default)
    {
        // Implementation using EF Core querying capabilities
        return await _dbContext.Apartments
            .Where(a => a.IsAvailable && a.Address.City == query.City)
            .AsNoTracking()
            .OrderBy(a => a.Price.Amount)
            .Take(query.MaxResults)
            .ToListAsync(cancellationToken);
    }
}
```

The base Repository<T> class provides everyday operations for all repositories:

```csharp
internal abstract class Repository<TEntity> where TEntity : Entity
{
    protected readonly ApplicationDbContext _dbContext;
    
    protected Repository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public virtual void Add(TEntity entity)
    {
        _dbContext.Set<TEntity>().Add(entity);
    }

    public virtual void Remove(TEntity entity)
    {
        _dbContext.Set<TEntity>().Remove(entity);
    }

    public virtual async Task<TEntity?> GetByIdAsync(
        Guid id, 
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<TEntity>()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }
}
```

This approach offers several significant benefits:

- **Domain model integrity.** The persistence layer doesn't leak into the domain; entities remain pure with no EF attributes or references.
- **Controlled mapping.** Value objects are correctly mapped as owned entities with custom conversions.
- **Clean separation.** Repository implementations are isolated in the Infrastructure layer, while interfaces remain in the Domain layer.
- **Specialized queries.** Each repository can implement domain-specific query methods while using EF Core's powerful LINQ capabilities.

In distributed systems, ensuring reliable event publishing is critical. When domain events and database transactions need to happen together, a common problem arises: what if the database transaction succeeds but the event publishing fails? Or what if events are published, but the transaction later rolls back? This inconsistency can lead to data corruption, missing business events, or incorrect system state.

The Outbox Pattern solves this problem by ensuring atomicity between database changes and event notifications. It functions as a transactional message buffer, ensuring that events are only published after their related database changes have been safely committed.

We implement this pattern by capturing domain events during database transactions and persisting them into an outbox_messages table (part of the same transaction). A Quartz.NET background job then periodically reads these events and publishes them in-process using MediatR. This "store now, publish later" approach ensures that no events are lost if the application crashes after committing data, no events are published if the transaction fails, events are eventually consistent with the database state, and retry mechanisms can be implemented for failed event processing.

External services are also handled in this layer: authentication via Keycloak using JWT Bearer tokens, caching with Redis through ICacheService, email via a concrete EmailService, and time abstraction via IDateTimeProvider.

### 4. Presentation Layer: The Interface

The Presentation Layer is the system's outermost boundary, handling HTTP requests, mapping them to application-level commands or queries, and returning standardized responses.

Each action is thin and delegates work to the Application Layer via MediatR:

```csharp
[Authorize]
[ApiController]
[ApiVersion(ApiVersions.V1)]
[Route("api/v{version:apiVersion}/bookings")]
public class BookingsController : ControllerBase
{
    private readonly ISender _sender;
    
    public BookingsController(ISender sender) => _sender = sender;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBooking(Guid id, CancellationToken cancellationToken)
    {
        var query = new GetBookingQuery(id);
        var result = await _sender.Send(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> ReserveBooking(
        ReserveBookingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ReserveBookingCommand(
            request.ApartmentId,
            request.UserId,
            request.StartDate,
            request.EndDate);
        var result = await _sender.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(result.Error);
        }
        return CreatedAtAction(nameof(GetBooking), new { id = result.Value }, result.Value);
    }
}
```

The key elements of the Presentation Layer include MediatR's ISender Interface (used to dispatch commands and queries to their handlers), HTTP Status Mapping (translating domain results to appropriate HTTP responses), Authentication (using JWT tokens with Keycloak), Global Error Handling (middleware that catches exceptions and transforms them into consistent responses), and API Versioning (future-proofing the API with version numbers in routes).

## Putting It All Together: Wiring Up The Architecture

The true power of Pragmatic Clean Architecture becomes apparent when we see how all layers connect. Everything starts with registration in Program.cs:

```csharp
var builder = WebApplication.CreateBuilder(args);
// Register all layers from bottom to top
builder.Services
    .AddDomain()
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddPresentation();
var app = builder.Build();
// Standard middleware configuration
app.UseExceptionHandler("/error");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

Each layer has its extension method, keeping the registration clean and modular. The Domain layer has minimal registration:

```csharp
public static IServiceCollection AddDomain(this IServiceCollection services)
{
    services.AddScoped<PricingService>();
    return services;
}
```

The Application layer registers MediatR and validation:

```csharp
public static IServiceCollection AddApplication(this IServiceCollection services)
{
    // Register MediatR and handlers
    services.AddMediatR(config => 
    {
        config.RegisterServicesFromAssembly(typeof(ReserveBookingCommand).Assembly);
        config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    });
    
    // Register validators
    services.AddValidatorsFromAssembly(typeof(ReserveBookingCommandValidator).Assembly);
    
    return services;
}
```

The Infrastructure layer connects to databases and external services:

```csharp
public static IServiceCollection AddInfrastructure(
    this IServiceCollection services,
    IConfiguration configuration)
{
    // Database connection
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));
    
    // Register repositories
    services.AddScoped<IBookingRepository, BookingRepository>();
    services.AddScoped<IApartmentRepository, ApartmentRepository>();
    
    // Other infrastructure services
    
    return services;
}
```

When a request comes in, it follows this path: HTTP Request arrives and the Controller action is called. The Controller maps the request to a Command/Query and passes it to ISender. MediatR runs it through pipeline behaviors (validation, logging, etc.). The appropriate Handler processes the command/query. The Handler uses Domain entities and rules to perform business logic. The Handler interacts with Infrastructure through repositories and services. Results flow back up the chain to the controller. The controller transforms the result into an HTTP Response.

This flow adheres to the dependency rule: outer layers depend on inner layers, but never the reverse.

## Testing Strategies

PCA's layered design enables targeted testing at every level.

Unit tests provide fast, isolated tests for domain logic:

```csharp
[Fact]
public void Reserve_Should_RaiseBookingReservedDomainEvent()
{
    // Arrange
    var user = User.Create(UserData.FirstName, UserData.LastName, UserData.Email);
    var price = new Money(10.0m, Currency.Usd);
    var duration = DateRange.Create(new DateOnly(2025, 1, 1), new DateOnly(2025, 1, 10));
    var apartment = ApartmentData.Create(price);
    var pricingService = new PricingService();
    // Act
    var booking = Booking.Reserve(apartment, user.Id, duration, DateTime.UtcNow, pricingService);
    // Assert
    var bookingReservedDomainEvent = AssertDomainEventWasPublished<BookingReservedDomainEvent>(booking);
    bookingReservedDomainEvent.BookingId.Should().Be(booking.Id);
}
```

Integration tests validate how components work together across layers:

```csharp
public class ConfirmBookingTests : BaseIntegrationTest
{
    [Fact]
    public async Task ConfirmBooking_ShouldReturnFailure_WhenBookingIsNotFound()
    {
        // Arrange
        var command = new ConfirmBookingCommand(BookingId);
    
        // Act
        var result = await Sender.Send(command);
    
        // Assert
        result.Error.Should().Be(BookingErrors.NotFound);
    }
    
    // More tests...
}
```

Functional tests simulate real user workflows end-to-end:

```csharp
public class LoginUserTests : BaseFunctionalTest
{
    [Fact]
    public async Task Login_ShouldReturnUnauthorized_WhenUserDoesNotExist()
    {
        // Arrange
        var request = new LogInUserRequest(Email, Password);
        // Act
        var response = await HttpClient.PostAsJsonAsync("api/v1/users/login", request);
        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
    
    // More tests...
}
```

Architecture tests enforce structural rules:

```csharp
[Fact]
public void DomainLayer_ShouldNotHaveDependencyOn_InfrastructureLayer()
{
    var result = Types.InAssembly(DomainAssembly)
        .Should()
        .NotHaveDependencyOn(InfrastructureAssembly.GetName().Name)
        .GetResult();
    result.IsSuccessful.Should().BeTrue();
}
```

## When to Use Pragmatic Clean Architecture

PCA offers several advantages: less boilerplate and complexity, more straightforward to implement and understand, fits well with small to mid-sized teams, encourages clean testable code without overengineering, better separation of concerns than traditional layered architecture, and faster onboarding for new team members.

There are also trade-offs to consider: slightly more overhead than minimal approaches, requires discipline to maintain boundaries, may need adaptation for very large or distributed systems, and there is an initial learning curve for teams new to DDD concepts.

## Final Thoughts

Pragmatic Clean Architecture demonstrates how a balance of structure and flexibility can lead to maintainable, testable, and evolvable systems. Each layer has a clearly defined role, allowing parts of the system to evolve independently with firm boundaries and minimal duplication.

This approach is efficient for systems with complex business rules, extensive integrations, and long-term maintenance requirements. While it introduces some overhead, the benefits in structure and clarity outweigh the costs in many real-world projects.

Most importantly, PCA aligns architecture with business value - helping teams build systems that can adapt to changing requirements while keeping technical debt at bay.

Want to see Pragmatic Clean Architecture in action? Check out the complete example on GitHub.
