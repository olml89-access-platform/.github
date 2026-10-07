# Access Platform

A distributed access-control platform for managing events, tickets, QR-based access and access validation.

The project is also a personal engineering laboratory for exploring multiple programming languages, paradigms, architectural approaches and modern software development practices.

## Goals

The platform is intentionally designed as a distributed system to provide practical experience with:

- Domain-driven and modular architecture
- REST APIs
- Asynchronous messaging and event-driven architecture
- Multiple programming languages
- Docker and containerized development
- Automated testing and static analysis
- CI/CD
- Observability
- Distributed-system concerns
- Cloud-oriented infrastructure
- Production-oriented development practices

Technology choices are made according to the problem each component solves rather than forcing every service to use the same language or architecture.

## Platform components

| Component | Responsibility | Technology |
|---|---|---|
| `qr-api` | Core REST API and access-control domain | PHP / Symfony |
| `qr-request-web` | Public interface for requesting access | TypeScript |
| `qr-dashboard` | Management interface | TypeScript |
| `qr-generator` | QR code generation | Go |
| `qr-mailer` | Email delivery | Rust |
| `qr-scanner-android` | QR scanning and access validation interface | Kotlin |
| `qr-analytics` | Access-event processing and analytics | Python |
| `qr-infrastructure` | Local infrastructure and service orchestration | Docker Compose |

## Architecture

The platform evolves through functional vertical slices rather than implementing every service independently before integration.

The initial flow is centered around the core API:

```text
Client
  │
  ▼
qr-api
  │
  ├── Domain
  ├── Application
  └── Infrastructure
          │
          ▼
      PostgreSQL
```

As the platform evolves, asynchronous processing will be introduced where it provides a meaningful architectural benefit.

```text
                    ┌───────────────┐
                    │ qr-generator  │
                    └───────▲───────┘
                            │
                            │
┌──────────┐        ┌──────┴──────┐        ┌───────────┐
│ qr-api   │───────▶│  Messaging  │───────▶│ qr-mailer │
└────┬─────┘        └──────┬──────┘        └───────────┘
     │                     │
     │                     └────────────────▶ qr-analytics
     │
     ▼
PostgreSQL
```

This architecture is intentionally evolutionary. Components and communication patterns are introduced when they are justified by the requirements discovered during development.

## Development principles

### Build vertically

Features are implemented across the required layers and services instead of completing individual technical layers in isolation.

### Learn through implementation

Technologies are introduced when they provide a concrete engineering or learning opportunity.

### Avoid speculative complexity

The project does not prescribe solutions for problems that have not yet been encountered. Architectural decisions are allowed to evolve as requirements and technical constraints emerge.

### Automate from the beginning

Each repository is expected to include appropriate testing, static analysis and CI from the beginning. Deployment automation is introduced when a deployable environment exists.

## Roadmap

The platform is developed through functional milestones:

1. **Foundation & Core API**
2. **Public QR Request**
3. **QR Generation**
4. **Email Delivery**
5. **Android Scanner**
6. **Management Dashboard**
7. **Analytics**
8. **Observability & Production Hardening**

See the [Access Platform project](https://github.com/orgs/olml89-access-platform/projects/1) for the current work, issues and roadmap.

## Repositories

The platform is split into multiple repositories, each responsible for a specific component.

All repositories are hosted under the `olml89-access-platform` GitHub organization.

## Status

The project is currently in **M1 — Foundation & Core API**.

The first implementation focus is establishing the `qr-api` runtime, development environment and initial functional vertical slice.
