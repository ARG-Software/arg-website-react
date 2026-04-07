---
seoTitle: Nx + NestJS Monorepo Boilerplate
slug: nx-nestjs-monorepo-boilerplate
tag: NestJS · Architecture
title: Scaling with Confidence: A Practical Nx + NestJS Monorepo Boilerplate
subtitle: Managing multiple repositories quickly becomes a headache. Here's how we built a production-ready monorepo with Nx and NestJS.
date: April 27, 2025
readTime: 10 min read
mediumUrl: https://arg-software.medium.com/scaling-with-confidence-a-practical-nx-nestjs-monorepo-boilerplate-b30b9266f6ba
excerpt: When building out backends for modern applications - especially in microservice-driven or modular environments - managing multiple repositories quickly becomes a headache. Enter monorepos, and more specifically, Nx.
---

![Scaling with Confidence](/images/articles/nestjs-monorepo/nestjs-monorepo-header.webp)

When building out backends for modern applications - especially in microservice-driven or modular environments - managing multiple repositories quickly becomes a headache. Enter monorepos, and more specifically, Nx: a powerful toolkit for managing monorepos with smart dependency graphing, caching, and tooling support.

## Use Cases & Ideal Scenarios

This boilerplate is particularly well-suited for:

- **Microservices Architectures.** Facilitates the development of services with clear boundaries and communication protocols.
- **Event-Driven Systems.** Supports asynchronous processing through messaging and webhooks.
- **Domain-Driven Design (DDD).** Encourages modular design aligned with business domains.
- **Scalable Backend Applications.** Provides a solid foundation for applications requiring scalability and maintainability.

Its modular approach and integration of modern patterns make it a strong starting point for complex backend projects.

## Why Nx + NestJS?

The Nx Monorepo structure ensures consistent project organization, enforceable coding standards, and scalable management of multiple backend services. It supports independent deployment, builds, and testing for each service while sharing common infrastructure libraries like Messaging (Kafka), Caching (Redis), and Persistence (PostgreSQL via MikroORM).

NestJS complements this by providing a modular, opinionated backend framework ideal for Domain-Driven Design (DDD), Dependency Injection (DI), and microservice architecture. Combined, Nx and NestJS allow rapid development of distributed systems with shared tooling, isolated runtime contexts, efficient CI/CD pipelines, and native support for background jobs, messaging patterns, scheduled tasks, and centralized configuration.

## Repository Structure & Key Components

The repository is organized to promote modularity and scalability:

- **apps/.** Contains application-specific codebases.
- **packages/.** Houses shared libraries and modules for reuse across applications.
- **tools/.** Includes custom scripts and utilities to support development workflows.

This structure aligns with Nx's best practices, facilitating clear separation of concerns and ease of maintenance.

## Apps Folder Overview

The apps/ folder contains the runnable services and client applications of the project. Each app here is an independent unit - it can be built, tested, deployed, and scaled separately.

### action-log-service

A NestJS backend service that listens for user action log messages (e.g., login, password reset) and persists them to the database. It integrates heavily with Kafka topics and the Action Log module from the application package.

### client-api

A NestJS backend service acting as the main public API. It handles user authentication, user management, and orchestrates use cases defined in the application layer. Think of this as the "gateway" for clients (mobile apps, frontends) to interact with the backend.

### frontend

A React application. It provides the UI for interacting with the backend services, though it is currently minimal and intended as a starter template for frontends.

## Packages Folder Overview

### Domain

The domain folder holds the core business logic and data structures for the overall application. It's organized into the following sections:

- **Abstractions.** Contains shared types and utility classes (for example: a generic Result class for error/success reporting).
- **Enumerations.** Contains standard enums used across the domain, such as types for action logs.
- **Action Log Module.** Defines entities, errors, and repository contracts to handle logging user actions.
- **Main Module.** Deals with user management, including the user entity, error definitions, and repository interfaces.

### Application

This package implements the core business logic and workflows of the project, using CQRS and a Message Bus to maintain clean architecture and domain separation.

The Bus Layer defines a consistent way to dispatch commands and queries using the IBus interface and MemoryBus implementation.

```typescript
export interface IBus {
  commandCreate<T>(command: ICommand): Promise<Result<T>>;
  commandUpdate<T>(command: ICommand): Promise<Result<T>>;
  query<T>(query: IQuery): Promise<Result<T>>;
}
```

The Messaging Layer in the Application module defines how events and messages are structured, validated, and routed across the system. It ensures that when the application wants to emit a domain event (like a log, an action log, etc.) the shape of the message is known, the topic to which it will be sent is clear, the payload is validated upfront, and optional things like compression are handled too.

```typescript
export interface IMessage<T = MessagePayload> {
  key: string;
  topic: string;
  value: T;
  messageType: string;
  compression?: CompressionTypes;
}
```

Topics are also centralized:

```typescript
export const LOG_TOPIC = 'logs';
export const MAIN_TOPIC = 'main';
export const ACTION_LOG_TOPIC = 'action-log';
```

Example of how to create a message. First, create the payload:

```typescript
export interface LogMessagePayload {
  message: string;
  level: string;
  context?: string;
}
```

Then create the message class:

```typescript
export class LogMessageEvent extends Message<LogMessagePayload> {
  override topic = LOG_TOPIC; // 'logs'
  override messageType = this.constructor.name;

  protected override validatePayload(payload: LogMessagePayload) {
    if (!payload.message || !payload.level) {
      throw new Error('Message and level are required.');
    }
  }
}
```

Then send a new event:

```typescript
const logEvent = new LogMessageEvent({
  message: 'User not found',
  level: 'error',
  context: 'AuthService',
});

// Now `logEvent` can be sent to Kafka, Redis, or another broker
```

### Use Cases

In this project, a Use Case is defined by a Command (for changing data) or a Query (for reading data), implemented by a corresponding Handler, and represents a single atomic business operation like "Create a User" or "Reset a Password".

Example Use Case - Confirm user code. Command: ConfirmCodeCommand. Handler: ConfirmCodeCommandHandler. Responsibility: Validate the user's code and update the account status.

```typescript
// 1. Define a command
export class CreateActionLogCommand implements ICommand {
  constructor(public readonly userId: string, public readonly action: string) {}
}

// 2. Implement the handler
@CommandHandler(CreateActionLogCommand)
export class CreateActionLogCommandHandler implements ICommandHandler<CreateActionLogCommand> {
  constructor(/* inject repositories/services */) {}

  async execute(command: CreateActionLogCommand): Promise<Result<void>> {
    // Business logic: check user exists, save action log entry
  }
}
```

### Infrastructure

The infrastructure layer is responsible for aspects such as asynchronous job queuing, environment configuration, scheduled tasks (via cron jobs), email notifications, application health checks, logging, caching, messaging with Kafka, and persistence using an ORM.

- **Bull Module.** Integrates the Bull job queue with NestJS. It uses asynchronous configuration to initialize the connection to Redis dynamically. This module also offers a helper to register different-named queues.
- **Configuration Module.** Centralizes the application's configuration settings. It wraps the native NestJS ConfigModule and exposes a method ConfigurationService that retrieves environment-dependent values, including Kafka, Redis, and other service endpoints.
- **Cronjob Module.** Sets up scheduled tasks using Nest's built-in scheduling module. It defines a CronJob interface and a service that registers a recurring job.
- **Email Module.** Handles various email notifications using a queued approach. It defines interface contracts for different email types and processes email jobs through a Bull queue.
- **Health Module.** Exposes REST endpoints to check the application's critical components via Terminus. It monitors database connectivity, memory usage, disk storage, and messaging system health.
- **Messaging Module.** Integrates Kafka-based messaging within the application. It defines interfaces for producers and consumers and provides dedicated Kafka implementations for reliable message consumption and production. Additionally, it includes service wrappers that can be injected into other modules.
- **Persistence Module.** Consolidates database access logic. It is split into sub-modules for different concerns (e.g., action-log and main persistence). It leverages MikroORM with PostgreSQL for object/relational mapping and supports health checks for database operations.
- **Cache Module.** Provides Redis-based caching capabilities to the application. It wraps the NestJS CacheModule and supports the configuration of different cache stores, key prefixes, and TTL settings for efficient caching strategies.
- **Log Module.** Centralizes error tracking and logging using Errsole. It provides an in-app interface to capture, view, and debug server-side errors during development and production, improving observability without requiring an external logging service.

## Overview of the Tools Folder

The tools/ folder centralizes essential infrastructure utilities for the project. It separates concerns that are not part of the core application logic but are critical for running, testing, and deploying the system.

Inside tools/, you'll find:

- **tools/database/.** Contains MikroORM configuration files for two database schemas: Main schema (app) holds primary application data like users and authentication, and Action-Log schema (action-log) separates audit logs from core business data. Each schema has a production configuration and a testing configuration that accepts dynamic database URLs for clean integration testing.
- **tools/docker/.** Contains scripts like publish_docker.js, which automates Docker image building and publishing. This script is integrated into the CI/CD pipeline, ensuring services like client-api, action-log-service, and frontend are containerized and pushed to a Docker registry with minimal manual effort.

All apps are built on top of the shared libraries from the packages/ folder (like application/ and infrastructure/). Backend apps reuse messaging, caching, database, and CQRS logic. Frontend can connect to APIs exposed by client-api. Thanks to Nx, each app can be built (nx build app-name), tested (nx test app-name), served locally (nx serve app-name), and deployed individually (e.g., to Docker, Kubernetes).

## Automated Versioning and Docker Publishing: The Perfect Marriage

In our monorepo architecture, we've implemented a streamlined system that automatically handles versioning and Docker publishing in perfect synchronization. Let's dive into how this elegant solution works.

### The Version-First Approach

Every application in our monorepo, like the Action Log Service, uses semantic versioning through @jscutlery/semver. When we trigger a release, the system first runs the versioning target, which bumps the version according to conventional commits, tags the Git repository with a formatted tag like action-log-service-0.0.8, and updates the CHANGELOG.md automatically.

### The Docker Publishing Flow

Once versioning completes, the publish-docker target kicks in:

```json
"publish-docker": {
  "executor": "nx:run-commands",
  "dependsOn": ["versioning"],
  "options": {
    "command": "node ./tools/docker/publish_docker.js {projectName} true"
  }
}
```

The publish_docker.js script reads the fresh version tag and builds a Docker image, tags it with the same version (ensuring version consistency), and pushes to our Docker registry.

### The Publishing Flow: From Commit to Container

The journey begins with a code change. When developers commit to the main branch, they can trigger the publishing flow in two ways. Manual Trigger: Running nx run action-log-service:publish-docker. CI/CD Pipeline: Automated workflows that detect changes and run the publish command.

Once triggered, the process starts with the versioning target:

```json
"versioning": {
  "executor": "@jscutlery/semver:version",
  "options": {
    "baseBranch": "HEAD:main",
    "tagPrefix": "${projectName}-",
    "changelog": true
  }
}
```

This automatically analyzes commits to determine the version bump (major, minor, patch), updates the package version, creates a Git tag (e.g., action-log-service-0.0.8), and generates or updates the CHANGELOG.md.

The publish-docker target depends on versioning, ensuring it runs only after a successful version bump:

```bash
node ./tools/docker/publish_docker.js {projectName} true
```

The publish script then reads the new version from the package.json or Git tag, builds the Docker image using the service's Dockerfile, tags the image with the version (e.g., action-log-service:0.0.8), and pushes to the configured Docker registry.

### Why This Matters

This automated flow eliminates human error and ensures that our Docker images are always up to date with their corresponding code versions. The benefits include:

- **Consistency.** Every published image has a unique, traceable version.
- **Synchronization.** Versions in Git match versions in Docker.
- **Automation.** The process is reproducible and automated.
- **Safety.** Local testing doesn't interfere with production releases.

The beauty of this system lies in its simplicity and reliability - developers focus on writing code, while the tooling handles the complexities of versioning and publishing.

## Conclusion

This Nx + NestJS monorepo boilerplate provides a robust foundation for building scalable, maintainable, and production-ready applications. By leveraging the power of monorepo management with Nx and the architectural patterns provided by NestJS, teams can focus on delivering business value. At the same time, the framework handles the complexities of distributed systems.

The combination of Domain-Driven Design principles, CQRS pattern implementation, and infrastructure modules for messaging, caching, and persistence creates a development environment that scales with your team and your application's needs. Whether you're building microservices, event-driven systems, or complex backend applications, this boilerplate offers the tools and structure needed to succeed.

By adopting this architecture, you're not just getting a starting point - you're embracing a battle-tested approach to modern backend development that will serve your project well as it grows from prototype to production scale.

You can check the code here: https://github.com/ARG-Software/Nx-Monorepo-Boilerplate
