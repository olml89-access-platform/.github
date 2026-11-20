# Docker environment
build:
    docker compose build

up:
    docker compose up -d

down:
    docker compose down

bash:
    docker compose exec github-dev bash

# Dependencies
install:
    docker compose exec github-dev npm ci

# Quality checks
lint:
    docker compose exec github-dev npm run lint

test:
    docker compose exec github-dev npm test

format:
    docker compose exec github-dev npm run format

format-check:
    docker compose exec github-dev npm run format:check

actionlint:
    docker compose exec github-dev actionlint

check: lint test format-check actionlint
