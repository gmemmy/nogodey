# nogodey - Makefile for managing Go CLI + JS plugin
.PHONY: help install build test clean lint format check dev setup ci

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

##@ General Commands

help: ## Display this help message
	@echo "$(CYAN)nogodey - Zero-boilerplate localization toolkit$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(CYAN)<target>$(RESET)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(RESET)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup & Installation

setup: install-deps setup-hooks ## Complete project setup (install deps + git hooks)
	@echo "$(GREEN)✓ Project setup complete!$(RESET)"

setup-env: ## Create .env file from template
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "$(GREEN)✓ Created .env file from template$(RESET)"; \
		echo "$(YELLOW)⚠ Please edit .env and add your OpenAI API key$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ .env file already exists$(RESET)"; \
	fi

install: install-deps ## Install all dependencies (Go + JS)

install-deps: install-go install-js ## Install dependencies for both Go and JS components

install-go: ## Install Go dependencies
	@echo "$(CYAN)Installing Go dependencies...$(RESET)"
	@go mod download
	@go mod tidy

install-js: ## Install JavaScript dependencies (workspace)
	@echo "$(CYAN)Installing JavaScript workspace dependencies...$(RESET)"
	@pnpm install

setup-hooks: ## Setup git hooks with husky
	@echo "$(CYAN)Setting up git hooks...$(RESET)"
	@pnpm run prepare

##@ Build Commands

build: build-go build-js ## Build both Go CLI and JS workspace

build-go: ## Build Go CLI application
	@echo "$(CYAN)Building Go CLI...$(RESET)"
	@go build -o bin/nogodey ./cmd/nogodey
	@echo "$(GREEN)✓ Go CLI built successfully$(RESET)"

build-js: ## Build JavaScript workspace (all projects)
	@echo "$(CYAN)Building JavaScript workspace...$(RESET)"
	@pnpm build
	@echo "$(GREEN)✓ JavaScript workspace built successfully$(RESET)"

build-plugin: ## Build the esbuild plugin specifically
	@echo "$(CYAN)Building esbuild plugin...$(RESET)"
	@cd js && pnpm run plugin

build-chat: ## Build chat app for production
	@echo "$(CYAN)Building chat app...$(RESET)"
	@cd examples/chat && pnpm build
	@echo "$(GREEN)✓ Chat app built successfully$(RESET)"

sync-templates: ## Sync templates from internal/templates to expo plugin
	@echo "$(CYAN)Syncing templates to expo plugin...$(RESET)"
	@rsync -av cmd/nogodey/internal/templates/ expo-plugin-nogodey/ios/Plugins/nogodey/
	@echo "$(GREEN)✓ Templates synced successfully$(RESET)"

##@ Translation Commands

sync: ## Sync translations for default locale (pidgin)
	@echo "$(CYAN)Syncing translations...$(RESET)"
	@./bin/nogodey sync

sync-all: ## Sync translations for multiple locales
	@echo "$(CYAN)Syncing translations for multiple locales...$(RESET)"
	@./bin/nogodey sync --locales pidgin,en

sync-locale: ## Sync specific locale (usage: make sync-locale LOCALE=fr)
	@echo "$(CYAN)Syncing translations for $(LOCALE)...$(RESET)"
	@./bin/nogodey sync --locales $(LOCALE)

##@ Testing Commands

test: test-go test-js ## Run all tests (Go + JS workspace)

test-go: ## Run Go tests
	@echo "$(CYAN)Running Go tests...$(RESET)"
	@go test -v ./...

test-sync: ## Run sync-related tests only
	@echo "$(CYAN)Running sync tests...$(RESET)"
	@go test ./cmd/nogodey -run "Test.*JSON|TestDiffKeys|TestBuildTranslationPrompt|TestSyncConfig" -v

test-js: ## Run JavaScript workspace tests
	@echo "$(CYAN)Running JavaScript workspace tests...$(RESET)"
	@pnpm test

test-watch: ## Run JavaScript tests in watch mode
	@echo "$(CYAN)Running JavaScript tests in watch mode...$(RESET)"
	@cd js && pnpm run test:watch

test-ui: ## Run JavaScript tests with UI
	@cd js && pnpm run test:ui

test-coverage: ## Generate test coverage reports
	@echo "$(CYAN)Generating coverage reports...$(RESET)"
	@go test -coverprofile=coverage.out ./...
	@cd js && pnpm run test:coverage

##@ Code Quality

lint: lint-go lint-js ## Run linters for both Go and JS workspace

lint-go: ## Run Go linter
	@echo "$(CYAN)Linting Go code...$(RESET)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "$(YELLOW)golangci-lint not installed, skipping Go linting$(RESET)"; \
		go vet ./...; \
	fi

lint-js: ## Run JavaScript workspace linter (Biome)
	@echo "$(CYAN)Linting JavaScript workspace with Biome...$(RESET)"
	@pnpm lint

format: format-go format-js ## Format code for both Go and JS workspace

format-go: ## Format Go code
	@echo "$(CYAN)Formatting Go code...$(RESET)"
	@go fmt ./...

format-js: ## Format JavaScript workspace code (Biome)
	@echo "$(CYAN)Formatting JavaScript workspace with Biome...$(RESET)"
	@pnpm format

check: ## Run all quality checks (typecheck, lint, format)
	@echo "$(CYAN)Running workspace quality checks...$(RESET)"
	@pnpm typecheck
	@pnpm lint

fix: ## Auto-fix linting and formatting issues
	@echo "$(CYAN)Auto-fixing workspace code issues...$(RESET)"
	@$(MAKE) format
	@pnpm lint:fix

##@ Development

watch-js: ## Watch JavaScript files for changes and rebuild
	@echo "$(CYAN)Watching JavaScript files...$(RESET)"
	@cd js && pnpm run test:watch

+dev-chat: ## Start example chat app development server
	@echo "$(CYAN)Starting chat app development server...$(RESET)"
	@cd examples/chat && pnpm start

typecheck: ## Run TypeScript checks across workspace
	@echo "$(CYAN)Running TypeScript checks across workspace...$(RESET)"
	@pnpm typecheck

##@ Cleanup

clean: clean-go clean-js ## Clean all build artifacts

clean-go: ## Clean Go build artifacts
	@echo "$(CYAN)Cleaning Go artifacts...$(RESET)"
	@rm -rf bin/
	@go clean -cache
	@rm -f coverage.out

clean-js: ## Clean JavaScript workspace artifacts
	@echo "$(CYAN)Cleaning JavaScript workspace artifacts...$(RESET)"
	@pnpm clean
	@rm -rf node_modules/.cache
	@rm -rf examples/*/dist examples/*/.expo/web-cache

clean-all: clean ## Clean everything including node_modules (nuclear option)
	@echo "$(RED)Nuclear clean: removing all node_modules...$(RESET)"
	@rm -rf node_modules
	@rm -rf */node_modules
	@rm -rf examples/*/node_modules

##@ CI/CD

ci: install-deps build test lint ## Run full CI pipeline
	@echo "$(GREEN)✓ CI pipeline completed successfully!$(RESET)"

pre-commit: ## Run pre-commit checks (used by git hooks)
	@pnpm run prepare

release-check: ci ## Verify project is ready for release
	@echo "$(CYAN)Running release checks...$(RESET)"
	@echo "$(GREEN)✓ Project ready for release!$(RESET)"

##@ Utilities

deps-update: ## Update all dependencies
	@echo "$(CYAN)Updating Go dependencies...$(RESET)"
	@go get -u ./...
	@go mod tidy
	@echo "$(CYAN)Updating JavaScript workspace dependencies...$(RESET)"
	@pnpm update -r

deps-audit: ## Audit dependencies for security issues
	@echo "$(CYAN)Auditing dependencies...$(RESET)"
	@go list -json -deps ./... | nancy sleuth
	@pnpm audit
