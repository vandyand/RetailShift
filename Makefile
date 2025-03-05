.PHONY: help dev-up dev-down test-all start-all docker-build k8s-apply

help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

dev-up: ## Start development environment with Docker Compose
	docker-compose up -d

dev-down: ## Stop development environment
	docker-compose down

test-all: ## Run tests for all services
	cd services/legacy-adapter && lein run-tests

start-all: ## Start all services locally
	cd services/legacy-adapter && lein run

docker-build: ## Build Docker images for all services
	docker build -t retailshift/legacy-adapter:latest ./services/legacy-adapter

k8s-apply: ## Apply Kubernetes manifests
	kubectl apply -f services/legacy-adapter/k8s/deployment.yaml

create-service: ## Create a new service (usage: make create-service SERVICE_NAME=service-name)
	@if [ -z "$(SERVICE_NAME)" ]; then \
		echo "Please provide a SERVICE_NAME, e.g., make create-service SERVICE_NAME=inventory"; \
		exit 1; \
	fi
	mkdir -p services/$(SERVICE_NAME)
	cp -r services/legacy-adapter/project.clj services/$(SERVICE_NAME)/
	sed -i '' 's/legacy-adapter/$(SERVICE_NAME)/g' services/$(SERVICE_NAME)/project.clj
	mkdir -p services/$(SERVICE_NAME)/src/retailshift/$(subst -,_,$(SERVICE_NAME))
	mkdir -p services/$(SERVICE_NAME)/test/retailshift/$(subst -,_,$(SERVICE_NAME))
	mkdir -p services/$(SERVICE_NAME)/resources/config
	cp services/legacy-adapter/resources/config/base.edn services/$(SERVICE_NAME)/resources/config/
	mkdir -p services/$(SERVICE_NAME)/k8s
	cp services/legacy-adapter/Dockerfile services/$(SERVICE_NAME)/
	cp services/legacy-adapter/k8s/deployment.yaml services/$(SERVICE_NAME)/k8s/
	sed -i '' 's/legacy-adapter/$(SERVICE_NAME)/g' services/$(SERVICE_NAME)/k8s/deployment.yaml
	@echo "Created service $(SERVICE_NAME)"

clean: ## Clean all build artifacts
	find . -name "target" -type d -exec rm -rf {} +
	find . -name ".lein-*" -exec rm -rf {} +
	find . -name "pom.xml" -exec rm -f {} + 