# Access Platform — Development Environment & Orchestration

This repository provides the centralized Docker Compose development environment for the Access Platform.

It acts as an optional orchestration layer: individual services remain independent and maintain ownership of their own Docker Compose configuration, while this repository allows multiple services to run together for local development and integration.

## Architecture

Each service repository defines its own Docker Compose configuration and can be built, started and stopped independently.

The centralized environment uses Docker Compose `include` to incorporate the configurations maintained by individual service repositories.

This approach preserves service autonomy while providing a unified development environment when needed.

## Repository layout

The repositories are expected to be cloned under the same parent directory:

```text
olml89-access-platform/
├── .github/
├── qr-api/
├── qr-request-web/
├── qr-dashboard/
├── qr-generator/
├── qr-mailer/
├── qr-scanner-android/
├── qr-analytics/
└── qr-infrastructure/
```

The centralized Compose configuration references sibling repositories using relative paths. Repositories included in the orchestration must therefore be available in this directory structure.

## Running the environment

The `Justfile` provides a common interface for managing the development environment.

Run these commands from this repository.

### Standalone mode

Starts or stops only the `github` service defined in this repository.

| Command     | Description                 |
| ----------- | --------------------------- |
| `just up`   | Start the `github` service. |
| `just down` | Stop the `github` service.  |

### Full platform mode

Starts or stops all services included in the centralized Compose configuration.

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `just up all`   | Start the complete development environment. |
| `just down all` | Stop the complete development environment.  |

## Design principles

- **Service autonomy:** Each service owns its Compose configuration and can run independently.
- **Optional orchestration:** The centralized environment is a convenience, not a requirement for developing or running individual services.
- **Single source of truth:** Service-specific infrastructure configuration remains in the corresponding service repository.
- **Local integration:** Centralized orchestration provides a convenient way to run multiple services together during development.

The centralized environment is intended for local development and integration, not production deployment.
