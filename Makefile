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

install-js: ## Install JavaScript dependencies
	@echo "$(CYAN)Installing JavaScript dependencies...$(RESET)"
	@cd js && npm ci

setup-hooks: ## Setup git hooks with husky
	@echo "$(CYAN)Setting up git hooks...$(RESET)"
	@cd js && npm run prepare

##@ Build Commands

build: build-go build-js ## Build both Go CLI and JS plugin

build-go: ## Build Go CLI application
	@echo "$(CYAN)Building Go CLI...$(RESET)"
	@go build -o bin/nogodey ./cmd/nogodey
	@echo "$(GREEN)✓ Go CLI built successfully$(RESET)"

build-js: ## Build JavaScript plugin
	@echo "$(CYAN)Building JavaScript plugin...$(RESET)"
	@cd js && npm run build
	@echo "$(GREEN)✓ JavaScript plugin built successfully$(RESET)"

build-plugin: ## Build the esbuild plugin specifically
	@echo "$(CYAN)Building esbuild plugin...$(RESET)"
	@cd js && npm run plugin

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

test: test-go test-js ## Run all tests (Go + JS)

test-go: ## Run Go tests
	@echo "$(CYAN)Running Go tests...$(RESET)"
	@go test -v ./...

test-sync: ## Run sync-related tests only
	@echo "$(CYAN)Running sync tests...$(RESET)"
	@go test ./cmd/nogodey -run "Test.*JSON|TestDiffKeys|TestBuildTranslationPrompt|TestSyncConfig" -v

test-js: ## Run JavaScript tests
	@echo "$(CYAN)Running JavaScript tests...$(RESET)"
	@cd js && npm run test:ci

test-watch: ## Run JavaScript tests in watch mode
	@echo "$(CYAN)Running JavaScript tests in watch mode...$(RESET)"
	@cd js && npm run test:watch

test-ui: ## Run JavaScript tests with UI
	@cd js && npm run test:ui

test-coverage: ## Generate test coverage reports
	@echo "$(CYAN)Generating coverage reports...$(RESET)"
	@go test -coverprofile=coverage.out ./...
	@cd js && npm run test:coverage

##@ Code Quality

lint: lint-go lint-js ## Run linters for both Go and JS

lint-go: ## Run Go linter
	@echo "$(CYAN)Linting Go code...$(RESET)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "$(YELLOW)golangci-lint not installed, skipping Go linting$(RESET)"; \
		go vet ./...; \
	fi

lint-js: ## Run JavaScript linter
	@echo "$(CYAN)Linting JavaScript code...$(RESET)"
	@cd js && npm run lint

format: format-go format-js ## Format code for both Go and JS

format-go: ## Format Go code
	@echo "$(CYAN)Formatting Go code...$(RESET)"
	@go fmt ./...

format-js: ## Format JavaScript code
	@echo "$(CYAN)Formatting JavaScript code...$(RESET)"
	@cd js && npm run format:fix

check: ## Run all quality checks (typecheck, lint, format)
	@echo "$(CYAN)Running quality checks...$(RESET)"
	@cd js && npm run quality

fix: ## Auto-fix linting and formatting issues
	@echo "$(CYAN)Auto-fixing code issues...$(RESET)"
	@$(MAKE) format
	@cd js && npm run check:fix

##@ Development

watch-js: ## Watch JavaScript files for changes and rebuild
	@echo "$(CYAN)Watching JavaScript files...$(RESET)"
	@cd js && npm run test:watch

##@ Cleanup

clean: clean-go clean-js ## Clean all build artifacts

clean-go: ## Clean Go build artifacts
	@echo "$(CYAN)Cleaning Go artifacts...$(RESET)"
	@rm -rf bin/
	@go clean -cache
	@rm -f coverage.out

clean-js: ## Clean JavaScript build artifacts
	@echo "$(CYAN)Cleaning JavaScript artifacts...$(RESET)"
	@cd js && npm run clean
	@rm -rf js/node_modules/.cache

clean-all: clean ## Clean everything including node_modules (nuclear option)
	@echo "$(RED)Nuclear clean: removing node_modules...$(RESET)"
	@rm -rf js/node_modules

##@ CI/CD

ci: install-deps build test lint ## Run full CI pipeline
	@echo "$(GREEN)✓ CI pipeline completed successfully!$(RESET)"

pre-commit: ## Run pre-commit checks (used by git hooks)
	@cd js && npm run precommit

release-check: ci ## Verify project is ready for release
	@echo "$(CYAN)Running release checks...$(RESET)"
	@echo "$(GREEN)✓ Project ready for release!$(RESET)"

##@ Utilities

deps-update: ## Update all dependencies
	@echo "$(CYAN)Updating Go dependencies...$(RESET)"
	@go get -u ./...
	@go mod tidy
	@echo "$(CYAN)Updating JavaScript dependencies...$(RESET)"
	@cd js && npm update

deps-audit: ## Audit dependencies for security issues
	@echo "$(CYAN)Auditing dependencies...$(RESET)"
	@go list -json -deps ./... | nancy sleuth
	@cd js && npm audit
