#!/bin/bash
# RetailShift Application Services Management Script

DOCKER_COMPOSE_FILE="/opt/retailshift/docker-compose.app.yml"
COMMAND=$1

function show_usage() {
  echo "RetailShift Application Services Management"
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start      - Start all application services"
  echo "  stop       - Stop all application services"
  echo "  restart    - Restart all application services"
  echo "  status     - Show status of application services"
  echo "  logs       - View logs of all services"
  echo "  logs [svc] - View logs of specific service (legacy-adapter, inventory-service, data-visualizer-backend, data-visualizer-frontend)"
  echo "  help       - Show this help information"
}

function start_services() {
  echo "Starting all application services..."
  docker compose -f $DOCKER_COMPOSE_FILE up -d
  echo "Services started. Use '$0 status' to verify."
}

function stop_services() {
  echo "Stopping all application services..."
  docker compose -f $DOCKER_COMPOSE_FILE down
  echo "All services stopped."
}

function restart_services() {
  echo "Restarting all application services..."
  docker compose -f $DOCKER_COMPOSE_FILE down
  docker compose -f $DOCKER_COMPOSE_FILE up -d
  echo "Services restarted. Use '$0 status' to verify."
}

function show_status() {
  echo "Current status of application services:"
  docker ps --filter "name=legacy-adapter" --filter "name=inventory-service" --filter "name=data-visualizer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

function show_logs() {
  if [ -z "$2" ]; then
    echo "Showing logs for all services..."
    docker compose -f $DOCKER_COMPOSE_FILE logs --tail=100
  else
    echo "Showing logs for $2..."
    docker compose -f $DOCKER_COMPOSE_FILE logs --tail=100 $2
  fi
}

# Main script execution
case "$COMMAND" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    restart_services
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs $@
    ;;
  help|*)
    show_usage
    ;;
esac 