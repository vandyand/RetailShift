#!/bin/bash
set -e

echo "====================================================="
echo "RetailShift - Apple Silicon (ARM64) Setup Script"
echo "====================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

echo "Docker is running. Proceeding with setup..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  echo "docker-compose could not be found. Please install it and try again."
  exit 1
fi

# Create necessary directories if they don't exist
echo "Creating necessary directories..."
mkdir -p services/inventory/target
mkdir -p infrastructure/prometheus
mkdir -p infrastructure/grafana/provisioning
mkdir -p infrastructure/grafana/dashboards

# Check if inventory JAR exists, create a dummy one if not
if [ ! -f services/inventory/target/inventory-service-standalone.jar ]; then
  echo "Creating placeholder JAR file for inventory service..."
  touch services/inventory/target/inventory-service-standalone.jar
fi

# Create placeholder prometheus config if it doesn't exist
if [ ! -f infrastructure/prometheus/prometheus.yml ]; then
  echo "Creating placeholder Prometheus config..."
  cat > infrastructure/prometheus/prometheus.yml << 'EOL'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'inventory-service'
    metrics_path: /metrics
    static_configs:
      - targets: ['inventory-service:8080']
EOL
fi

echo "Starting the RetailShift services..."
echo "This may take a few minutes for the first build..."

# Use docker-compose directly with our updated docker-compose.yml 
# which now has platform settings included
echo "Starting MongoDB and Redis..."
docker-compose up -d mongodb redis

echo "Waiting for MongoDB and Redis to be ready..."
sleep 10

# Start the data-visualizer components
echo "Starting data visualization services..."
docker-compose up -d data-visualizer-backend data-visualizer-frontend

echo "====================================================="
echo "Setup complete!"
echo "====================================================="
echo ""
echo "You can access the visualization dashboard at: http://localhost:8083"
echo ""
echo "To start all services at once, run:"
echo "  docker-compose up -d"
echo ""
echo "To stop all services, run: docker-compose down"
echo ""
echo "To view logs from the data visualizer: docker-compose logs -f data-visualizer-backend data-visualizer-frontend"
echo "=====================================================" 