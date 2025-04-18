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
├── docker-compose.app.yml     # Application services orchestration
├── docker-compose.infra.yml   # Infrastructure services orchestration
├── build-services.sh          # Script to build all services
├── deploy-services.sh         # Script to deploy to production server
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

## Deployment

RetailShift uses a streamlined deployment methodology with automated scripts to build and deploy the application to production environments.

### Deployment Scripts

The project includes several scripts to automate the build and deployment process:

- **build-services.sh**: Builds all application services (Legacy Adapter, Inventory Service, Data Visualizer)
  ```bash
  # Run from project root
  ./build-services.sh
  ```

- **deploy-services.sh**: Deploys all application services to the production server
  ```bash
  # Run from project root
  ./deploy-services.sh
  ```

### Deployment Workflow

1. **Build Stage**: Run `build-services.sh` to compile and package all services
2. **Deploy Stage**: Run `deploy-services.sh` to:
   - Copy packaged services to the production server
   - Set up necessary directories
   - Deploy using Docker Compose

### Production Environment

The production environment is hosted on a Digital Ocean droplet with the following configuration:
- Nginx as a reverse proxy for all services
- MongoDB for persistent data storage
- Redis for caching and session management
- Kafka for event streaming between services

All services run in Docker containers orchestrated by Docker Compose, making the deployment process consistent and reproducible.

### Monitoring Deployed Services

After deployment, the services are available at:
- Legacy Adapter: http://144.126.212.250:8081
- Inventory Service: http://144.126.212.250:8082
- Data Visualizer: http://144.126.212.250:8083
- Main application: http://144.126.212.250

## Features

- Real-time inventory tracking and monitoring
- Transaction stream analysis
- Customer analytics and segmentation
- System topology visualization
- Configurable dashboards and alerting

## User Interface

RetailShift provides a modern, intuitive interface for monitoring and analyzing retail operations.

### Main Dashboard

![Dashboard Overview](docs/images/dashboard.jpg)

The main dashboard provides a comprehensive overview of key metrics, real-time alerts, and system health. It combines critical information from all modules into a single pane of glass, enabling quick identification of trends and potential issues.

### System Topology Visualization

![System Topology](docs/images/system_topology.jpg)

The interactive system topology visualization shows the connections between different services and data stores in the RetailShift ecosystem. This force-directed graph helps to understand data flow and dependencies between components, making it easier to diagnose issues and optimize system architecture.

### Inventory Monitoring

![Inventory Monitor](docs/images/inventory_monitor.jpg)

The inventory monitoring dashboard tracks stock levels, reorder points, and inventory movements in real-time. Color-coded alerts highlight potential stockouts or overstock situations, while trend graphs help predict future inventory needs based on historical patterns.

### Transaction Stream Analysis

![Transaction Stream](docs/images/transaction_stream.jpg)

The transaction stream analyzer visualizes sales patterns across time periods and store locations. It allows filtering by product category, payment method, and other attributes, enabling deep analysis of transaction data and identification of profitable trends or problematic areas.

### Customer Insights

![Customer Insights](docs/images/customer_insights.jpg)

The customer insights dashboard provides detailed analytics on customer behavior, segmentation, and loyalty metrics. It helps identify high-value customers, track conversion rates, and analyze shopping patterns to inform marketing strategies and personalization efforts.

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

### Frontend Reliability (April 2025)

- Fixed error handling in components to prevent UI crashes
- Implemented defensive coding techniques to handle undefined data
- Enhanced logging for better troubleshooting of frontend issues
- Improved responsiveness across different screen sizes

## License

This project is licensed under the MIT License - see the LICENSE file for details.
