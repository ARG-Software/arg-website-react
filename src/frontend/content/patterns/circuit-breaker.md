---
slug: circuit-breaker
order: 6
title: Circuit Breaker Pattern
seoTitle: Circuit Breaker Pattern: Polly in C# and TypeScript
subtitle: Stop calling a failing dependency and fail fast instead: the circuit breaker pattern with Polly and Microsoft.Extensions.Http.Resilience in C#, and a small TypeScript implementation.
category: Resilience
tags: Circuit Breaker, Polly, Resilience
relatedPosts: circuit-breaker-pattern-aspnet-core, how-to-log-complex-systems-like-a-senior-backend-engineer
relatedPatterns: api-gateway-bff, saga
date: October 28, 2026
dateModified: October 28, 2026
---
A circuit breaker wraps calls to a remote dependency and stops making them once failures cross a threshold. While the circuit is open, calls fail immediately instead of waiting on timeouts, which protects your service and gives the dependency time to recover.

## The problem

A downstream API slows down. Every request to your service now waits on it, threads and connections pile up, and retries add even more load to the struggling dependency. One slow service turns into a cascading failure across everything that calls it.

## How the circuit breaker pattern works

- **Closed:** calls pass through and failures are counted.
- **Open:** after too many failures, calls fail fast for a set break duration without touching the network.
- **Half-open:** after the break, a trial call goes through. Success closes the circuit, failure opens it again.

Pair the breaker with a timeout, so slow calls count as failures, and with a fallback, so users see cached data or a clear message instead of an error page.

## C# example

In .NET, `Microsoft.Extensions.Http.Resilience` builds a Polly pipeline into `HttpClient`:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;

public static class WeatherClientRegistration
{
    public static IServiceCollection AddWeatherClient(this IServiceCollection services)
    {
        services.AddHttpClient("WeatherService", client =>
            {
                client.BaseAddress = new Uri("https://api.weather-service.com/");
                client.Timeout = Timeout.InfiniteTimeSpan; // The pipeline owns timeouts.
            })
            .AddResilienceHandler("weather-pipeline", pipeline =>
            {
                pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.2,       // Open at 20% handled failures...
                    MinimumThroughput = 5,    // ...once at least 5 calls were sampled...
                    SamplingDuration = TimeSpan.FromSeconds(20),
                    BreakDuration = TimeSpan.FromSeconds(30), // ...and stay open for 30 s.
                });

                // Inside the breaker, so timeouts count as failures.
                pipeline.AddTimeout(TimeSpan.FromSeconds(5));
            });

        return services;
    }
}
```

Callers catch `BrokenCircuitException` to fall back while the circuit is open:

```csharp
using System.Net.Http.Json;
using Polly.CircuitBreaker;

public sealed record Forecast(string City, double TemperatureC);

public sealed class WeatherService(IHttpClientFactory httpClientFactory)
{
    public async Task<Forecast?> GetForecast(string city, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("WeatherService");
        try
        {
            return await client.GetFromJsonAsync<Forecast>(
                $"forecast?city={Uri.EscapeDataString(city)}", ct);
        }
        catch (BrokenCircuitException)
        {
            return null; // Fail fast: show cached data or a "temporarily unavailable" state.
        }
    }
}
```

## TypeScript example

A minimal breaker shows the three states. Libraries such as opossum add rolling failure windows, fallbacks, and events for production use:

```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitOpenError extends Error {}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly breakDurationMs = 30_000
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.breakDurationMs) {
        throw new CircuitOpenError('Circuit is open'); // Fail fast, no network call.
      }
      this.state = 'half-open'; // Let a trial call through.
    }

    try {
      const result = await action();
      this.state = 'closed';
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      if (this.state === 'half-open' || this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.openedAt = Date.now();
      }
      throw error;
    }
  }
}

const weatherBreaker = new CircuitBreaker();

export const getForecast = (city: string) =>
  weatherBreaker.execute(async () => {
    const url = `https://api.weather-service.com/forecast?city=${encodeURIComponent(city)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`Weather service responded ${response.status}`);
    return response.json();
  });
```

## When to use it

- Calls to remote services or third-party APIs that can slow down or fail.
- A dependency that is shared by many requests, where waiting on it would exhaust your resources.
- Anywhere a fast, clear failure is better for users than a slow one.

## When to avoid it

- In-process calls and local work, where there is nothing remote to protect.
- As a fix for bugs: a breaker hides a dependency's failures, it doesn't repair them.
- Without monitoring. An open circuit should show up in logs and metrics, or it fails silently.

## FAQ

- **Circuit breaker vs retry: what's the difference?** Retries repeat a call that failed, hoping the next try works. A circuit breaker stops calling altogether when failures pile up. Use retries for brief glitches and the breaker for sustained failure.
- **What thresholds should I start with?** Start from the dependency's normal error rate and latency, then tune with real metrics. The C# example opens at a 20% failure ratio over at least five calls.
- **Should each dependency have its own breaker?** Yes. One shared breaker lets a failing service block calls to healthy ones.
- **Where should the breaker sit relative to the timeout?** Outside it, so a timeout counts as a failure the breaker can see.
