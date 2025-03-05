# RetailShift - Modern Retail Data Platform

RetailShift is a modern microservices-based platform designed to help retailers transition from legacy point-of-sale systems to a scalable, real-time data architecture. It includes data ingestion, processing, and visualization capabilities to provide actionable insights into inventory, transactions, and customer behavior.

## Architecture

RetailShift consists of the following components:

- **Legacy Adapter Service**: Java-based service that connects to legacy POS systems, extracts data, and publishes events to Kafka.
- **Inventory Service**: Microservice that processes inventory-related events and provides inventory management APIs.
- **Data Visualization Dashboard**: React-based dashboard with Node.js backend for real-time monitoring and analytics.

## Key Technologies

- **Backend**: Java (Spring Boot), Node.js
- **Frontend**: React, Material-UI, Recharts, React Force Graph
- **Data Storage**: MongoDB, Redis
- **Messaging**: Apache Kafka
- **Containerization**: Docker, docker-compose
- **Monitoring**: Prometheus, Grafana

## Getting Started

### Prerequisites

- Docker and docker-compose
- Java 17 (for development)
- Node.js 18 (for development)

### Running the Application

For users with standard x86_64/amd64 architecture:

```bash
# Start all services
docker-compose up -d

# Access the dashboard
open http://localhost:8083
```

For Apple Silicon (M1/M2/M3) users:

```bash
# Make the helper script executable
chmod +x run-apple-silicon.sh

# Run the script to set up and start essential services
./run-apple-silicon.sh

# Access the dashboard
open http://localhost:8083
```

### For Apple Silicon Users

If you encounter architecture compatibility issues when running the full stack on Apple Silicon Macs (M1/M2/M3), you can:

1. Use the provided `run-apple-silicon.sh` script which sets up essential services.
2. Set the environment variable before starting services:
   ```bash
   export DOCKER_DEFAULT_PLATFORM=linux/arm64
   docker-compose up -d
   ```

## Development

### Project Structure

```
retailshift/
├── services/
│   ├── legacy-adapter/        # Legacy system integration service
│   ├── inventory/             # Inventory management service
│   └── data-visualizer/       # Visualization dashboard
│       ├── frontend/          # React frontend
│       ├── server.js          # Node.js backend
│       ├── Dockerfile.frontend
│       └── Dockerfile.backend
├── infrastructure/
│   ├── prometheus/            # Prometheus configuration
│   └── grafana/               # Grafana dashboards and config
├── docker-compose.yml         # Service orchestration
└── run-apple-silicon.sh       # Helper script for Apple Silicon Macs
```

### Building Individual Services

#### Legacy Adapter

```bash
cd services/legacy-adapter
./mvnw clean package
```

#### Inventory Service

```bash
cd services/inventory
./mvnw clean package
```

#### Data Visualization Frontend

```bash
cd services/data-visualizer/frontend
npm install
npm start
```

#### Data Visualization Backend

```bash
cd services/data-visualizer
npm install
node server.js
```

## Features

- Real-time inventory tracking and monitoring
- Transaction stream analysis
- Customer analytics and segmentation
- System topology visualization
- Configurable dashboards and alerting

## Recent Improvements

### Code Structure Cleanup (March 2025)

- Consolidated the data-visualizer directory structure to eliminate duplication
- Removed redundant files and directories in the data-visualizer service
- Updated Nginx configuration to properly proxy requests to the backend
- Modified Dockerfiles to use `npm install` instead of `npm ci` for better compatibility
- Fixed ARM64 compatibility issues for Apple Silicon Mac users

### Architecture Compatibility

- All services now support both x86_64 and ARM64 architectures
- Added docker-compose configurations with proper platform settings
- Updated JDK base images to Amazon Corretto for better ARM64 support

## License

This project is licensed under the MIT License - see the LICENSE file for details.
