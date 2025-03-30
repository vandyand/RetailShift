#!/bin/bash
# Script to build all RetailShift application services

# Set error handling
set -e

echo "===== Building RetailShift Application Services ====="

# Navigate to project root directory
cd "$(dirname "$0")"

# Build Legacy Adapter Service (Clojure)
echo "Building Legacy Adapter Service..."
cd services/legacy-adapter
lein clean
lein deps
lein uberjar
cd ../..

# Build Inventory Service (Clojure)
echo "Building Inventory Service..."
cd services/inventory
lein clean
lein deps
lein uberjar
cd ../..

# Build Data Visualizer Frontend (React)
echo "Building Data Visualizer Frontend..."
cd services/data-visualizer/frontend
npm install
npm run build
cd ../../..

# Build Data Visualizer Backend (Node.js)
echo "Building Data Visualizer Backend..."
cd services/data-visualizer
npm install
cd ../..

echo "===== All services built successfully ====="
echo "You can now run deploy-services.sh to deploy to production" 