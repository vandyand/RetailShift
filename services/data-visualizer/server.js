/**
 * RetailShift Data Visualization Backend
 *
 * This server connects to Kafka and provides real-time data updates
 * to the frontend via Socket.IO.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Kafka, logLevel } = require("kafkajs");

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Environment variables
const PORT = process.env.PORT || 3001;
const KAFKA_BOOTSTRAP_SERVERS =
  process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092";
const KAFKA_CONSUMER_GROUP =
  process.env.KAFKA_CONSUMER_GROUP || "visualizer-group";
const MOCK_DATA = process.env.MOCK_DATA === "true" || true; // Enable mock data by default

// Kafka topics we're interested in
const TOPICS = [
  "retailshift.inventory",
  "retailshift.transactions",
  "retailshift.customers",
  "retailshift.events",
];

// Store for recent events (in-memory)
let recentEvents = [];
const MAX_EVENTS = 200; // Max events to keep in memory

// System state object (in-memory)
let systemState = {
  services: [
    {
      id: "legacy-adapter-1",
      name: "Legacy Adapter",
      status: "active",
      lastSeen: new Date().toISOString(),
    },
    {
      id: "inventory-service-1",
      name: "Inventory Service",
      status: "active",
      lastSeen: new Date().toISOString(),
    },
    {
      id: "transaction-service-1",
      name: "Transaction Service",
      status: "warning",
      lastSeen: new Date().toISOString(),
    },
    {
      id: "customer-service-1",
      name: "Customer Service",
      status: "active",
      lastSeen: new Date().toISOString(),
    },
    {
      id: "analytics-service-1",
      name: "Analytics Service",
      status: "active",
      lastSeen: new Date().toISOString(),
    },
  ],
  databases: [
    {
      id: "mongodb-1",
      name: "MongoDB Primary",
      status: "active",
      type: "mongodb",
    },
    {
      id: "postgres-1",
      name: "Legacy PostgreSQL",
      status: "active",
      type: "postgres",
    },
    { id: "redis-1", name: "Redis Cache", status: "active", type: "redis" },
  ],
  kafka: { status: "active", brokers: 1, topics: 4 },
  metrics: {
    transactions: { count: 0, rate: 0 },
    inventory: { count: 0, updates: 0 },
    customers: { count: 0, active: 0 },
  },
};

/**
 * Set up Kafka consumer if KAFKA_BOOTSTRAP_SERVERS is provided
 */
async function setupKafkaConsumer() {
  try {
    // Create Kafka client
    const kafka = new Kafka({
      clientId: "retailshift-visualizer",
      brokers: KAFKA_BOOTSTRAP_SERVERS.split(","),
      logLevel: logLevel.ERROR, // Reduce noise in logs
    });

    // Create consumer
    const consumer = kafka.consumer({ groupId: KAFKA_CONSUMER_GROUP });

    console.log(`Connecting to Kafka at ${KAFKA_BOOTSTRAP_SERVERS}`);
    await consumer.connect();

    // Subscribe to topics
    for (const topic of TOPICS) {
      await consumer.subscribe({ topic, fromBeginning: false });
      console.log(`Subscribed to ${topic}`);
    }

    // Process incoming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse the message value
          const value = message.value.toString();
          const parsedValue = JSON.parse(value);

          // Create event object with metadata
          const event = {
            id: `${topic}-${Date.now()}`,
            topic,
            timestamp: new Date().toISOString(),
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: parsedValue,
          };

          // Add to recent events
          addEvent(event);

          // Update metrics based on event type
          updateMetrics(event);

          // Broadcast to all connected clients
          io.emit("kafka-event", event);

          console.log(`Processed ${topic} event: ${message.offset}`);
        } catch (err) {
          console.error("Failed to process message:", err);
        }
      },
    });

    // Update Kafka status in system state
    systemState.kafka.status = "active";

    return consumer;
  } catch (error) {
    console.error("Failed to set up Kafka consumer:", error);
    systemState.kafka.status = "error";

    // Start mock data generator if Kafka connection fails
    if (MOCK_DATA) {
      console.log("Starting mock data generator");
      startMockDataGenerator();
    }

    return null;
  }
}

/**
 * Add an event to the recent events list
 */
function addEvent(event) {
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents = recentEvents.slice(0, MAX_EVENTS);
  }
}

/**
 * Update system metrics based on incoming events
 */
function updateMetrics(event) {
  if (event.topic === "retailshift.transactions") {
    systemState.metrics.transactions.count++;
    systemState.metrics.transactions.rate = Math.random() * 10 + 5;
  } else if (event.topic === "retailshift.inventory") {
    systemState.metrics.inventory.updates++;
  } else if (event.topic === "retailshift.customers") {
    systemState.metrics.customers.count++;
  }
}

/**
 * Send system state to a socket
 */
async function sendSystemState(socket) {
  socket.emit("system-state", systemState);
}

/**
 * Send recent events to a socket
 */
function sendRecentEvents(socket) {
  socket.emit("recent-events", recentEvents);
}

/**
 * Handle incoming REST API requests
 */
// System topology endpoint
app.get("/api/system/topology", (req, res) => {
  // Return system topology data used by the System Topology visualization
  res.json({
    nodes: generateTopologyNodes(),
    links: generateTopologyLinks(),
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

/**
 * Generate mock data when Kafka is not available
 */
function startMockDataGenerator() {
  // Generate random events every few seconds
  const topics = TOPICS;

  setInterval(() => {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    let value;

    if (topic === "retailshift.inventory") {
      value = {
        productId: `P${Math.floor(Math.random() * 10000)}`,
        name: `Product ${Math.floor(Math.random() * 100)}`,
        quantity: Math.floor(Math.random() * 100),
        location: `Store-${Math.floor(Math.random() * 10)}`,
        action: Math.random() > 0.5 ? "update" : "stock_count",
      };
    } else if (topic === "retailshift.transactions") {
      value = {
        transactionId: `T${Math.floor(Math.random() * 10000)}`,
        amount: Math.random() * 200,
        items: Math.floor(Math.random() * 10) + 1,
        storeId: `Store-${Math.floor(Math.random() * 10)}`,
        paymentMethod: ["credit", "cash", "debit"][
          Math.floor(Math.random() * 3)
        ],
      };
    } else if (topic === "retailshift.customers") {
      value = {
        customerId: `C${Math.floor(Math.random() * 10000)}`,
        action: ["purchase", "return", "inquiry"][
          Math.floor(Math.random() * 3)
        ],
        loyaltyLevel: ["bronze", "silver", "gold", "platinum"][
          Math.floor(Math.random() * 4)
        ],
        value: Math.random() > 0.7 ? "high" : "medium",
      };
    } else {
      value = {
        type: ["info", "warning", "error"][Math.floor(Math.random() * 3)],
        service: ["inventory", "transaction", "customer", "legacy-adapter"][
          Math.floor(Math.random() * 4)
        ],
        message: `Event message ${Math.floor(Math.random() * 1000)}`,
      };
    }

    const event = {
      id: `${topic}-${Date.now()}`,
      topic,
      timestamp: new Date().toISOString(),
      partition: 0,
      offset: String(Math.floor(Math.random() * 10000)),
      value,
    };

    addEvent(event);
    updateMetrics(event);
    io.emit("kafka-event", event);

    // Randomly update service status to simulate system changes
    if (Math.random() > 0.95) {
      const statuses = ["active", "warning", "error"];
      const serviceIndex = Math.floor(
        Math.random() * systemState.services.length
      );
      systemState.services[serviceIndex].status =
        statuses[Math.floor(Math.random() * statuses.length)];
      systemState.services[serviceIndex].lastSeen = new Date().toISOString();
      io.emit("system-state", systemState);
    }
  }, 3000); // Generate events every 3 seconds

  // Update overall metrics periodically
  setInterval(() => {
    systemState.metrics.inventory.count =
      Math.floor(Math.random() * 5000) + 10000;
    systemState.metrics.customers.active =
      Math.floor(Math.random() * 500) + 100;
    io.emit("system-state", systemState);
  }, 10000); // Update metrics every 10 seconds
}

/**
 * Generate nodes for system topology visualization
 */
function generateTopologyNodes() {
  return [
    { id: "legacy-adapter", name: "Legacy Adapter", type: "service" },
    { id: "inventory-service", name: "Inventory Service", type: "service" },
    { id: "transaction-service", name: "Transaction Service", type: "service" },
    { id: "customer-service", name: "Customer Service", type: "service" },
    { id: "analytics-service", name: "Analytics Service", type: "service" },
    { id: "kafka", name: "Kafka", type: "message-bus" },
    { id: "mongodb-inventory", name: "Inventory DB", type: "database" },
    { id: "mongodb-transactions", name: "Transactions DB", type: "database" },
    { id: "mongodb-customers", name: "Customers DB", type: "database" },
    { id: "mongodb-analytics", name: "Analytics DB", type: "database" },
    { id: "redis", name: "Redis Cache", type: "cache" },
    { id: "legacy-pos", name: "Legacy POS", type: "database" },
    { id: "mobile-client", name: "Mobile Client", type: "client" },
    { id: "web-client", name: "Web Client", type: "client" },
    { id: "store-pos", name: "Store POS", type: "client" },
  ];
}

/**
 * Generate links for system topology visualization
 */
function generateTopologyLinks() {
  return [
    { source: "legacy-adapter", target: "legacy-pos", value: 5 },
    { source: "legacy-adapter", target: "kafka", value: 8 },
    { source: "kafka", target: "inventory-service", value: 5 },
    { source: "kafka", target: "transaction-service", value: 5 },
    { source: "kafka", target: "customer-service", value: 5 },
    { source: "kafka", target: "analytics-service", value: 8 },
    { source: "inventory-service", target: "mongodb-inventory", value: 7 },
    { source: "transaction-service", target: "mongodb-transactions", value: 7 },
    { source: "customer-service", target: "mongodb-customers", value: 7 },
    { source: "analytics-service", target: "mongodb-analytics", value: 7 },
    { source: "inventory-service", target: "redis", value: 4 },
    { source: "transaction-service", target: "redis", value: 4 },
    { source: "customer-service", target: "redis", value: 4 },
    { source: "web-client", target: "inventory-service", value: 2 },
    { source: "web-client", target: "transaction-service", value: 2 },
    { source: "web-client", target: "customer-service", value: 2 },
    { source: "mobile-client", target: "inventory-service", value: 2 },
    { source: "mobile-client", target: "transaction-service", value: 2 },
    { source: "mobile-client", target: "customer-service", value: 2 },
    { source: "store-pos", target: "inventory-service", value: 2 },
    { source: "store-pos", target: "transaction-service", value: 2 },
  ];
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send initial data to the client
  sendSystemState(socket);
  sendRecentEvents(socket);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start Kafka consumer if Kafka is configured
  if (KAFKA_BOOTSTRAP_SERVERS !== "localhost:9092" || MOCK_DATA) {
    setupKafkaConsumer().catch((err) => {
      console.error("Failed to start Kafka consumer:", err);
      // Start mock data generator if Kafka setup fails
      if (MOCK_DATA) {
        startMockDataGenerator();
      }
    });
  } else {
    console.log("Kafka not configured. Starting mock data generator.");
    startMockDataGenerator();
  }
});
