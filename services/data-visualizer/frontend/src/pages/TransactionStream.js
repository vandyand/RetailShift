import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  LinearProgress,
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
  AreaChart,
  Area,
} from "recharts";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

// Generate sample transaction data
const generateSampleData = (count = 20) => {
  const data = [];
  const now = new Date();
  const stores = ["Store 1", "Store 2", "Store 3", "Store 4", "Store 5"];
  const items = [
    "Product A",
    "Product B",
    "Product C",
    "Product D",
    "Product E",
  ];

  for (let i = 0; i < count; i++) {
    const storeId = stores[Math.floor(Math.random() * stores.length)];
    const timestamp = new Date(now.getTime() - i * 2 * 60000); // 2 min intervals back in time
    const amount = parseFloat((Math.random() * 150 + 10).toFixed(2));
    const itemCount = Math.floor(Math.random() * 8) + 1;
    const itemsArray = [];

    // Generate random items for this transaction
    for (let j = 0; j < itemCount; j++) {
      itemsArray.push({
        name: items[Math.floor(Math.random() * items.length)],
        price: parseFloat((Math.random() * 30 + 5).toFixed(2)),
        quantity: Math.floor(Math.random() * 3) + 1,
      });
    }

    data.push({
      id: `TXN-${10000 + i}`,
      timestamp: timestamp.toISOString(),
      storeId,
      amount,
      items: itemCount,
      itemsArray,
      status: Math.random() > 0.05 ? "completed" : "pending",
    });
  }

  return data;
};

// Generate time series chart data
const generateTimeSeriesData = () => {
  const data = [];
  const now = new Date();

  // Generate data for the last 24 hours with hourly intervals
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();

    // More transactions during business hours (9am-9pm)
    let volumeMultiplier = hour >= 9 && hour <= 21 ? 1 : 0.3;
    // Peak hours
    if (hour >= 11 && hour <= 14) volumeMultiplier = 1.5; // lunch peak
    if (hour >= 17 && hour <= 19) volumeMultiplier = 1.8; // evening peak

    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fullTime: time,
      count: Math.floor(Math.random() * 15 * volumeMultiplier) + 5,
      value: parseFloat(
        (Math.random() * 1000 * volumeMultiplier + 200).toFixed(2)
      ),
    });
  }

  return data;
};

function TransactionStream({ recentEvents = [] }) {
  const theme = useTheme();
  const [transactions, setTransactions] = useState(generateSampleData(25));
  const [timeSeriesData, setTimeSeriesData] = useState(
    generateTimeSeriesData()
  );
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [stats, setStats] = useState({
    totalToday: 0,
    totalAmount: 0,
    averageValue: 0,
    mostActiveStore: "",
  });

  // Update when new transaction events come in
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      const newEvent = recentEvents[0];

      if (newEvent && newEvent.data) {
        // Add new transaction to the list
        const newTransaction = {
          id:
            newEvent.data.transaction_id ||
            `TXN-${Math.floor(Math.random() * 90000) + 10000}`,
          timestamp: newEvent.timestamp,
          storeId: newEvent.data.store_id,
          amount: newEvent.data.amount,
          items: newEvent.data.items,
          itemsArray: [], // In a real app, we'd have the real items
          status: newEvent.data.status || "completed",
        };

        setTransactions((prevTransactions) => [
          newTransaction,
          ...prevTransactions.slice(0, 24),
        ]);

        // Update time series data with a new data point
        setTimeSeriesData((prevData) => {
          const now = new Date();
          const lastTime = prevData[prevData.length - 1].fullTime;
          let newData = [...prevData];

          // If more than an hour has passed since the last data point, add a new one
          if (now - lastTime > 60 * 60 * 1000) {
            newData.push({
              time: now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              fullTime: now,
              count: 1,
              value: newTransaction.amount,
            });

            // Remove oldest data point if we have more than 25
            if (newData.length > 25) {
              newData.shift();
            }
          } else {
            // Update the last data point
            const last = newData[newData.length - 1];
            newData[newData.length - 1] = {
              ...last,
              count: last.count + 1,
              value: last.value + newTransaction.amount,
            };
          }

          return newData;
        });
      }
    }
  }, [recentEvents]);

  // Calculate stats
  useEffect(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const transactionsToday = transactions.filter(
      (t) => new Date(t.timestamp) >= today
    );
    const totalAmount = transactionsToday.reduce((sum, t) => sum + t.amount, 0);

    // Count transactions by store
    const storeCount = {};
    transactions.forEach((t) => {
      storeCount[t.storeId] = (storeCount[t.storeId] || 0) + 1;
    });

    // Find most active store
    let mostActiveStore = "";
    let maxCount = 0;
    Object.entries(storeCount).forEach(([store, count]) => {
      if (count > maxCount) {
        mostActiveStore = store;
        maxCount = count;
      }
    });

    setStats({
      totalToday: transactionsToday.length,
      totalAmount,
      averageValue: totalAmount / (transactionsToday.length || 1),
      mostActiveStore,
    });
  }, [transactions]);

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
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
        Real-time monitoring of retail transactions across all stores
      </Typography>

      {/* Transaction Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Today's Transactions
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {stats.totalToday}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((stats.totalToday / 150) * 100, 100)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <AttachMoneyIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {formatCurrency(stats.totalAmount)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((stats.totalAmount / 10000) * 100, 100)}
                sx={{ height: 8, borderRadius: 4 }}
                color="secondary"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TrendingUpIcon
                  sx={{ color: theme.palette.success.main, mr: 1 }}
                />
                <Typography variant="h6" component="div">
                  Average Value
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {formatCurrency(stats.averageValue)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((stats.averageValue / 100) * 100, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: theme.palette.success.main,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <ShoppingCartIcon
                  sx={{ color: theme.palette.info.main, mr: 1 }}
                />
                <Typography variant="h6" component="div">
                  Most Active Store
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                {stats.mostActiveStore || "N/A"}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: theme.palette.info.main,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transaction Volume Chart */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Transaction Volume (Last 24 Hours)
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
                formatter={(value) => [`${value} transactions`, "Count"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={theme.palette.primary.main}
                fill={`${theme.palette.primary.main}40`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Transaction Value Chart */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Transaction Value (Last 24 Hours)
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
                formatter={(value) => [formatCurrency(value), "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.palette.secondary.main}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Recent Transactions Table */}
      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
          Recent Transactions
        </Typography>
        <TableContainer className="scrollable-table">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Store</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className={index === 0 ? "new-event" : ""}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell component="th" scope="row">
                    {transaction.id}
                  </TableCell>
                  <TableCell>{formatTime(transaction.timestamp)}</TableCell>
                  <TableCell>{transaction.storeId}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell align="right">{transaction.items}</TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.status}
                      color={
                        transaction.status === "completed"
                          ? "success"
                          : "warning"
                      }
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default TransactionStream;
