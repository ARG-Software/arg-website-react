---
seoTitle: DI Anti-Patterns in ASP.NET Core
slug: dependency-injection-anti-patterns-aspnet-core
tag: .NET · Architecture
title: Dependency Injection Anti-Patterns Killing Your ASP.NET Core Apps
subtitle: How seemingly innocent DI mistakes can turn your high-performance application into a memory-leaking nightmare.
date: September 19, 2025
readTime: 8 min read
mediumUrl: https://arg-software.medium.com/dependency-injection-anti-patterns-killing-your-asp-net-core-apps-502f08d85d95
excerpt: After optimizing several enterprise .NET applications, we've witnessed the same dependency injection mistakes repeatedly sabotage otherwise well-architected systems. These silent performance killers don't just slow down your application — they transform your codebase into a maintenance nightmare that can bring down production systems.
---

![Dependency Injection Anti Patterns](/images/blog/dependency-injection-anti-patterns/dependency-injection-anti-patterns-header.webp)

After optimizing several enterprise .NET applications, we've witnessed the same dependency injection mistakes repeatedly sabotage otherwise well-architected systems. These silent performance killers don't just slow down your application - they transform your codebase into a maintenance nightmare that can bring down production systems.

The most frustrating part? These issues often fly under the radar during development, only to rear their ugly heads when your application is under real-world load. Let's dive into the six most dangerous DI anti-patterns that even senior developers fall victim to, and more importantly, how to fix them.

## 1. The Memory Leak Trap: Injecting Scoped and Transient Services Into Singletons

This is the most insidious anti-pattern we encounter. When your singleton service holds references to scoped or transient services, those supposedly short-lived services can never be garbage collected. They become prisoners in your singleton's memory space.

```csharp
// DON'T DO THIS
[Singleton]
public class ReportingService
{
    private readonly IDbContext _context; // Scoped service trapped!
    
    public ReportingService(IDbContext context)
    {
        _context = context;
    }
}
```

The result? Memory leaks that compound with every request until your application inevitably crashes with an OutOfMemoryException.

Embrace factory patterns to create scoped or transient services on demand:

```csharp
[Singleton]
public class ReportingService
{
    private readonly IServiceScopeFactory _scopeFactory;
    
    public ReportingService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }
    
    public async Task GenerateReportAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IDbContext>();
        // Use context safely
    }
}
```

## 2. The Performance Drain: Using Transient Services Everywhere

We've seen developers register every service as transient "just to be safe." Each transient service creates memory overhead per request, and when you're dealing with hundreds of services across thousands of requests, this adds up fast.

Start with a strategic approach to service lifetimes:

- **Transient.** Only when you absolutely need a fresh instance every time (rare).
- **Scoped.** Your default choice for most business logic services.
- **Singleton.** For stateless services, configurations, and expensive-to-create objects.

```csharp
// Better lifetime management
services.AddScoped<IUserService, UserService>();        // Default choice
services.AddSingleton<IConfiguration>(configuration);   // Stateless
services.AddTransient<IEmailValidator, EmailValidator>(); // Only when needed
```

## 3. The Concurrency Nightmare: Thread-Unsafe Singletons

Singleton services are shared across all requests and threads. Without proper synchronization, you'll encounter the worst kind of bugs: those that only appear under load and cause random crashes and data corruption.

```csharp
// DANGEROUS - NOT THREAD SAFE
[Singleton]
public class CacheService
{
    private Dictionary<string, object> _cache = new(); // Race condition waiting to happen
    
    public void Set(string key, object value)
    {
        _cache[key] = value; // Multiple threads can corrupt this
    }
}
```

Design singleton services to be immutable or implement proper thread synchronization:

```csharp
[Singleton]
public class CacheService
{
    private readonly ConcurrentDictionary<string, object> _cache = new();
    
    public void Set(string key, object value)
    {
        _cache[key] = value; // Thread-safe operations
    }
}
```

## 4. The Testability Killer: Service Locator Anti-Pattern

The Service Locator pattern hides dependencies behind IServiceProvider.GetService<T>() calls scattered throughout your code. While it appears convenient, it destroys testability and makes dependency relationships opaque.

```csharp
// Hard to test and maintain
public class OrderService
{
    private readonly IServiceProvider _serviceProvider;
    
    public void ProcessOrder(Order order)
    {
        var validator = _serviceProvider.GetService<IOrderValidator>(); // Hidden dependency
        var emailService = _serviceProvider.GetService<IEmailService>(); // Another hidden one
        // Logic here
    }
}
```

Make dependencies explicit through constructor injection:

```csharp
public class OrderService
{
    private readonly IOrderValidator _validator;
    private readonly IEmailService _emailService;
    
    public OrderService(IOrderValidator validator, IEmailService emailService)
    {
        _validator = validator;
        _emailService = emailService;
    }
    
    public void ProcessOrder(Order order)
    {
        // Dependencies are clear and testable
    }
}
```

## 5. The Memory Leak Landmine: Ignoring Service Disposal

When you manually resolve services using IServiceProvider, you become responsible for their disposal. Services implementing IDisposable that aren't properly released create memory leaks that accumulate over time.

```csharp
// Memory leak waiting to happen
public class BackgroundProcessor
{
    public void ProcessData()
    {
        var service = _serviceProvider.GetService<IDataProcessor>(); // If IDisposable, never disposed
        service.Process();
    }
}
```

Always use proper disposal patterns when manually resolving services:

```csharp
public class BackgroundProcessor
{
    public async Task ProcessDataAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IDataProcessor>();
        await service.ProcessAsync();
        // Automatic disposal when scope ends
    }
}
```

## 6. The Runtime Bomb: Circular Dependencies

Circular dependencies create an unsolvable puzzle for the DI container. Service A requires Service B, but Service B also requires Service A. This creates runtime exceptions that are particularly difficult to debug.

```csharp
public class UserService
{
    public UserService(IOrderService orderService) { } // Needs OrderService
}

public class OrderService
{
    public OrderService(IUserService userService) { } // Needs UserService - CIRCULAR!
}
```

Redesign your services to break the circular dependency. Consider using the mediator pattern or extracting shared logic into a separate service:

```csharp
public class UserService
{
    public UserService(ISharedBusinessLogic businessLogic) { }
}

public class OrderService
{
    public OrderService(ISharedBusinessLogic businessLogic) { }
}
```

## Pro Tip: Validate Your Container at Startup

Here's a game-changing practice that will save you from runtime surprises: force your ASP.NET Core application to validate all dependencies during startup rather than when they're first needed.

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // Your service registrations here
    
    // Validate container configuration at startup
    services.AddOptions<ServiceProviderOptions>()
        .Configure(options => options.ValidateOnBuild = true);
}
```

This simple configuration change will catch dependency resolution issues immediately during application startup, rather than letting them lurk until runtime.

## The Bottom Line

Dependency injection is a powerful tool, but like any sharp instrument, it can cut you if not handled properly. These anti-patterns might seem harmless during development, but they compound into serious issues under production load.

The key is to be intentional about your choices: understand service lifetimes, make dependencies explicit, consider thread safety, and always validate your container configuration.

Remember, the goal isn't just to make your code work - it's to make it work reliably, efficiently, and maintainably over time.
