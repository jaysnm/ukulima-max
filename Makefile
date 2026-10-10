.DEFAULT_GOAL := help
.PHONY: help setup backend-install frontend-install hooks \
	db-up db-down dev backend-run frontend-run \
	migrate migrations superuser backend-shell \
	lint lint-backend lint-frontend format format-backend format-frontend \
	up down build logs restart ps \
	clean

# One shared Postgres, started via `db-up`, is used by both the native
# (uv / yarn) workflow and the full docker-compose stack.

# Keep backend/.venv and frontend/node_modules out of their subfolders and at
# the repo root instead — one place to point an IDE/editor at, and a single
# root .gitignore entry already covers both regardless of which layout is
# used. uv only honours UV_PROJECT_ENVIRONMENT from the real shell env (not
# from a .env file), so it's exported here for every recipe that shells into
# uv; running uv commands outside `make` needs the same var set manually (see
# README).
export UV_PROJECT_ENVIRONMENT := ../.venv

help: ## Show this help
	@echo "Ukulima Max — common commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## ── Setup ────────────────────────────────────────────────────────────────

setup: backend-install frontend-install hooks ## Install backend + frontend deps and git hooks
	@[ -f .env ] || cp .env.example .env
	@echo "✔ Setup complete. Run 'make db-up' then 'make backend-run' / 'make frontend-run'."

backend-install: ## Install backend deps with uv (creates .venv at repo root)
	cd backend && uv sync

frontend-install: ## Install frontend deps with yarn (creates node_modules at repo root)
	cd frontend && yarn install

hooks: ## Install pre-commit git hooks (formatters, linters, branch protection)
	uvx pre-commit install
	uvx pre-commit install --hook-type pre-push

## ── Running locally (no Docker for app code) ────────────────────────────

db-up: ## Start only Postgres in Docker, exposed on localhost:5432
	docker compose up -d db

db-down: ## Stop the Postgres container
	docker compose stop db

dev: db-up ## Start Postgres, then run backend + frontend dev servers together (Ctrl+C stops both)
	@trap 'kill 0' INT TERM EXIT; \
	(cd backend && uv run manage.py runserver 8000 2>&1 | sed -u 's/^/[backend]  /') & \
	(cd frontend && yarn dev 2>&1 | sed -u 's/^/[frontend] /') & \
	wait

backend-run: ## Run Django dev server natively (requires `make db-up` first)
	cd backend && uv run manage.py runserver 8000

frontend-run: ## Run the Vite dev server natively
	cd frontend && yarn dev

migrate: ## Apply Django migrations
	cd backend && uv run manage.py migrate

migrations: ## Generate new Django migrations
	cd backend && uv run manage.py makemigrations

superuser: ## Create a Django superuser
	cd backend && uv run manage.py createsuperuser

backend-shell: ## Open a Django shell
	cd backend && uv run manage.py shell

## ── Lint / format ────────────────────────────────────────────────────────

lint: lint-backend lint-frontend ## Lint backend + frontend

lint-backend: ## Lint backend with ruff
	cd backend && uv run ruff check .

lint-frontend: ## Lint frontend with eslint
	cd frontend && yarn lint

format: format-backend format-frontend ## Format backend + frontend

format-backend: ## Format backend with ruff
	cd backend && uv run ruff format .

format-frontend: ## Format frontend with prettier
	cd frontend && yarn format

## ── Full Docker Compose stack ────────────────────────────────────────────
## db has no profile and is always included; backend/frontend/nginx sit
## behind the "web" profile so a plain `docker compose up` stays native-only.

up: ## Start the full stack (db, backend, frontend, nginx) in Docker
	docker compose --profile web up -d --build

down: ## Stop the full Docker stack
	docker compose --profile web down

build: ## Rebuild all Docker images
	docker compose --profile web build

logs: ## Tail logs from all Docker services
	docker compose --profile web logs -f

restart: down up ## Restart the full Docker stack

ps: ## Show status of Docker services
	docker compose --profile web ps

## ── Cleanup ──────────────────────────────────────────────────────────────

clean: ## Remove Python/Node caches (safe; keeps installed deps and .env)
	find backend -type d -name "__pycache__" -exec rm -rf {} +
	rm -rf backend/.ruff_cache frontend/dist
