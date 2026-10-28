---
slug: api-gateway-bff
order: 7
title: API Gateway and Backend for Frontend
seoTitle: API Gateway vs BFF: Patterns with YARP and TypeScript
subtitle: One entry point for your services, or one backend per frontend: the API gateway and backend for frontend (BFF) patterns with YARP in C# and a TypeScript aggregation endpoint.
category: Architecture
tags: API Gateway, BFF, YARP
relatedPosts:
relatedPatterns: circuit-breaker, database-per-service
date: October 28, 2026
dateModified: October 28, 2026
---
An API gateway is a single entry point in front of your services that routes requests and handles shared concerns such as TLS, authentication, and rate limiting.

A backend for frontend (BFF) is a backend built for one specific client, such as the web app or the mobile app, that shapes data for that client's screens.

## The problem

Clients that call every service directly need to know every address, repeat authentication logic, and make several round trips per screen. A mobile app on a slow network pays for each call. Change the internal services and every client has to change with them.

## How the patterns work

- **API gateway:** one public endpoint that routes `/api/orders/...` to the orders service and `/api/catalog/...` to the catalog service. It is mostly configuration, with little or no business logic.
- **Backend for frontend:** one backend per client type. It calls several services, combines the results, and returns exactly what one screen needs.
- **Together:** many teams put a gateway at the edge and run one BFF per frontend behind it.

A BFF can also keep tokens on the server and give the browser an `HttpOnly` session cookie, so access tokens never sit in browser storage.

## C# example

YARP is Microsoft's reverse proxy library for ASP.NET Core. Routes and clusters can come from configuration or from code:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Yarp.ReverseProxy.Configuration;

public static class GatewayRegistration
{
    // In Program.cs: builder.Services.AddGateway(); then app.MapReverseProxy();
    public static IServiceCollection AddGateway(this IServiceCollection services)
    {
        services.AddReverseProxy().LoadFromMemory(
            routes:
            [
                Route("orders", "/api/orders/{**rest}"),
                Route("catalog", "/api/catalog/{**rest}"),
            ],
            clusters:
            [
                Cluster("orders", "http://orders:8080/"),
                Cluster("catalog", "http://catalog:8080/"),
            ]);

        return services;
    }

    private static RouteConfig Route(string id, string path) =>
        new() { RouteId = id, ClusterId = id, Match = new RouteMatch { Path = path } };

    private static ClusterConfig Cluster(string id, string address) =>
        new()
        {
            ClusterId = id,
            Destinations = new Dictionary<string, DestinationConfig>
            {
                ["primary"] = new() { Address = address },
            },
        };
}
```

## TypeScript example

A BFF endpoint calls two services in parallel and returns one screen-shaped response:

```typescript
interface Customer {
  id: string;
  name: string;
}

interface OrderSummary {
  id: string;
  status: string;
  totalCents: number;
}

const CUSTOMERS_URL = process.env.CUSTOMERS_URL ?? 'http://customers:8080';
const ORDERS_URL = process.env.ORDERS_URL ?? 'http://orders:8080';

// One endpoint per screen: the mobile account page gets exactly what it renders.
export async function getAccountScreen(customerId: string, accessToken: string) {
  const headers = { authorization: `Bearer ${accessToken}` };
  const id = encodeURIComponent(customerId);

  const [customer, orders] = await Promise.all([
    getJson<Customer>(`${CUSTOMERS_URL}/customers/${id}`, headers),
    getJson<OrderSummary[]>(`${ORDERS_URL}/orders?customerId=${id}`, headers),
  ]);

  return {
    name: customer.name,
    recentOrders: orders.slice(0, 5).map(({ id, status }) => ({ id, status })),
  };
}

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(3_000) });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return (await response.json()) as T;
}
```

## When to use it

- Several services sit behind one public API and clients shouldn't know the internal layout.
- Web and mobile need different data shapes, and one general-purpose API serves both badly.
- You want shared concerns, such as authentication and rate limits, in one place.

## When to avoid it

- A single backend service: the gateway adds a hop and buys nothing.
- When the gateway starts collecting business logic. It turns into a new monolith that every team has to change.
- One BFF shared by every client: that's just a general-purpose API again.

## FAQ

- **API gateway vs BFF: what's the difference?** A gateway is a shared, mostly generic entry point. A BFF is client-specific and composes data for that client.
- **Is YARP an API gateway?** YARP is a reverse proxy library. You build a gateway with it by adding routing, authentication, and rate limiting in ASP.NET Core.
- **Should the BFF hold business rules?** No. It composes and shapes data. Business rules stay in the services that own the data.
- **Does a BFF help with security?** It can. Keeping tokens on the server and using `HttpOnly` cookies keeps them away from scripts running in the browser.
