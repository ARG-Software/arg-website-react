---
slug: cqrs
order: 1
title: CQRS Pattern
seoTitle: CQRS Pattern: C# and TypeScript Examples
subtitle: Command Query Responsibility Segregation explained with a small C# dispatcher and a type-safe TypeScript version: separate writes from reads, and know when CQRS is overkill.
category: Architecture
tags: CQRS, .NET, TypeScript
relatedPosts: cqrs-without-mediatr, typescript-dependency-injection-without-framework, pragmatic-clean-architecture-aspnet-core
relatedPatterns: event-sourcing, aggregate, transactional-outbox
date: October 28, 2026
dateModified: October 28, 2026
---
CQRS (Command Query Responsibility Segregation) splits an application's operations into two kinds: commands that change state and queries that read it. Each side gets its own model, so writes can protect business rules while reads return exactly what a screen needs.

## The problem

One model for everything starts simple and gets harder every month. The same entity has to enforce invariants on writes, carry extra fields for reports, and be loaded with joins for list screens. Read optimizations leak into write code, and write rules slow down reads.

## How the CQRS pattern works

- **Commands** express intent, such as `CompleteTask`. A command handler loads the write model, applies the rules, saves, and returns at most an ID or a result.
- **Queries** ask for data, such as `GetTaskSummary`. A query handler reads straight into a DTO shaped for the caller and never changes state.
- **A dispatcher** routes each message to its single handler, which keeps controllers thin.

The read and write sides can share one database. Separate read stores, projections, and event sourcing are optional extras, not part of the core pattern.

## C# example

A dispatcher needs no library. Since version 13, MediatR is no longer under Apache-2.0, and this is the part of it most teams actually used:

```csharp
using Microsoft.Extensions.DependencyInjection;

public interface ICommand;
public interface IQuery<TResponse>;

public interface ICommandHandler<in TCommand> where TCommand : ICommand
{
    Task Handle(TCommand command, CancellationToken ct);
}

public interface IQueryHandler<in TQuery, TResponse> where TQuery : IQuery<TResponse>
{
    Task<TResponse> Handle(TQuery query, CancellationToken ct);
}

public sealed class Dispatcher(IServiceProvider services)
{
    public Task Send<TCommand>(TCommand command, CancellationToken ct)
        where TCommand : ICommand =>
        services.GetRequiredService<ICommandHandler<TCommand>>().Handle(command, ct);

    public Task<TResponse> Query<TQuery, TResponse>(TQuery query, CancellationToken ct)
        where TQuery : IQuery<TResponse> =>
        services.GetRequiredService<IQueryHandler<TQuery, TResponse>>().Handle(query, ct);
}

// Write side: changes state and returns nothing the UI renders.
public sealed record CompleteTask(Guid TaskId) : ICommand;

// Read side: returns a DTO shaped for one screen, never the entity.
public sealed record GetTaskSummary(Guid TaskId) : IQuery<TaskSummary>;
public sealed record TaskSummary(Guid Id, string Title, bool IsCompleted);
```

Register each handler in the container, for example `services.AddScoped<ICommandHandler<CompleteTask>, CompleteTaskHandler>()`, and inject `Dispatcher` into your endpoints. Logging and validation can wrap handlers as decorators.

## TypeScript example

In TypeScript, a mapped type over the message unions makes a missing handler a compile error:

```typescript
type Command = { type: 'CompleteTask'; taskId: string };
type Query = { type: 'GetTaskSummary'; taskId: string };

interface TaskSummary {
  id: string;
  title: string;
  isCompleted: boolean;
}

// Each query type maps to the shape it returns.
interface QueryResults {
  GetTaskSummary: TaskSummary;
}

type CommandHandlers = {
  [K in Command['type']]: (command: Extract<Command, { type: K }>) => Promise<void>;
};
type QueryHandlers = {
  [K in Query['type']]: (query: Extract<Query, { type: K }>) => Promise<QueryResults[K]>;
};

export function createDispatcher(commands: CommandHandlers, queries: QueryHandlers) {
  return {
    send: <C extends Command>(command: C) =>
      (commands[command.type] as (command: C) => Promise<void>)(command),
    query: <Q extends Query>(query: Q) =>
      (queries[query.type] as (query: Q) => Promise<QueryResults[Q['type']]>)(query),
  };
}

// A missing handler is a compile error, not a runtime surprise.
export const dispatcher = createDispatcher(
  { CompleteTask: async ({ taskId }) => console.log('completing', taskId) },
  { GetTaskSummary: async ({ taskId }) => ({ id: taskId, title: 'Ship it', isCompleted: false }) }
);
```

## When to use it

- Reads and writes have very different shapes, volumes, or performance needs.
- The write side has real business rules worth isolating from screen-specific queries.
- You want one clear place per use case, which also makes cross-cutting behavior easy to add.

## When to avoid it

- Simple CRUD screens where the read model and the write model are the same thing.
- Small services where a dispatcher adds indirection without removing any.
- When the team reads CQRS as "we need two databases and event sourcing". You don't.

## FAQ

- **Is CQRS the same as event sourcing?** No. CQRS separates reads from writes. Event sourcing stores state as a sequence of events. They combine well, but each works without the other.
- **Do I need MediatR for CQRS in .NET?** No. A dispatcher is a few lines over the built-in dependency injection container, as shown above.
- **Can commands return data?** Returning an ID or a success/failure result is common and practical. Returning full read models from commands blurs the split.
- **Does CQRS require two databases?** No. Start with one database and separate models in code. Move reads to a separate store only when you measure a need.
