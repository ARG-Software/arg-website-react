---
seoTitle: Circuit Breaker Pattern in ASP.NET Core
slug: circuit-breaker-pattern-aspnet-core
tag: .NET · Architecture
title: Stop Your ASP.NET Core App from Crashing: The Circuit Breaker Pattern Explained
subtitle: Ever watched your ASP.NET application grind to a halt because one tiny microservice decided to take a nap? Let's fix that.
date: October 24, 2025
readTime: 7 min read
mediumUrl: https://arg-software.medium.com/%EF%B8%8F-stop-your-asp-net-core-app-from-crashing-the-circuit-breaker-pattern-explained-9b5a4ba9f0c7
excerpt: You're running an e-commerce platform. Everything's going along nicely until your payment gateway starts having a bad day. Suddenly, every checkout request hangs for 30 seconds before timing out. Here's how the Circuit Breaker pattern prevents this nightmare.
---

![Stop your ASP Net Core App from crashing](/images/articles/stop-your-asp-net-core-app-from-crashing/stop-your-asp-net-core-app-from-crashing-header.webp)

Ever watched your ASP.NET application grind to a halt because one tiny microservice decided to take a nap? Yeah, we too. Let's fix that.

You're running an e-commerce platform. Everything's going along nicely until your payment gateway starts having a bad day. Suddenly, every checkout request hangs for 30 seconds before timing out. Your thread pool gets exhausted. Your app becomes a digital traffic jam. Customers abandon their carts. Your boss is calling.

What can you do to prevent this nightmare?

Think about the circuit breaker in your home. When there's an electrical fault, it flips off instantly to prevent your house from burning down. The software version works similarly - it disconnects from a failing service before it brings your entire system down with it.

Here's the good part: instead of your app desperately hammering a dead service like a squirrel on Red Bull, the circuit breaker says "Stop, we're not doing this right now" and fails fast.

## The Three States

### Closed (Green Light)

Everything's ok. Requests flow through normally. Your payment service is processing transactions like it should.

### Open (Red Light)

We've hit too many failures. The circuit breaker trips and blocks all requests immediately. No more waiting for timeouts - we fail instantly and save precious resources.

### Half-Open (Yellow Light)

After cooling down for a bit, we cautiously let a few test requests through. Is the payment service back? If so, we return to the Closed status. If not, we go back to Open.

## Real-World Example: Building a Weather Dashboard

Let's say you're building a dashboard that pulls data from multiple weather APIs. Here's how you'd protect yourself in ASP.NET Core.

First, add the following package:

```bash
dotnet add package Microsoft.Extensions.Http.Resilience
```

In your Program.cs:

```csharp
// Program.cs
builder.Services.AddHttpClient("WeatherService", client =>
{
    client.BaseAddress = new Uri("https://api.weather-service.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
})
.AddResilienceHandler("weather-pipeline", pipelineBuilder =>
{
    pipelineBuilder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        FailureRatio = 0.2,           // Trip after 20% failures
        MinimumThroughput = 5,        // Need at least 5 requests to evaluate
        SamplingDuration = TimeSpan.FromSeconds(20),
        BreakDuration = TimeSpan.FromSeconds(30)  // Stay open for 30 seconds
    });
});
```

Now in your service layer:

```csharp
using Polly;

public class WeatherService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WeatherService> _logger;

    public WeatherService(
        IHttpClientFactory httpClientFactory,
        ILogger<WeatherService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<WeatherData?> GetForecastAsync(string city)
    {
        var client = _httpClientFactory.CreateClient("WeatherService");
        try
        {
            var response = await client.GetAsync($"forecast?city={city}");
            
            if (response.IsSuccessStatusCode)
            {
                var data = await response.Content.ReadFromJsonAsync<WeatherData>();
                return data;
            }
            _logger.LogWarning("Weather API returned {StatusCode}", response.StatusCode);
            return null;
        }
        catch (BrokenCircuitException ex)
        {
            // Circuit is open! Use cached data or show a friendly message
            _logger.LogError("Circuit breaker is open: {Message}", ex.Message);
            return await GetCachedForecastAsync(city);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch weather data");
            return null;
        }
    }

    private async Task<WeatherData?> GetCachedForecastAsync(string city)
    {
        // Return stale but useful data from your cache
        _logger.LogInformation("Returning cached forecast for {City}", city);
        // Implementation here...
        return null;
    }
}
```

## Why This Matters

- **Your Users Stay Happy.** Nobody wants to stare at a loading spinner for 30 seconds. Fail fast, show a cached result or friendly error, and move on.
- **Your Servers Stay Alive.** Stop exhausting your thread pool waiting for a service that's clearly down. Those threads could be serving actual working requests.
- **The Failing Service Gets a Break.** By stopping the flood of requests, you give the struggling service a chance to recover instead of further overwhelming it.
- **Your Ops Team Gets Visibility.** When circuits start opening, you know immediately which services are struggling. No more "why is everything slow?" guessing games.

## Tips

**Don't Set It and Forget It.** Start with conservative thresholds and tune them based on real traffic. A 10% failure rate might be acceptable for a logging service, but not suitable for payments.

**Always Have a Fallback.** When the circuit opens, what happens? Cache? Default values? A friendly error message? Plan this!

**Monitor Your Circuits.** Export metrics about circuit state changes. When you see patterns of circuits opening, you've got early signs of problems.

**Combine with Other Patterns.** Circuit breakers work well alongside retries (for transient failures) and timeouts (to avoid hanging forever).

## The Bottom Line

The circuit breaker pattern isn't just a fancy buzzword - it's your safety net when things go wrong (and they will). It's the difference between a minor service hiccup and an outage.

Next time you're integrating with an external API, asking yourself "what happens when this fails?" isn't being pessimistic. It's being prepared.
