import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  useTheme,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InventoryIcon from "@mui/icons-material/Inventory";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PeopleIcon from "@mui/icons-material/People";

// Helper function to generate sample chart data
const generateSampleData = () => {
  const data = [];
  const now = new Date();

  // Generate data for the last 30 minutes with 5-minute intervals
  for (let i = 6; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60000);
    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      transactions: Math.floor(Math.random() * 40) + 10,
      inventory: Math.floor(Math.random() * 30) + 5,
      customers: Math.floor(Math.random() * 25) + 5,
    });
  }

  return data;
};

function Dashboard({ systemState, recentEvents }) {
  const theme = useTheme();
  const [chartData, setChartData] = useState(generateSampleData());
  const [displayedEvents, setDisplayedEvents] = useState([]);

  // Update chart data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((current) => {
        const newData = [...current];
        // Remove oldest data point
        newData.shift();

        // Add new data point
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          transactions: Math.floor(Math.random() * 40) + 10,
          inventory: Math.floor(Math.random() * 30) + 5,
          customers: Math.floor(Math.random() * 25) + 5,
        });

        return newData;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Update displayed events when new events arrive
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      setDisplayedEvents(recentEvents.slice(0, 10));
    }
  }, [recentEvents]);

  // Helper function to render status icon
  const renderStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon sx={{ color: "success.main" }} />;
      case "warning":
        return <WarningIcon sx={{ color: "warning.main" }} />;
      case "error":
        return <ErrorIcon sx={{ color: "error.main" }} />;
      default:
        return <CheckCircleIcon sx={{ color: "success.main" }} />;
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Extract event type and details from event
  const getEventDetails = (event) => {
    if (!event || !event.value) return { type: "Unknown", details: "" };

    const value = event.value;
    let type = "";
    let details = "";

    if (event.topic === "retailshift.inventory") {
      type = value.action || "Inventory Update";
      details = value.name
        ? `${value.name}: ${value.quantity} units`
        : value.productId
        ? `Product ${value.productId}`
        : "";
    } else if (event.topic === "retailshift.transactions") {
      type = "Transaction";
      details = value.transactionId ? `ID: ${value.transactionId}` : "";
      if (value.amount)
        details += details
          ? `, $${value.amount.toFixed(2)}`
          : `$${value.amount.toFixed(2)}`;
      if (value.items)
        details += details ? `, ${value.items} items` : `${value.items} items`;
    } else if (event.topic === "retailshift.customers") {
      type = value.action || "Customer Event";
      details = value.customerId ? `ID: ${value.customerId}` : "";
      if (value.loyaltyLevel)
        details += details ? `, ${value.loyaltyLevel}` : value.loyaltyLevel;
    } else {
      type = value.type || "System Event";
      details = value.message || "";
      if (value.service)
        details += details ? ` (${value.service})` : value.service;
    }

    return { type, details };
  };

  // Get color for different event types
  const getEventColor = (event) => {
    if (!event) return theme.palette.text.primary;

    if (event.topic === "retailshift.inventory") {
      return theme.palette.info.main;
    } else if (event.topic === "retailshift.transactions") {
      return theme.palette.success.main;
    } else if (event.topic === "retailshift.customers") {
      return theme.palette.warning.main;
    } else {
      return theme.palette.secondary.main;
    }
  };

  // Get background color for event items
  const getEventBackgroundColor = (event) => {
    if (!event) return "transparent";

    if (event.topic === "retailshift.inventory") {
      return theme.palette.info.light + "10"; // 10% transparency
    } else if (event.topic === "retailshift.transactions") {
      return theme.palette.success.light + "10";
    } else if (event.topic === "retailshift.customers") {
      return theme.palette.warning.light + "10";
    } else {
      return theme.palette.secondary.light + "10";
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RetailShift Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Real-time overview of system status and activity
      </Typography>

      {/* System Status */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        System Status
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {systemState &&
          Object.entries(systemState.services).map(([id, service]) => (
            <Grid item xs={12} sm={6} md={4} key={id}>
              <Card
                className="status-card"
                sx={{
                  borderLeft: 6,
                  borderColor:
                    service.status === "active"
                      ? "success.main"
                      : service.status === "warning"
                      ? "warning.main"
                      : "error.main",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ mr: 2 }}>{renderStatusIcon(service.status)}</Box>
                  <Box>
                    <Typography variant="h6">{id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {service.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Updated: {formatTime(service.lastUpdated)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* System Activity Charts */}
      <Typography variant="h6" gutterBottom>
        System Activity
      </Typography>
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke={theme.palette.primary.main}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="inventory"
                stroke={theme.palette.secondary.main}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke={theme.palette.success.main}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Typography variant="h6" gutterBottom>
        Key Metrics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardHeader
              title="Transactions"
              avatar={<ReceiptIcon color="primary" />}
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ textAlign: "center", mb: 1 }}>
                1,248
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Today's transactions
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Chip
                  label="$8,720 Revenue"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label="Avg $69.87"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardHeader
              title="Inventory"
              avatar={<InventoryIcon color="secondary" />}
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ textAlign: "center", mb: 1 }}>
                5,724
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Total inventory items
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Chip label="47 Low Stock" size="small" color="warning" />
                <Chip
                  label="12 Locations"
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardHeader
              title="Customers"
              avatar={<PeopleIcon color="success" />}
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="h4" sx={{ textAlign: "center", mb: 1 }}>
                3,487
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Registered customers
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Chip label="24 New Today" size="small" color="success" />
                <Chip
                  label="78% Active"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Events */}
      <Typography variant="h6" gutterBottom>
        Recent Events
      </Typography>
      <Paper sx={{ overflow: "hidden" }}>
        <List dense sx={{ bgcolor: "background.paper" }}>
          {displayedEvents.length > 0 ? (
            displayedEvents.map((event, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  className={index === 0 ? "new-event" : ""}
                  sx={{
                    transition: "background-color 0.3s ease",
                    backgroundColor: getEventBackgroundColor(event),
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item xs={2}>
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color={getEventColor(event)}
                      >
                        {getEventDetails(event).type}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {event.topic}
                      </Typography>
                      {getEventDetails(event).details && (
                        <Typography variant="body2" color="text.primary">
                          {getEventDetails(event).details}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={2} textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(event.timestamp)}
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
              </React.Fragment>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No events received yet"
                secondary="Waiting for system events..."
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}

export default Dashboard;
