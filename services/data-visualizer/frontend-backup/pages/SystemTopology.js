import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, Paper, CircularProgress, Chip } from "@mui/material";
import ForceGraph2D from "react-force-graph";
import axios from "axios";

function SystemTopology() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch system topology data
  const fetchTopologyData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/system/topology");
      setGraphData(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch topology data:", err);
      setError("Failed to load system topology. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load topology data on component mount
  useEffect(() => {
    fetchTopologyData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchTopologyData, 30000);
    return () => clearInterval(interval);
  }, [fetchTopologyData]);

  // Generate a color based on node type
  const getNodeColor = (node) => {
    switch (node.type) {
      case "service":
        return "#1976d2"; // Blue
      case "database":
        return "#388e3c"; // Green
      case "messagebus":
        return "#d32f2f"; // Red
      case "cache":
        return "#f57c00"; // Orange
      case "client":
        return "#7b1fa2"; // Purple
      default:
        return "#757575"; // Grey
    }
  };

  // Fallback data for demo purposes if API is not available
  const getFallbackData = () => {
    return {
      nodes: [
        { id: "legacy-pos", group: 1, label: "Legacy POS", type: "database" },
        {
          id: "legacy-adapter",
          group: 2,
          label: "Legacy Adapter",
          type: "service",
        },
        { id: "kafka", group: 3, label: "Kafka", type: "messagebus" },
        {
          id: "inventory-service",
          group: 2,
          label: "Inventory Service",
          type: "service",
        },
        { id: "mongodb", group: 1, label: "MongoDB", type: "database" },
        { id: "redis", group: 1, label: "Redis", type: "cache" },
        { id: "client-app", group: 4, label: "Client App", type: "client" },
      ],
      links: [
        {
          source: "legacy-pos",
          target: "legacy-adapter",
          value: 5,
          label: "JDBC",
        },
        {
          source: "legacy-adapter",
          target: "kafka",
          value: 10,
          label: "Produces",
        },
        {
          source: "kafka",
          target: "inventory-service",
          value: 5,
          label: "Consumes",
        },
        {
          source: "inventory-service",
          target: "mongodb",
          value: 8,
          label: "Stores",
        },
        {
          source: "inventory-service",
          target: "redis",
          value: 3,
          label: "Caches",
        },
        {
          source: "legacy-adapter",
          target: "client-app",
          value: 2,
          label: "REST",
        },
        {
          source: "inventory-service",
          target: "client-app",
          value: 7,
          label: "REST",
        },
        {
          source: "inventory-service",
          target: "kafka",
          value: 4,
          label: "Produces",
        },
      ],
    };
  };

  // Use fallback data if loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !graphData) {
        setGraphData(getFallbackData());
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading, graphData]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Topology
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Interactive visualization of RetailShift's microservices architecture
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Chip label="Service" sx={{ bgcolor: "#1976d2", color: "white" }} />
          <Chip label="Database" sx={{ bgcolor: "#388e3c", color: "white" }} />
          <Chip
            label="Message Bus"
            sx={{ bgcolor: "#d32f2f", color: "white" }}
          />
          <Chip label="Cache" sx={{ bgcolor: "#f57c00", color: "white" }} />
          <Chip label="Client" sx={{ bgcolor: "#7b1fa2", color: "white" }} />
        </Box>

        <Typography variant="body2" paragraph>
          Drag nodes to explore the system topology. Hover over connections to
          see relationship types.
        </Typography>
      </Paper>

      {loading && !graphData ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Paper
          elevation={2}
          sx={{ p: 3, textAlign: "center", bgcolor: "error.light" }}
        >
          <Typography variant="h6" color="error.dark" gutterBottom>
            {error}
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={2}
          sx={{ height: "calc(100vh - 300px)", minHeight: "500px" }}
        >
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="label"
            nodeColor={getNodeColor}
            nodeRelSize={8}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={(d) => d.value * 0.01}
            linkLabel="label"
            linkWidth={(link) => Math.sqrt(link.value)}
            cooldownTicks={100}
            onEngineStop={() => console.log("Graph rendering complete")}
          />
        </Paper>
      )}
    </Box>
  );
}

export default SystemTopology;
