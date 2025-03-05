import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, Typography, CircularProgress } from "@mui/material";
import io from "socket.io-client";
import Dashboard from "./pages/Dashboard";
import SystemTopology from "./pages/SystemTopology";
import InventoryMonitor from "./pages/InventoryMonitor";
import TransactionStream from "./pages/TransactionStream";
import Layout from "./components/Layout";

// Socket.io connection
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [systemState, setSystemState] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Connect to the Socket.io server
    const newSocket = io(SOCKET_URL);

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

    newSocket.on("kafka-event", (event) => {
      console.log("Received Kafka event:", event);
      setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  if (!connected) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Connecting to RetailShift...
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={<Dashboard systemState={systemState} events={events} />}
        />
        <Route path="topology" element={<SystemTopology />} />
        <Route
          path="inventory"
          element={
            <InventoryMonitor
              events={events.filter((e) => e.topic === "retailshift.inventory")}
            />
          }
        />
        <Route
          path="transactions"
          element={
            <TransactionStream
              events={events.filter(
                (e) => e.topic === "retailshift.transactions"
              )}
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
