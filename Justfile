# Docker environment
build:
    docker compose build

up target="":
    #!/usr/bin/env bash
    set -eu

    case "{{target}}" in
        all)
            docker compose up -d
            ;;
        "")
            docker compose -f compose.yaml up -d
            ;;
        *)
            echo "Usage: just up [all]" >&2
            exit 1
            ;;
    esac

down target="":
    #!/usr/bin/env bash
    set -eu

    case "{{target}}" in
        all)
            docker compose down
            ;;
        "")
            docker compose -f compose.yaml down
            ;;
        *)
            echo "Usage: just down [all]" >&2
            exit 1
            ;;
    esac

bash:
    docker compose exec github bash

# Dependencies
install:
    docker compose exec github npm ci

# Quality checks
lint:
    docker compose exec github npm run lint

test:
    docker compose exec github npm test

format:
    docker compose exec github npm run format

format-check:
    docker compose exec github npm run format:check

actionlint:
    docker compose exec github actionlint

check: lint test format-check actionlint
