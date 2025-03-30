#!/bin/bash
# RetailShift Deployment Script
# This script orchestrates the full deployment process:
# 1. Builds all services
# 2. Deploys to the production server
# 3. Verifies the deployment

# Set error handling
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default settings
DEPLOY_INFRA=false
SKIP_BUILD=false
ENVIRONMENT="production"

# Parse command line arguments
while getopts "ishe:" opt; do
  case ${opt} in
    i )
      DEPLOY_INFRA=true
      ;;
    s )
      SKIP_BUILD=true
      ;;
    e )
      ENVIRONMENT=$OPTARG
      ;;
    h )
      echo "Usage: $0 [-i] [-s] [-e environment]"
      echo "  -i    Also deploy infrastructure services"
      echo "  -s    Skip build step (deploy only)"
      echo "  -e    Specify environment (default: production)"
      echo "  -h    Show this help message"
      exit 0
      ;;
    \? )
      echo "Invalid option: $OPTARG" 1>&2
      exit 1
      ;;
    : )
      echo "Invalid option: $OPTARG requires an argument" 1>&2
      exit 1
      ;;
  esac
done

# Change to project root directory
cd "$PROJECT_ROOT"

echo "===== RetailShift Deployment - $ENVIRONMENT ====="

# Build services if not skipped
if [ "$SKIP_BUILD" = false ]; then
  echo "Building services..."
  bash ./build-services.sh
  
  # Check if build was successful
  if [ $? -ne 0 ]; then
    echo "Build failed. Aborting deployment."
    exit 1
  fi
  
  echo "Build completed successfully."
else
  echo "Skipping build step as requested."
fi

# Deploy services
echo "Deploying services to $ENVIRONMENT environment..."

if [ "$DEPLOY_INFRA" = true ]; then
  bash ./deploy-services.sh -i
else
  bash ./deploy-services.sh
fi

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Deployment failed. Please check the logs for details."
  exit 1
fi

# Verify deployment
echo "Verifying deployment..."
SERVER_IP="144.126.212.250"

# Function to check if a service is running
check_service() {
  local service_url="$1"
  local service_name="$2"
  local max_attempts=5
  local attempt=1
  
  echo "Checking $service_name..."
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts..."
    if curl -s --head --request GET "$service_url" | grep "200 OK" > /dev/null; then
      echo "$service_name is running."
      return 0
    fi
    
    echo "$service_name not responding yet, waiting 5 seconds..."
    sleep 5
    attempt=$((attempt + 1))
  done
  
  echo "ERROR: $service_name is not responding after $max_attempts attempts."
  return 1
}

# Check all services
check_service "http://$SERVER_IP:8081/health" "Legacy Adapter"
check_service "http://$SERVER_IP:8082/health/liveness" "Inventory Service"
check_service "http://$SERVER_IP:8083/" "Data Visualizer"
check_service "http://$SERVER_IP/" "Main Application"

echo "===== Deployment Summary ====="
if [ "$DEPLOY_INFRA" = true ]; then
  echo "Infrastructure services: DEPLOYED"
fi
echo "Application services: DEPLOYED"
echo "Environment: $ENVIRONMENT"
echo "Legacy Adapter: http://$SERVER_IP:8081"
echo "Inventory Service: http://$SERVER_IP:8082"
echo "Data Visualizer: http://$SERVER_IP:8083"
echo "Main Application: http://$SERVER_IP"
echo "===== Deployment completed successfully ====="
