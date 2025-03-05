import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  Stack,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Sample data for charts
const generateSampleData = () => {
  const data = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    data.push({
      time: time.toLocaleTimeString(),
      transactions: Math.floor(Math.random() * 50) + 20,
      inventory: Math.floor(Math.random() * 30) + 10,
      customers: Math.floor(Math.random() * 20) + 5,
    });
  }

  return data;
};

function Dashboard({ systemState, events }) {
  const [chartData, setChartData] = useState(generateSampleData());
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    // Update recent events when new events arrive
    if (events && events.length > 0) {
      setRecentEvents(events.slice(0, 10));
    }
  }, [events]);

  // Update chart data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prevData) => {
        const newData = [...prevData.slice(1)];
        const lastItem = prevData[prevData.length - 1];

        newData.push({
          time: new Date().toLocaleTimeString(),
          transactions:
            lastItem.transactions +
            (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 10),
          inventory:
            lastItem.inventory +
            (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 5),
          customers:
            lastItem.customers +
            (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3),
        });

        return newData;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const renderStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "warning":
        return <WarningIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const formatEventType = (event) => {
    if (!event || !event.data) return "Unknown Event";

    return event.data.type || "Event";
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RetailShift Dashboard
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Real-time monitoring and visualization of the RetailShift microservices
        ecosystem
      </Typography>

      {/* System Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Grid container spacing={2}>
              {systemState?.services?.map((service) => (
                <Grid item xs={6} sm={3} md={2} key={service.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      bgcolor:
                        service.status === "active"
                          ? "success.dark"
                          : "error.dark",
                      color: "white",
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", py: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 1,
                        }}
                      >
                        {renderStatusIcon(service.status)}
                      </Box>
                      <Typography variant="body2">{service.id}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts and Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              System Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#8884d8"
                  name="Transactions"
                />
                <Line
                  type="monotone"
                  dataKey="inventory"
                  stroke="#82ca9d"
                  name="Inventory Updates"
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="#ffc658"
                  name="Customer Activity"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Key Metrics
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Transactions
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography variant="h4" sx={{ mr: 1 }}>
                  {systemState?.metrics?.transactions?.count || 0}
                </Typography>
                <Chip
                  size="small"
                  color="success"
                  icon={<TrendingUpIcon />}
                  label="+5.2%"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Average value: $
                {systemState?.metrics?.transactions?.avgValue || 0}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Inventory
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography variant="h4" sx={{ mr: 1 }}>
                  {systemState?.metrics?.inventory?.totalProducts || 0}
                </Typography>
                <Chip
                  size="small"
                  color="error"
                  icon={<TrendingDownIcon />}
                  label="-1.8%"
                />
              </Box>
              <Alert severity="warning" sx={{ mt: 1 }}>
                {systemState?.metrics?.inventory?.lowStock || 0} products with
                low stock
              </Alert>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Customers
              </Typography>
              <Typography variant="h4">
                {systemState?.metrics?.customers?.total || 0}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Active customers:{" "}
                  {systemState?.metrics?.customers?.active || 0}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((systemState?.metrics?.customers?.active || 0) /
                      (systemState?.metrics?.customers?.total || 1)) *
                    100
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Events */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Events
            </Typography>
            <List>
              {recentEvents.length > 0 ? (
                recentEvents.map((event, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={formatEventType(event)}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {event.topic}
                            </Typography>
                            {` — ${new Date(
                              event.timestamp
                            ).toLocaleTimeString()}`}
                          </>
                        }
                      />
                      <Stack direction="row" spacing={1}>
                        <Chip
                          size="small"
                          label={event.topic?.split(".")?.pop() || "unknown"}
                          color={
                            event.topic?.includes("inventory")
                              ? "success"
                              : event.topic?.includes("transaction")
                              ? "primary"
                              : "default"
                          }
                        />
                      </Stack>
                    </ListItem>
                    {index < recentEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No recent events" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
