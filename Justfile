# Docker environment
build:
    docker compose build

up:
    docker compose up -d

down:
    docker compose down

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
