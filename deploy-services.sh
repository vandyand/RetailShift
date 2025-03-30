#!/bin/bash
# Script to deploy all RetailShift application services to the remote server

# Set error handling
set -e

# Server details
SERVER_IP="144.126.212.250"
SERVER_USER="root"
SSH_KEY="~/.ssh/do-retailshift"
REMOTE_DIR="/opt/retailshift"

# Parse command line arguments
DEPLOY_INFRA=false
while getopts "i" opt; do
  case ${opt} in
    i )
      DEPLOY_INFRA=true
      ;;
    \? )
      echo "Usage: $0 [-i]"
      echo "  -i    Also deploy infrastructure services"
      exit 1
      ;;
  esac
done

echo "===== Deploying RetailShift Application Services ====="

# Check SSH key exists
if [ ! -f "${SSH_KEY/#\~/$HOME}" ]; then
  echo "SSH key not found: ${SSH_KEY/#\~/$HOME}"
  echo "Please ensure the SSH key exists or update the SSH_KEY variable in this script."
  exit 1
fi

# Create the services directory on the remote server
echo "Creating remote directories..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR/services"

# Copy the Docker Compose files
echo "Copying Docker Compose files..."
scp -i $SSH_KEY docker-compose.app.yml $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

if [ "$DEPLOY_INFRA" = true ]; then
  echo "Copying infrastructure Docker Compose file..."
  scp -i $SSH_KEY docker-compose.infra.yml $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
  
  # Create infrastructure directories if they don't exist
  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR/data/mongodb $REMOTE_DIR/data/kafka $REMOTE_DIR/data/zookeeper $REMOTE_DIR/data/redis"
fi

# Copy the services code
echo "Copying services code..."
scp -i $SSH_KEY -r services/legacy-adapter $SERVER_USER@$SERVER_IP:$REMOTE_DIR/services/
scp -i $SSH_KEY -r services/inventory $SERVER_USER@$SERVER_IP:$REMOTE_DIR/services/
scp -i $SSH_KEY -r services/data-visualizer $SERVER_USER@$SERVER_IP:$REMOTE_DIR/services/

# Deploy services using Docker Compose
echo "Deploying services..."
if [ "$DEPLOY_INFRA" = true ]; then
  echo "Starting infrastructure services..."
  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && docker compose -f docker-compose.infra.yml up -d"
  
  # Wait for infrastructure to be ready
  echo "Waiting for infrastructure services to initialize (30 seconds)..."
  sleep 30
fi

# Deploy application services
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && docker compose -f docker-compose.app.yml build && docker compose -f docker-compose.app.yml up -d"

# Verify services are running
echo "Verifying services are running..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && docker compose -f docker-compose.app.yml ps"

echo "===== Deployment completed ====="
echo "Legacy Adapter: http://$SERVER_IP:8081"
echo "Inventory Service: http://$SERVER_IP:8082"
echo "Data Visualizer: http://$SERVER_IP:8083"
echo "Main Application: http://$SERVER_IP" 