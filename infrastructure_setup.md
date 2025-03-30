# RetailShift Infrastructure Setup Documentation

## Overview

This document details the infrastructure components set up for the RetailShift application deployment.

## Server Environment

- **Server**: Digital Ocean Droplet
- **Specifications**: 2 vCPUs, 4GB RAM
- **OS**: Linux
- **IP Address**: 144.126.212.250
- **Access**: SSH with dedicated key

## Security Configuration

- **Firewall**: UFW (Uncomplicated Firewall)
- **Open Ports**:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
  - 27017 (MongoDB)
  - 6379 (Redis)
  - 2181 (Zookeeper)
  - 9092 (Kafka)

## Infrastructure Services

All services are deployed using Docker Compose with platform-specific configurations to ensure compatibility.

### Docker Compose Configuration

The infrastructure services are defined in `/opt/retailshift/docker-compose.infra.yml`

### Database

- **Service**: MongoDB
- **Version**: 6.0
- **Container Name**: mongodb
- **Port**: 27017
- **Data Volume**: ./data/mongodb:/data/db
- **Credentials**:
  - Username: retailshift_admin
  - Password: secure_password

### Caching

- **Service**: Redis
- **Version**: 7.0-alpine
- **Container Name**: redis
- **Port**: 6379
- **Data Volume**: ./data/redis:/data

### Event Streaming

- **Zookeeper**:

  - **Version**: confluentinc/cp-zookeeper:7.3.3
  - **Container Name**: zookeeper
  - **Port**: 2181
  - **Data Volume**: ./data/zookeeper:/var/lib/zookeeper/data

- **Kafka**:
  - **Version**: confluentinc/cp-kafka:7.3.3
  - **Container Name**: kafka
  - **Port**: 9092
  - **Data Volume**: ./data/kafka:/var/lib/kafka/data
  - **Dependencies**: zookeeper
  - **Configuration**:
    - KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    - KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    - KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

## Networking

Services are connected through the Docker network `retailshift_default`, which is automatically created by Docker Compose.

## Data Persistence

All services use Docker volumes to ensure data persistence across container restarts:

- MongoDB data: ./data/mongodb
- Redis data: ./data/redis
- Kafka data: ./data/kafka
- Zookeeper data: ./data/zookeeper

## Startup and Shutdown

- **Start Services**: `docker compose -f docker-compose.infra.yml up -d`
- **Stop Services**: `docker compose -f docker-compose.infra.yml down`
- **View Logs**: `docker compose -f docker-compose.infra.yml logs`
- **Check Status**: `docker ps`

## Next Steps

1. Deploy application services that will connect to these infrastructure components
2. Set up proper authentication and authorization for production use
3. Implement backup strategies for data volumes
4. Configure monitoring and alerting for the infrastructure services
