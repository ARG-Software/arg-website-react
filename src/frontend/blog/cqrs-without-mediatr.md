---
seoTitle: CQRS in .NET Without MediatR
slug: cqrs-without-mediatr
tag: Architecture
tags: Architecture, Backend, Refactoring
title: .NET CQRS Architecture Without MediatR — Your Exit Plan Is Simpler Than You Think
subtitle: MediatR changed its licensing. Learn how to build a clean .NET CQRS architecture using interfaces, dispatchers, and decorators.
intro: MediatR changed its licensing. Learn how to build a clean .NET CQRS architecture using interfaces, dispatchers, and decorators.
date: February 23, 2026
dateModified: September 19, 2026
reviewedOn: September 19, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/net-cqrs-architecture-without-mediatr-your-exit-plan-is-simpler-than-you-think-3c8f99077a03
---

![.NET CQRS Architecture without MediatR](/images/blog/net-cqrs-architecture-without-mediatr/net-cqrs-architecture-without-mediatr-header.webp)

There's a moment in every .NET developer's journey when they install MediatR, wire up their first pipeline behavior, and think: "This is clean. This is elegant. This is the way."

And for a while, it works great.

But something happened over the years - MediatR became so tightly associated with CQRS that most developers stopped thinking of them as two separate things. Ask a team, "How did you implement CQRS?" and there's a good chance the answer starts with "we use MediatR."

Here's the thing: CQRS is a pattern. MediatR is a library.

They're not the same, and conflating them has been quietly making codebases more opaque than they need to be.

MediatR 13 and later are no longer distributed under Apache-2.0. They are available under the Reciprocal Public License 1.5 or Lucky Penny's Community and commercial licenses, while MediatR 12.5 and earlier retain Apache-2.0. That change has many teams asking a question they should have asked earlier: Do we even need this dependency?

Spoiler: many applications don't. And by the end of this article, you'll have a small dispatch layer that you own and can adapt to your needs.

## Why Most Teams Don't Actually Need MediatR

MediatR solves a specific problem - it decouples senders from handlers using an in-process mediator. That's a real architectural concept, and there are scenarios where it genuinely pays off.

But let's be honest about what the average project uses it for.

It's a dispatcher. You define a request, register a handler, and call _sender.Send(new MyCommand(...)). The library figures out which handler to invoke and calls it.

That's it. There's no inter-process communication, no complex routing - just a pattern with some ceremony attached to it.

The actual CQRS value - separating reads from writes and making intent explicit in your types - has nothing to do with the mediator abstraction itself. You can get all of that with plain interfaces, a small dispatcher, and some naming conventions.

## The Minimal CQRS Setup You Actually Need

Let's build this from scratch. The goal is simple: a clean, explicit way to dispatch commands and queries with support for cross-cutting concerns like logging and validation, without a mediator package.

### Step 1: Define Your Intent Markers

Start with marker interfaces that tell the compiler (and your teammates) what a class is for:

```csharp
public interface ICommand;
public interface ICommand<TResponse>;
public interface IQuery<TResponse>;
```

These don't carry behavior. They declare intent. A class that implements ICommand<InvoiceDto> is unambiguously a write operation that returns an InvoiceDto. A class implementing IQuery<List<OrderSummary>> a read operation returning a list. The types communicate the design before you even read the logic.

The semicolon-only declarations use C# 12. On earlier language versions, give each interface an empty brace body instead.

### Step 2: Define Handler Contracts

Now we need the handler interfaces that will wrap the actual business logic:

```csharp
public interface ICommandHandler<in TCommand>
    where TCommand : ICommand
{
    Task<Result> Handle(TCommand command, CancellationToken cancellationToken);
}

public interface ICommandHandler<in TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    Task<Result<TResponse>> Handle(TCommand command, CancellationToken cancellationToken);
}

public interface IQueryHandler<in TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{
    Task<Result<TResponse>> Handle(TQuery query, CancellationToken cancellationToken);
}
```

The Result<T> wrapper is a deliberate choice - it makes the success/failure contract explicit at the type level rather than relying on exceptions for control flow. This pairs well with functional-style error handling and keeps controllers clean. If you're not already using a result type, this is a good moment to adopt the pattern. See our other article about it.

### Step 3: Build Your Dispatchers

Here's where this approach pays a real dividend over injecting handlers one by one. Instead of polluting your controllers with a growing list of ICommandHandler<X> constructor parameters, you expose two clean facades - one for commands, one for queries.

```csharp
public interface ICommandDispatcher
{
    Task<Result> Dispatch<TCommand>(TCommand command, CancellationToken ct)
        where TCommand : ICommand;

    Task<Result<TResponse>> Dispatch<TCommand, TResponse>(TCommand command, CancellationToken ct)
        where TCommand : ICommand<TResponse>;
}

public interface IQueryDispatcher
{
    Task<Result<TResponse>> Dispatch<TQuery, TResponse>(TQuery query, CancellationToken ct)
        where TQuery : IQuery<TResponse>;
}
```

There is one ergonomic difference from MediatR worth making explicit. C# cannot infer `TResponse` from a generic constraint or return type, so response-returning commands and queries must supply both type arguments:

```csharp
await commands.Dispatch<CreateInvoiceCommand, InvoiceDto>(command, ct);
await queries.Dispatch<GetInvoiceQuery, InvoiceDto>(query, ct);
```

The implementations resolve the correct handler from the DI container at runtime using IServiceProvider:

```csharp
public class CommandDispatcher(IServiceProvider sp) : ICommandDispatcher
{
    public Task<Result> Dispatch<TCommand>(TCommand command, CancellationToken ct)
        where TCommand : ICommand
    {
        var handler = sp.GetRequiredService<ICommandHandler<TCommand>>();
        return handler.Handle(command, ct);
    }

    public Task<Result<TResponse>> Dispatch<TCommand, TResponse>(
        TCommand command, CancellationToken ct)
        where TCommand : ICommand<TResponse>
    {
        var handler = sp.GetRequiredService<ICommandHandler<TCommand, TResponse>>();
        return handler.Handle(command, ct);
    }
}

public class QueryDispatcher(IServiceProvider sp) : IQueryDispatcher
{
    public Task<Result<TResponse>> Dispatch<TQuery, TResponse>(
        TQuery query, CancellationToken ct)
        where TQuery : IQuery<TResponse>
    {
        var handler = sp.GetRequiredService<IQueryHandler<TQuery, TResponse>>();
        return handler.Handle(query, ct);
    }
}
```

This is functionally similar to MediatR's ISender, but the dispatch code belongs to your application and carries no MediatR licensing obligation. It still depends on Microsoft DI, and handler presence, uniqueness, lifetime, and decoration remain container configuration concerns.

The dispatcher contracts fit naturally in Application, while Domain should know nothing about them. The shown implementations directly depend on `IServiceProvider` and `GetRequiredService`, so teams that keep Application independent of DI frameworks can place those implementations at the composition boundary instead. Keeping runtime service location confined to this small adapter is important because Microsoft recommends constructor injection over the service locator pattern in application code.

## A Real Example: Completing a Task

Let's see these pieces working together with a concrete use case - marking a task as completed in a to-do application.

```csharp
public sealed record CompleteTaskCommand(Guid TaskId) : ICommand;

internal sealed class CompleteTaskCommandHandler(
    IAppDbContext db,
    IDateTimeProvider clock,
    IUserContext user)
    : ICommandHandler<CompleteTaskCommand>
{
    public async Task<Result> Handle(
        CompleteTaskCommand command,
        CancellationToken cancellationToken)
    {
        var task = await db.Tasks
            .SingleOrDefaultAsync(
                t => t.Id == command.TaskId && t.OwnerId == user.Id,
                cancellationToken);

        if (task is null)
            return Result.Failure(TaskErrors.NotFound(command.TaskId));

        if (task.IsCompleted)
            return Result.Failure(TaskErrors.AlreadyCompleted(command.TaskId));

        task.IsCompleted = true;
        task.CompletedAt = clock.UtcNow;
        task.Raise(new TaskCompletedEvent(task.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
```

The command is an immutable record - pure data, no behavior. The handler owns all the business logic: authorization-by-ownership, state validation, domain event raising, and persistence. There's nothing hidden; the entire lifecycle is visible in one class.

## Adding Cross-Cutting Concerns: Decorators

One of the most common reasons teams reach for MediatR is pipeline behaviors - the ability to inject logging, validation, or transaction management around every command without modifying the handlers themselves. We can achieve exactly the same thing with the decorator pattern.

### Logging Decorator

```csharp
internal sealed class LoggingCommandHandler<TCommand, TResponse>(
    ICommandHandler<TCommand, TResponse> inner,
    ILogger<LoggingCommandHandler<TCommand, TResponse>> logger)
    : ICommandHandler<TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    public async Task<Result<TResponse>> Handle(
        TCommand command, CancellationToken cancellationToken)
    {
        var name = typeof(TCommand).Name;
        logger.LogInformation("Handling {Command}", name);
        var result = await inner.Handle(command, cancellationToken);
        if (result.IsSuccess)
            logger.LogInformation("{Command} completed successfully", name);
        else
            logger.LogError("{Command} failed: {Error}", name, result.Error);
        return result;
    }
}
```

### Validation Decorator

```csharp
internal sealed class ValidationCommandHandler<TCommand, TResponse>(
    ICommandHandler<TCommand, TResponse> inner,
    IEnumerable<IValidator<TCommand>> validators)
    : ICommandHandler<TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    public async Task<Result<TResponse>> Handle(
        TCommand command, CancellationToken cancellationToken)
    {
        var context = new ValidationContext<TCommand>(command);

        var failures = new List<ValidationFailure>();
        foreach (var validator in validators)
        {
            var result = await validator.ValidateAsync(context, cancellationToken);
            failures.AddRange(result.Errors.Where(f => f != null));
        }

        if (failures.Count > 0)
            return Result.Failure<TResponse>(BuildValidationError(failures.ToArray()));

        return await inner.Handle(command, cancellationToken);
    }

    private static ValidationError BuildValidationError(ValidationFailure[] failures) =>
        new(failures.Select(f => Error.Problem(f.ErrorCode, f.ErrorMessage)).ToArray());
}
```

Each decorator wraps the inner handler with a single responsibility. They're composable, individually testable, and use ordinary DI decoration rather than mediator pipeline APIs. Because the dispatcher resolves handlers from DI, the configured decorator chain is applied every time you call Dispatch(...) without extra wiring on the caller side.

## Do You Even Need Scrutor?

This is where many articles just say "install Scrutor" and move on. Let's be more deliberate about it.

Scrutor is optional. You can register everything with plain Microsoft DI:

```csharp
services.AddScoped<ICommandHandler<CompleteTaskCommand>, CompleteTaskCommandHandler>();
services.AddScoped<IQueryHandler<GetTaskQuery, TaskDto>, GetTaskQueryHandler>();
```

The problem is obvious - this doesn't scale. Every time you add a new handler, you have to remember to register it. In a real app with 50+ handlers that becomes a maintenance nightmare fast.

What Scrutor actually gives you is two things. The first is assembly scanning - it automatically discovers and registers all your handlers without you having to touch the DI setup every time you add a new one. The second is services.Decorate() - a clean API for wrapping registered services with decorators. Microsoft's built-in DI container doesn't have this out of the box.

If you really want to skip Scrutor, you can replicate the scanning yourself with reflection. The scanner must select every exact handler interface and exclude abstract or open generic types, including the decorators:

```csharp
var assembly = typeof(DependencyInjection).Assembly;
var handlerDefinitions = new[]
{
    typeof(ICommandHandler<>),
    typeof(ICommandHandler<,>),
    typeof(IQueryHandler<,>)
};

foreach (var handlerType in assembly.DefinedTypes.Where(type =>
             !type.IsAbstract &&
             !type.IsInterface &&
             !type.ContainsGenericParameters))
{
    foreach (var interfaceType in handlerType.ImplementedInterfaces.Where(type =>
                 type.IsGenericType &&
                 handlerDefinitions.Contains(type.GetGenericTypeDefinition())))
    {
        services.AddScoped(interfaceType, handlerType.AsType());
    }
}
```

It works, but now you own reflection code that needs tests as the handler model evolves. As of September 2026, Scrutor 7's NuGet package is 197.4KB and its .NET 8 assembly is about 60KB. It has two direct dependencies, `Microsoft.Extensions.DependencyInjection.Abstractions` and `Microsoft.Extensions.DependencyModel`. It remains a small, MIT-licensed package, and for most teams the trade-off favors using it instead of maintaining custom scanning and decoration code.

The registration below also refers to `ValidationCommandHandlerBase<>`, `LoggingQueryHandler<,>`, and `LoggingCommandHandlerBase<>`. They are the non-response command and query equivalents of the decorators shown above; implement them before using these registrations, or remove the corresponding lines. The application's `Result`, error mapping, validators, and persistence abstractions are likewise project-specific rather than supplied by this setup.

With those pieces in place, a representative Scrutor setup looks like this:

```csharp
// Register all handlers via assembly scanning
services.Scan(scan => scan
    .FromAssembliesOf(typeof(DependencyInjection))
    .AddClasses(c => c
            .AssignableTo(typeof(IQueryHandler<,>))
            .Where(type => !type.ContainsGenericParameters),
        publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime()
    .AddClasses(c => c
            .AssignableTo(typeof(ICommandHandler<>))
            .Where(type => !type.ContainsGenericParameters),
        publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime()
    .AddClasses(c => c
            .AssignableTo(typeof(ICommandHandler<,>))
            .Where(type => !type.ContainsGenericParameters),
        publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime());

// TryDecorate leaves optional handler families alone when none are registered
services.TryDecorate(typeof(ICommandHandler<,>), typeof(ValidationCommandHandler<,>));
services.TryDecorate(typeof(ICommandHandler<>), typeof(ValidationCommandHandlerBase<>));
services.TryDecorate(typeof(IQueryHandler<,>),  typeof(LoggingQueryHandler<,>));
services.TryDecorate(typeof(ICommandHandler<,>), typeof(LoggingCommandHandler<,>));
services.TryDecorate(typeof(ICommandHandler<>), typeof(LoggingCommandHandlerBase<>));

// Register the dispatchers
services.AddScoped<ICommandDispatcher, CommandDispatcher>();
services.AddScoped<IQueryDispatcher, QueryDispatcher>();
```

A subtle but important point: the last successful decoration becomes the outermost layer. In the setup above, logging runs first at runtime, then validation, then the core handler. This is exactly what you want: logging captures the full lifecycle, including early exits from validation failures. Filtering out types with unbound generic parameters is also essential here; otherwise the scan discovers the open generic decorators themselves and registers them as ordinary handlers.

## Using It in a Controller

With the dispatchers registered, a controller needs only two CQRS-facing dependencies regardless of how many commands and queries it handles:

```csharp
[ApiController]
[Route("tasks")]
public class TasksController(
    ICommandDispatcher commands,
    IQueryDispatcher queries) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await queries.Dispatch<GetTaskQuery, TaskDto>(
            new GetTaskQuery(id), ct);
        return result.Match(Ok, Problem);
    }
    
    [HttpPut("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var result = await commands.Dispatch(new CompleteTaskCommand(id), ct);
        return result.Match(NoContent, Problem);
    }
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await commands.Dispatch(new DeleteTaskCommand(id), ct);
        return result.Match(NoContent, Problem);
    }
}
```

No matter how many CQRS actions you add to this controller, those two dependencies stay the same. Other responsibilities may still require their own collaborators, but adding another handler does not add another constructor argument.

This is the real reason the dispatcher pattern earns its place: it gives you much of MediatR's request/handler ergonomics without the mediator package. You get a unified entry point and compile-time request constraints, while accepting that handler discovery and resolution are still runtime DI concerns.

## What You Actually Gain

- **The dispatch path stays small.** Stack traces can still include the dispatcher and decorators, but every layer is application-owned and easy to inspect.
- **Onboarding is faster.** New developers don't need to know a library to understand the code - just the interfaces.
- **Controllers stay lean.** Commands and queries share two entry points. Adding a use case means adding a handler rather than another CQRS constructor argument.
- **Testing is flexible.** Mock the dispatcher for controller unit tests, instantiate handlers directly for handler unit tests, and use the real container and decorator chain for integration tests.
- **You own the infrastructure.** Adding new handler variants, changing the decorator chain, or evolving the Result type doesn't require reading library documentation or waiting for updates.

## The Bigger Picture

The question here isn't really "should I use MediatR?" The more valuable question is: do I understand what this abstraction is actually doing, and is the cost worth the benefit?

MediatR earned its place in the ecosystem, and for scenarios that rely heavily on in-process notifications, streams, pipeline behaviors, or plugin-style dispatch, it can still make sense. For many CRUD-oriented applications, however, a small explicit dispatcher may provide enough value with less indirection.

CQRS is about making the intent of your operations explicit in the type system. That's an idea, not a library. And ideas don't come with license fees.
