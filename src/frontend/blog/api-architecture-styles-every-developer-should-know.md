---
seoTitle: API Architecture Styles for Developers
slug: api-architecture-styles-every-developer-should-know
tag: Architecture
tags: Architecture, Backend
title: API Architecture Styles Every Developer Should Know
subtitle: Compare REST, gRPC, GraphQL, WebSocket, SOAP, and MQTT by contract, transport, operational cost, and use case.
intro: Compare REST, gRPC, GraphQL, WebSocket, SOAP, and MQTT by contract, transport, operational cost, and use case.
date: November 6, 2025
dateModified: September 20, 2026
reviewedOn: September 20, 2026
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/api-architecture-styles-every-developer-should-know-74bd544820fb
---

Choosing an API style is not a popularity contest. The useful question is whether its constraints fit your clients, data, latency budget, network, security model, and operating team.

The six options below are not always direct substitutes. REST and GraphQL commonly describe application-facing APIs; gRPC is an RPC framework; WebSocket is a bidirectional transport; MQTT is a brokered messaging protocol; and SOAP is an extensible messaging framework. A production system may use several of them at different boundaries.

![API Architecture Styles](/images/blog/api-architecture-styles/api-architecture-styles.webp)

## 1. REST: A Resource-Oriented Default

**Good fit for:** HTTP APIs, public integrations, CRUD-heavy services, and systems that benefit from standard HTTP semantics and intermediaries.

REST is an architectural style, not a wire protocol or a synonym for JSON over HTTP. Its constraints include client-server separation, stateless interactions, cacheability, a uniform interface, and a layered system. In practice, many APIs described as RESTful implement only part of that model.

Why teams choose it:

- Broad client, proxy, gateway, observability, and OpenAPI tooling
- Standard HTTP methods, status codes, content negotiation, and cache controls
- Human-readable requests when JSON is used
- A stable resource model that can hide implementation details

```http
GET /api/users/123 HTTP/1.1
Host: api.example.com
Accept: application/json

POST /api/users HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

PATCH /api/users/123 HTTP/1.1
Host: api.example.com
Content-Type: application/merge-patch+json

{
  "name": "Jane Smith"
}
```

The use of `PATCH` is deliberate: a partial object sent with `PUT` is ambiguous because `PUT` represents replacement of the target resource's state. If an API supports partial updates, define the patch media type and semantics explicitly.

Tradeoffs:

- Resource boundaries and consistent semantics require design work
- Clients may need several requests to assemble a complex screen
- Cacheability is available, not automatic; responses still need correct cache metadata
- JSON payload size and parsing can matter on constrained or high-throughput paths

Choose REST when standard HTTP behavior, broad compatibility, and a comprehensible public contract matter more than a highly specialized interaction model.

## 2. gRPC: Contract-First Remote Procedure Calls

**Good fit for:** Internal service-to-service calls, strongly typed polyglot systems, streaming, and measured low-latency or high-throughput workloads.

gRPC defines services and messages in an interface definition language. Protocol Buffers are the default IDL and message format, and generated clients expose remote methods through language-native APIs. gRPC supports unary, client-streaming, server-streaming, and bidirectional-streaming RPCs.

```protobuf
syntax = "proto3";

package users.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc WatchUsers(WatchUsersRequest) returns (stream User);
}

message GetUserRequest {
  int64 user_id = 1;
}

message WatchUsersRequest {}

message User {
  int64 user_id = 1;
  string name = 2;
  string email = 3;
}
```

Why teams choose it:

- Explicit schemas and generated client/server code
- Compact binary messages
- First-class streaming and deadlines
- Consistent contracts across supported languages

Do not rely on generic claims such as "gRPC is 10x faster than REST." Results vary with payloads, serialization, connection reuse, compression, runtime, and network conditions. Benchmark the actual workload. Also plan for schema evolution: never reuse removed field numbers, and make additive changes where possible.

Native browser clients do not expose the full HTTP/2 capabilities used by standard gRPC. Browser-facing deployments normally need gRPC-Web or another gateway, with different streaming constraints.

Choose gRPC when the contract and runtime ecosystem are controlled, generated clients are an advantage, and measurements justify the operational complexity.

## 3. GraphQL: Client-Selected Response Shapes

**Good fit for:** Product surfaces with several client types, graph-shaped domains, and screens that otherwise require many purpose-built endpoints.

GraphQL lets a client select fields from a typed schema. That can reduce over-fetching and aggregate data behind one graph, but it does not guarantee one backend call, low latency, or a simple production system.

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts(first: Int!, after: String): PostConnection!
}

type Post {
  title: String!
}

type PostConnection {
  nodes: [Post!]!
}

type Query {
  user(id: ID!): User
}
```

```graphql
query UserSummary($id: ID!) {
  user(id: $id) {
    name
    posts(first: 10) {
      nodes {
        title
      }
    }
  }
}
```

Why teams choose it:

- A typed, introspectable schema
- Client-selected response shapes
- One graph that can compose several domain capabilities
- Schema evolution through additive fields and explicit deprecation

Tradeoffs:

- Resolver fan-out can create N+1 queries without batching and caching
- Authorization must be enforced at the domain or data layer, not inferred from field visibility
- Query depth, breadth, aliases, and cost need limits to resist resource-exhaustion attacks
- HTTP caching is less automatic when many operations share an endpoint
- Pagination, observability, persisted operations, and schema governance require deliberate design

GraphQL can serve as a backend-for-frontend, but it does not automatically remove the need for one. The organizational boundary, client-specific orchestration, and security requirements still decide that.

For .NET, Hot Chocolate is one established open-source option, but library choice should follow a proof of concept against the required schema, subscriptions, federation, and operational tooling.

## 4. WebSocket: A Bidirectional Transport

**Good fit for:** Chat, collaborative editing, multiplayer interaction, and live control surfaces where both peers send messages frequently.

WebSocket starts with an HTTP handshake and then provides framed, two-way communication over a long-lived connection. It is a transport, not an application protocol: your system must still define message schemas, authentication, authorization, correlation, error handling, heartbeats, reconnect behavior, ordering, and backpressure.

```javascript
import { WebSocketServer, WebSocket } from 'ws';

const server = new WebSocketServer({ port: 8080 });

server.on('connection', (socket) => {
  socket.on('error', console.error);

  socket.on('message', (data, isBinary) => {
    for (const client of server.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    }
  });
});
```

Use `wss://` outside local development. Browser servers should validate the `Origin` header, authenticate the connection, authorize each operation, enforce message and connection limits, and avoid assuming that a connected client remains authorized forever.

WebSocket can reduce repeated HTTP request overhead, but a persistent connection consumes infrastructure and complicates horizontal scaling. For server-to-client updates only, Server-Sent Events may be simpler. For occasional updates, polling or long polling may be sufficient.

Choose WebSocket when full-duplex behavior is a requirement, not merely because the feature is described as "real time."

## 5. SOAP: Standards-Based XML Messaging

**Good fit for:** Existing enterprise contracts and ecosystems that require SOAP, WSDL, or particular WS-* profiles.

SOAP 1.2 defines an XML messaging framework with envelopes, headers, bodies, faults, intermediaries, and bindings to underlying protocols. Security, reliability, transactions, and routing are provided by separate specifications and profiles; they are not automatically enabled by using SOAP.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
  <env:Body>
    <m:GetUser xmlns:m="https://example.com/users">
      <m:UserId>123</m:UserId>
    </m:GetUser>
  </env:Body>
</env:Envelope>
```

SOAP remains appropriate when interoperability depends on an established WSDL contract or standards such as WS-Security. It is verbose and its tooling can be complex, but calling it categorically obsolete ignores systems where those contracts are still the integration boundary.

For a new system without those constraints, a simpler HTTP or RPC API will often cost less to build and operate. When modernizing a SOAP integration, place an adapter at the boundary only if it provides a useful contract or isolation layer; wrapping SOAP merely to make it look modern adds another failure surface.

## 6. MQTT: Brokered Publish/Subscribe

**Good fit for:** IoT telemetry, constrained devices, intermittent links, and event distribution through a broker.

MQTT is a client-server publish/subscribe messaging transport. Publishers and subscribers communicate through a broker using topic names rather than calling each other directly.

```javascript
import mqtt from 'mqtt';

const publisher = mqtt.connect('mqtts://broker.example.com');

publisher.on('connect', () => {
  publisher.publish(
    'homes/42/living-room/temperature',
    JSON.stringify({ celsius: 21.4, observedAt: new Date().toISOString() }),
    { qos: 1 },
  );
});
```

MQTT defines three Quality of Service levels:

- QoS 0: at most once
- QoS 1: at least once, so consumers must tolerate duplicates
- QoS 2: exactly once at the MQTT protocol exchange level, with additional round trips

The minimum MQTT fixed header is two bytes, but complete packet and deployment overhead is larger. TLS, authentication, topic authorization, retained messages, persistent sessions, payload schemas, and broker capacity all affect the design.

Choose MQTT when decoupled brokered messaging and constrained-network behavior are central requirements. It is not a general replacement for request-response APIs.

## A Practical Decision Framework

Start with the interaction, not the technology name:

- **Resource-oriented HTTP contract with broad compatibility:** REST
- **Typed RPC between controlled services:** gRPC
- **Client-selected graph with several product experiences:** GraphQL
- **Long-lived, bidirectional connection:** WebSocket
- **Existing standards-heavy XML integration:** SOAP
- **Brokered messaging for devices or unreliable networks:** MQTT

Then test the choice against production constraints:

- Who controls the clients, and how quickly can they upgrade?
- Is the interaction request-response, streaming, or publish-subscribe?
- Which delivery, ordering, and idempotency guarantees are required?
- How will authentication and authorization work at every boundary?
- Can gateways, load balancers, browsers, and observability tools support it?
- What happens during partial failure, retries, reconnects, and deployments?
- Has performance been measured with representative payloads and concurrency?

## The Bottom Line

There is no universally best API style. REST is often a sensible starting point for an HTTP API because its ecosystem and semantics are widely understood, but it should not be a reflex.

Use specialized styles where their properties solve a demonstrated problem. A system might expose REST or GraphQL to product clients, use gRPC internally, maintain WebSocket connections for collaboration, and ingest device telemetry through MQTT. That is not inconsistency if each boundary has a clear contract and an operational owner.

The best architecture is the smallest set of technologies that meets the real requirements and can be operated safely.

## References

- [Roy Fielding, *Representational State Transfer (REST)*](https://roy.gbiv.com/pubs/dissertation/rest_arch_style.htm)
- [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [GraphQL best practices](https://graphql.org/learn/best-practices/)
- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [W3C SOAP 1.2 messaging framework](https://www.w3.org/TR/soap12-part1/)
- [OASIS MQTT Version 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
