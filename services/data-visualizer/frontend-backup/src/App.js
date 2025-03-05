import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import io from "socket.io-client";

// Components
import Layout from "./components/Layout";

// Pages
import Dashboard from "./pages/Dashboard";
import SystemTopology from "./pages/SystemTopology";
import InventoryMonitor from "./pages/InventoryMonitor";
import TransactionStream from "./pages/TransactionStream";
import CustomerInsights from "./pages/CustomerInsights";

// Environment-aware socket URL
const socketUrl =
  process.env.NODE_ENV === "production"
    ? window.location.origin
    : "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [systemState, setSystemState] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // Socket event handlers
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    newSocket.on("system-state", (data) => {
      console.log("Received system state:", data);
      setSystemState(data);
    });

    newSocket.on("recent-events", (data) => {
      console.log("Received recent events:", data);
      setRecentEvents(data);
    });

    newSocket.on("kafka-event", (event) => {
      console.log("Received Kafka event:", event);
      // Prepend new event and limit to 100 events
      setRecentEvents((prev) => {
        const updated = [event, ...prev];
        return updated.slice(0, 100);
      });
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // If not connected, show loading indicator
  if (!connected) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <CircularProgress size={60} color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Connecting to server...
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <Dashboard systemState={systemState} recentEvents={recentEvents} />
          }
        />
        <Route path="system-topology" element={<SystemTopology />} />
        <Route
          path="inventory"
          element={
            <InventoryMonitor
              recentEvents={recentEvents.filter(
                (e) => e.topic === "retailshift.inventory"
              )}
            />
          }
        />
        <Route
          path="transactions"
          element={
            <TransactionStream
              recentEvents={recentEvents.filter(
                (e) => e.topic === "retailshift.transactions"
              )}
            />
          }
        />
        <Route
          path="customers"
          element={
            <CustomerInsights
              recentEvents={recentEvents.filter(
                (e) => e.topic === "retailshift.customers"
              )}
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
