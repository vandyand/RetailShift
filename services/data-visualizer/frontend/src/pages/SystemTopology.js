import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  useTheme,
} from "@mui/material";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";

function SystemTopology() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  // Function to fetch topology data from the API
  const fetchTopologyData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/system/topology");
      setGraphData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching topology data:", err);
      setError("Failed to fetch system topology data");
      // Use fallback data if API fails
      setGraphData(getFallbackData());
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and refresh every 30 seconds
  useEffect(() => {
    fetchTopologyData();

    const interval = setInterval(() => {
      fetchTopologyData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Function to get a color for node based on its type
  const getNodeColor = (node) => {
    if (!node.type) return theme.palette.primary.main;

    switch (node.type) {
      case "service":
        return theme.palette.primary.main;
      case "database":
        return theme.palette.secondary.main;
      case "message-bus":
        return theme.palette.warning.main;
      case "cache":
        return theme.palette.info.main;
      case "client":
        return theme.palette.success.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Fallback data if API is unavailable
  const getFallbackData = () => {
    return {
      nodes: [
        { id: "client", name: "Client Apps", type: "client" },
        { id: "api-gateway", name: "API Gateway", type: "service" },
        { id: "legacy-adapter", name: "Legacy Adapter", type: "service" },
        { id: "inventory-service", name: "Inventory Service", type: "service" },
        {
          id: "transaction-service",
          name: "Transaction Service",
          type: "service",
        },
        { id: "customer-service", name: "Customer Service", type: "service" },
        { id: "kafka", name: "Kafka", type: "message-bus" },
        { id: "legacy-db", name: "Legacy POS DB", type: "database" },
        {
          id: "mongodb-inventory",
          name: "MongoDB (Inventory)",
          type: "database",
        },
        {
          id: "mongodb-transactions",
          name: "MongoDB (Transactions)",
          type: "database",
        },
        {
          id: "mongodb-customers",
          name: "MongoDB (Customers)",
          type: "database",
        },
        { id: "redis", name: "Redis Cache", type: "cache" },
      ],
      links: [
        { source: "client", target: "api-gateway" },
        { source: "api-gateway", target: "legacy-adapter" },
        { source: "api-gateway", target: "inventory-service" },
        { source: "api-gateway", target: "transaction-service" },
        { source: "api-gateway", target: "customer-service" },
        { source: "legacy-adapter", target: "legacy-db" },
        { source: "legacy-adapter", target: "kafka" },
        { source: "inventory-service", target: "kafka" },
        { source: "inventory-service", target: "mongodb-inventory" },
        { source: "transaction-service", target: "kafka" },
        { source: "transaction-service", target: "mongodb-transactions" },
        { source: "customer-service", target: "kafka" },
        { source: "customer-service", target: "mongodb-customers" },
        { source: "inventory-service", target: "redis" },
        { source: "transaction-service", target: "redis" },
        { source: "customer-service", target: "redis" },
      ],
    };
  };

  // If loading takes too long, use fallback data
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !graphData) {
        setGraphData(getFallbackData());
        setLoading(false);
        setError("Using simulation data - could not connect to API");
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading, graphData]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Topology
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Interactive visualization of RetailShift's microservices architecture
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Legend */}
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Chip
          label="Service"
          sx={{ bgcolor: theme.palette.primary.main, color: "white" }}
        />
        <Chip
          label="Database"
          sx={{ bgcolor: theme.palette.secondary.main, color: "white" }}
        />
        <Chip
          label="Message Bus"
          sx={{ bgcolor: theme.palette.warning.main, color: "white" }}
        />
        <Chip
          label="Cache"
          sx={{ bgcolor: theme.palette.info.main, color: "white" }}
        />
        <Chip
          label="Client"
          sx={{ bgcolor: theme.palette.success.main, color: "white" }}
        />
      </Box>

      <Paper
        elevation={2}
        className="graph-container"
        sx={{ p: 0, height: "calc(100vh - 220px)", minHeight: "500px" }}
      >
        {loading && !graphData ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            nodeColor={getNodeColor}
            nodeRelSize={7}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={(d) => d.value * 0.01}
            linkWidth={1}
            backgroundColor={theme.palette.background.paper}
            linkColor={() => theme.palette.divider}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const backgroundSize = [textWidth + 8, fontSize + 4].map(
                (n) => n + fontSize * 0.2
              );

              // Draw circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = getNodeColor(node);
              ctx.fill();

              // Draw text background
              ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
              ctx.fillRect(
                node.x - backgroundSize[0] / 2,
                node.y + 7,
                backgroundSize[0],
                backgroundSize[1]
              );

              // Draw text
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#fff";
              ctx.fillText(label, node.x, node.y + 7 + backgroundSize[1] / 2);
            }}
          />
        )}
      </Paper>
    </Box>
  );
}

export default SystemTopology;
