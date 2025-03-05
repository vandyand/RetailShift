import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  AccessTime as AccessTimeIcon,
  PriceCheck as PriceCheckIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Generate transaction data
const generateTransactionData = () => {
  const hours = [];
  const now = new Date();
  now.setMinutes(0, 0, 0); // Start at the current hour

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    hours.push({
      time: time.getHours() + ":00",
      value: Math.floor(Math.random() * 200) + 50,
      count: Math.floor(Math.random() * 20) + 5,
    });
  }

  return hours;
};

// COLORS for pie chart
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// Generate payment method data
const generatePaymentData = () => {
  return [
    { name: "Credit Card", value: 45 },
    { name: "Debit Card", value: 30 },
    { name: "Mobile Payment", value: 15 },
    { name: "Cash", value: 8 },
    { name: "Gift Card", value: 2 },
  ];
};

function TransactionStream({ events }) {
  const [transactions, setTransactions] = useState([]);
  const [hourlyData, setHourlyData] = useState(generateTransactionData());
  const [paymentData, setPaymentData] = useState(generatePaymentData());
  const [todaySales, setTodaySales] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [averageOrder, setAverageOrder] = useState(0);

  // Process transaction events from Kafka
  useEffect(() => {
    if (events && events.length > 0) {
      // Create a copy of the most recent events
      const newTransactions = events.slice(0, 10).map((event) => ({
        id:
          event.data?.transaction_id ||
          `TXN-${Math.floor(Math.random() * 10000)}`,
        store:
          event.data?.store_id || `Store ${Math.floor(Math.random() * 5) + 1}`,
        amount:
          event.data?.amount || parseFloat((Math.random() * 200).toFixed(2)),
        items: event.data?.items || Math.floor(Math.random() * 10) + 1,
        status: event.data?.status || "completed",
        timestamp: event.timestamp || new Date().toISOString(),
      }));

      setTransactions(newTransactions);

      // Update metrics based on new transactions
      const amounts = newTransactions.map((t) => t.amount);
      const totalSales = amounts.reduce((sum, val) => sum + val, 0);
      setTodaySales((prev) => prev + totalSales);
      setTransactionCount((prev) => prev + newTransactions.length);
      setAverageOrder(amounts.length > 0 ? totalSales / amounts.length : 0);

      // Update hourly data
      setHourlyData((prevData) => {
        const updatedData = [...prevData];
        const lastHour = updatedData[updatedData.length - 1];

        updatedData[updatedData.length - 1] = {
          ...lastHour,
          value: lastHour.value + totalSales,
          count: lastHour.count + newTransactions.length,
        };

        return updatedData;
      });
    }
  }, [events]);

  // Format timestamp to a readable format
  const formatTime = (isoString) => {
    if (!isoString) return "Unknown";

    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Transaction Stream
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Real-time monitoring of sales transactions across all retail locations
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{ height: "100%", bgcolor: "primary.dark", color: "white" }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
              >
                <PriceCheckIcon sx={{ mr: 1 }} /> Today's Sales
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(todaySales)}
              </Typography>
              <Chip
                size="small"
                icon={<TrendingUpIcon />}
                label="+12.5%"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
              >
                <AccessTimeIcon sx={{ mr: 1 }} /> Transactions
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {transactionCount}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={70}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
              >
                <StoreIcon sx={{ mr: 1 }} /> Average Order
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(averageOrder)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircularProgress
                  variant="determinate"
                  value={65}
                  size={24}
                  thickness={6}
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  65% of target
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Sales Trend (24h)
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={hourlyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Sales ($)"
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Number of Transactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Payment Methods
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {paymentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Transactions */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Transactions
        </Typography>

        {transactions.length === 0 ? (
          <Alert severity="info">
            No transaction data available yet. Transactions will appear here as
            they occur.
          </Alert>
        ) : (
          <List>
            {transactions.map((transaction, index) => (
              <React.Fragment key={transaction.id}>
                <ListItem>
                  <Box
                    sx={{
                      mr: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 80,
                    }}
                  >
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(transaction.amount)}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${transaction.items} items`}
                      color="default"
                      variant="outlined"
                    />
                  </Box>

                  <ListItemText
                    primary={transaction.id}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {transaction.store}
                        </Typography>
                        {` — ${formatTime(transaction.timestamp)}`}
                      </>
                    }
                  />

                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={transaction.status}
                      color={
                        transaction.status === "completed"
                          ? "success"
                          : "warning"
                      }
                    />
                  </Stack>
                </ListItem>
                {index < transactions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default TransactionStream;
