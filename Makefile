# ============================================
# MAATE — Developer Workflow Commands
# ============================================

.PHONY: help setup dev test clean docker-up docker-down db-migrate db-seed lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Setup ──────────────────────────────────

setup: ## First-time project setup
	@echo "🏗️  Setting up Maate development environment..."
	cp -n .env.example .env || true
	pnpm install
	$(MAKE) docker-up
	@echo "⏳ Waiting for services to be healthy..."
	sleep 5
	pnpm run db:generate
	pnpm run db:migrate
	pnpm run db:seed
	@echo "✅ Maate is ready! Run 'make dev' to start."

# ─── Development ────────────────────────────

dev: ## Start all services in dev mode
	$(MAKE) docker-up
	pnpm run dev

dev-api: ## Start only the API
	$(MAKE) docker-up
	pnpm run dev:api

dev-mobile: ## Start only the mobile app
	pnpm run dev:mobile

dev-web: ## Start only the doctor portal
	pnpm run dev:web

# ─── Docker ─────────────────────────────────

docker-up: ## Start infrastructure containers
	docker compose up -d

docker-down: ## Stop infrastructure containers
	docker compose down

docker-clean: ## Stop and remove all containers + volumes
	docker compose down -v --remove-orphans

docker-logs: ## Tail all container logs
	docker compose logs -f

# ─── Database ───────────────────────────────

db-migrate: ## Run database migrations
	pnpm run db:migrate

db-seed: ## Seed database with sample data
	pnpm run db:seed

db-studio: ## Open Prisma Studio
	pnpm run db:studio

db-reset: ## Reset database (DESTRUCTIVE)
	pnpm run db:reset

# ─── Quality ────────────────────────────────

lint: ## Run linters
	pnpm run lint

lint-fix: ## Auto-fix lint issues
	pnpm run lint:fix

format: ## Format all files
	pnpm run format

test: ## Run all tests
	pnpm run test

test-ci: ## Run tests in CI mode
	pnpm run test:ci

typecheck: ## Run TypeScript type checking
	pnpm run typecheck

# ─── Build ──────────────────────────────────

build: ## Build all packages
	pnpm run build

clean: ## Clean all build outputs
	pnpm run clean
