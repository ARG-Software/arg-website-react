---
slug: cqrs-without-mediatr
tag: .NET · Architecture
title: .NET CQRS Architecture Without MediatR — Your Exit Plan Is Simpler Than You Think
subtitle: You've been paying a framework tax for years. Here's how to stop — and build something reliable in an afternoon.
date: February 23, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/net-cqrs-architecture-without-mediatr-your-exit-plan-is-simpler-than-you-think-3c8f99077a03
excerpt: CQRS is a pattern. MediatR is a library. They're not the same, and conflating them has been quietly making codebases more opaque than they need to be. Now that MediatR is moving to a commercial licensing model, here is how to build a clean, fully-owned replacement in an afternoon.
---

![.NET CQRS Architecture without MediatR](/images/articles/net-cqrs-architecture-without-mediatr/net-cqrs-architecture-without-mediatr-header.webp)

There's a moment in every .NET developer's journey when they install MediatR, wire up their first pipeline behavior, and think: "This is clean. This is elegant. This is the way."

And for a while, it works great.

But something happened over the years - MediatR became so tightly associated with CQRS that most developers stopped thinking of them as two separate things. Ask a team, "How did you implement CQRS?" and there's a good chance the answer starts with "we use MediatR."

Here's the thing: CQRS is a pattern. MediatR is a library.

They're not the same, and conflating them has been quietly making codebases more opaque than they need to be.

Now that MediatR is moving to a commercial licensing model, many teams are finally asking a question they should have asked earlier: Do we even need this?

Spoiler: you probably don't. And by the end of this article, you'll have a clean replacement that you fully own.

## Why Most Teams Don't Actually Need MediatR

MediatR solves a specific problem - it decouples senders from handlers using an in-process mediator. That's a real architectural concept, and there are scenarios where it genuinely pays off.

But let's be honest about what the average project uses it for.

It's a dispatcher. You define a request, register a handler, and call _sender.Send(new MyCommand(...)). The library figures out which handler to invoke and calls it.

That's it. There's no inter-process communication, no complex routing - just a pattern with some ceremony attached to it.

The actual CQRS value - separating reads from writes and making intent explicit in your types - has nothing to do with the mediator abstraction itself. You can get all of that with plain interfaces, a small dispatcher, and some naming conventions.

## The Minimal CQRS Setup You Actually Need

Let's build this from scratch. The goal is simple: a clean, explicit way to dispatch commands and queries with full support for cross-cutting concerns like logging and validation - no framework required.

### Step 1: Define Your Intent Markers

Start with marker interfaces that tell the compiler (and your teammates) what a class is for:

```csharp
public interface ICommand;
public interface ICommand<TResponse>;
public interface IQuery<TResponse>;
```

These don't carry behavior. They declare intent. A class that implements ICommand<InvoiceDto> is unambiguously a write operation that returns an InvoiceDto. A class implementing IQuery<List<OrderSummary>> a read operation returning a list. The types communicate the design before you even read the logic.

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

This is functionally similar to MediatR's ISender - but you wrote it, you understand every line of it, and it has no license attached.

Dispatchers should never live in Infrastructure (they don't talk to external systems) or in Domain (Domain has no knowledge of application orchestration). Application is their natural home.

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

        var failures = (await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, cancellationToken))))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToArray();

        if (failures.Length > 0)
            return Result.Failure<TResponse>(BuildValidationError(failures));

        return await inner.Handle(command, cancellationToken);
    }

    private static ValidationError BuildValidationError(ValidationFailure[] failures) =>
        new(failures.Select(f => Error.Problem(f.ErrorCode, f.ErrorMessage)).ToArray());
}
```

Each decorator wraps the inner handler with a single responsibility. They're composable, individually testable, and completely free of framework ceremony. And because the dispatcher resolves handlers from DI, the full decorator chain is automatically applied every time you call Dispatch(...) - without any extra wiring on the caller side.

## Do You Even Need Scrutor?

This is where many articles just say "install Scrutor" and move on. Let's be more deliberate about it.

Scrutor is optional. You can register everything with plain Microsoft DI:

```csharp
services.AddScoped<ICommandHandler<CompleteTaskCommand>, CompleteTaskCommandHandler>();
services.AddScoped<IQueryHandler<GetTaskQuery, TaskDto>, GetTaskQueryHandler>();
```

The problem is obvious - this doesn't scale. Every time you add a new handler, you have to remember to register it. In a real app with 50+ handlers that becomes a maintenance nightmare fast.

What Scrutor actually gives you is two things. The first is assembly scanning - it automatically discovers and registers all your handlers without you having to touch the DI setup every time you add a new one. The second is services.Decorate() - a clean API for wrapping registered services with decorators. Microsoft's built-in DI container doesn't have this out of the box.

If you really want to skip Scrutor, you can replicate the scanning yourself with reflection:

```csharp
var assembly = typeof(DependencyInjection).Assembly;
var handlerTypes = assembly.GetTypes()
    .Where(t => t.GetInterfaces()
        .Any(i => i.IsGenericType &&
             i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>)));

foreach (var handlerType in handlerTypes)
{
    var interfaceType = handlerType.GetInterfaces().First();
    services.AddScoped(interfaceType, handlerType);
}
```

It works - but now you own that reflection code and have to maintain it. Scrutor is only 19KB with zero transitive dependencies. For most teams, the trade-off strongly favors just using it.

With Scrutor, the full DI setup looks like this:

```csharp
// Register all handlers via assembly scanning
services.Scan(scan => scan
    .FromAssembliesOf(typeof(DependencyInjection))
    .AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)), publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime()
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<>)), publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime()
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<,>)), publicOnly: false)
        .AsImplementedInterfaces()
        .WithScopedLifetime());

// Apply decorators
services.Decorate(typeof(ICommandHandler<,>), typeof(ValidationCommandHandler<,>));
services.Decorate(typeof(ICommandHandler<>), typeof(ValidationCommandHandlerBase<>));
services.Decorate(typeof(IQueryHandler<,>),  typeof(LoggingQueryHandler<,>));
services.Decorate(typeof(ICommandHandler<,>), typeof(LoggingCommandHandler<,>));
services.Decorate(typeof(ICommandHandler<>), typeof(LoggingCommandHandlerBase<>));

// Register the dispatchers
services.AddScoped<ICommandDispatcher, CommandDispatcher>();
services.AddScoped<IQueryDispatcher, QueryDispatcher>();
```

A subtle but important point: the last Decorate call becomes the outermost layer. In the setup above, logging runs first at runtime, then validation, then the core handler. This is exactly what you want - logging captures the full lifecycle, including early exits from validation failures.

## Using It in a Controller

With the dispatchers registered, any controller only ever needs two dependencies - regardless of how many use cases it handles:

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

No matter how many actions you add to this controller, the constructor stays the same. ICommandDispatcher and IQueryDispatcher scale with your feature set without growing your dependency list. Add ten new use cases tomorrow - the controller signature doesn't change.

This is the real reason the dispatcher pattern earns its place: it gives you MediatR's ergonomics without the library. You get a single unified entry point, a clean controller, full type safety - and you wrote every line of the infrastructure yourself.

## What You Actually Gain

- **Debugging becomes trivial.** Stack traces go directly to the handler. No mediator indirection to unravel.
- **Onboarding is faster.** New developers don't need to know a library to understand the code - just the interfaces.
- **Controllers stay lean.** Two constructor parameters, forever. Adding a new use case means adding a new handler class, not a new constructor argument.
- **Testing is flexible.** Mock ICommandDispatcher at the controller level for integration-style tests, or mock individual ICommandHandler<T> implementations for pure unit tests - whatever granularity the situation calls for.
- **You own the infrastructure.** Adding new handler variants, changing the decorator chain, or evolving the Result type doesn't require reading library documentation or waiting for updates.

## The Bigger Picture

The question here isn't really "should I use MediatR?" The more valuable question is: do I understand what this abstraction is actually doing, and is the cost worth the benefit?

MediatR earned its place in the ecosystem, and for complex scenarios - event-driven architectures, plugin systems, or teams that heavily rely on notification handlers - it still makes sense. But for the vast majority of apps, it was adding indirection without adding value.

CQRS is about making the intent of your operations explicit in the type system. That's an idea, not a library. And ideas don't come with license fees.
