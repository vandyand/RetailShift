import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  Loyalty as LoyaltyIcon,
  LocationOn as LocationOnIcon,
  GroupAdd as GroupAddIcon,
  GroupRemove as GroupRemoveIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  Cell,
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
} from "recharts";

// Generate demographic data
const generateDemographicData = () => {
  return [
    { name: "18-24", value: 15 },
    { name: "25-34", value: 30 },
    { name: "35-44", value: 25 },
    { name: "45-54", value: 18 },
    { name: "55+", value: 12 },
  ];
};

// Generate customer acquisition data
const generateAcquisitionData = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonth = new Date().getMonth();

  return Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (currentMonth - 11 + i) % 12;
    return {
      month: months[monthIndex],
      new: Math.floor(Math.random() * 300) + 50,
      returning: Math.floor(Math.random() * 500) + 100,
      churn: Math.floor(Math.random() * 50) + 10,
    };
  });
};

// Generate purchasing behavior data
const generatePurchasingData = () => {
  return [
    { name: "Apparel", customers: 380, transactions: 620 },
    { name: "Electronics", customers: 210, transactions: 310 },
    { name: "Home Goods", customers: 170, transactions: 240 },
    { name: "Groceries", customers: 440, transactions: 920 },
    { name: "Beauty", customers: 190, transactions: 280 },
    { name: "Accessories", customers: 120, transactions: 160 },
  ];
};

// Generate top customers
const generateTopCustomers = () => {
  const customers = [
    {
      id: "C10045",
      name: "Emma Johnson",
      location: "New York",
      spend: 1240.5,
      loyalty: "Gold",
      lastPurchase: "2023-11-10T15:30:00Z",
    },
    {
      id: "C20589",
      name: "Michael Chen",
      location: "San Francisco",
      spend: 980.75,
      loyalty: "Platinum",
      lastPurchase: "2023-11-12T12:45:00Z",
    },
    {
      id: "C30982",
      name: "Sarah Williams",
      location: "Chicago",
      spend: 750.25,
      loyalty: "Silver",
      lastPurchase: "2023-11-08T09:15:00Z",
    },
    {
      id: "C15671",
      name: "David Rodriguez",
      location: "Miami",
      spend: 690.0,
      loyalty: "Gold",
      lastPurchase: "2023-11-11T17:20:00Z",
    },
    {
      id: "C25109",
      name: "Lisa Thompson",
      location: "Seattle",
      spend: 520.8,
      loyalty: "Silver",
      lastPurchase: "2023-11-09T14:10:00Z",
    },
  ];

  return customers;
};

// COLORS for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

function CustomerInsights({ events }) {
  const [demographicData, setDemographicData] = useState(
    generateDemographicData()
  );
  const [acquisitionData, setAcquisitionData] = useState(
    generateAcquisitionData()
  );
  const [purchasingData, setPurchasingData] = useState(
    generatePurchasingData()
  );
  const [topCustomers, setTopCustomers] = useState(generateTopCustomers());
  const [customerCount, setCustomerCount] = useState(15420);
  const [retentionRate, setRetentionRate] = useState(84.2);
  const [customerLifetimeValue, setCustomerLifetimeValue] = useState(725.8);

  // Process customer events from Kafka
  useEffect(() => {
    if (events && events.length > 0) {
      // Filter relevant customer events
      const customerEvents = events.filter(
        (event) =>
          event.topic === "customer-events" ||
          event.type === "CUSTOMER_UPDATE" ||
          event.type === "CUSTOMER_REGISTRATION"
      );

      if (customerEvents.length > 0) {
        // Update metrics based on new events
        setCustomerCount((prev) => prev + Math.floor(Math.random() * 5));
        setRetentionRate((prev) =>
          Math.min(100, prev + (Math.random() - 0.5) * 0.2)
        );
        setCustomerLifetimeValue((prev) => prev + (Math.random() - 0.5) * 2);

        // Update acquisition data
        setAcquisitionData((prevData) => {
          const updated = [...prevData];
          const lastIndex = updated.length - 1;

          updated[lastIndex] = {
            ...updated[lastIndex],
            new: updated[lastIndex].new + Math.floor(Math.random() * 5),
            returning:
              updated[lastIndex].returning + Math.floor(Math.random() * 10),
            churn: updated[lastIndex].churn + Math.floor(Math.random() * 2),
          };

          return updated;
        });
      }
    }
  }, [events]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Get loyalty color
  const getLoyaltyColor = (level) => {
    switch (level) {
      case "Platinum":
        return "primary";
      case "Gold":
        return "warning";
      case "Silver":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Customer Insights
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Analytics and trends from customer behavior across all retail channels
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
              >
                <PersonIcon sx={{ mr: 1 }} /> Total Customers
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {customerCount.toLocaleString()}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <GroupAddIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  +32 new today
                </Typography>
              </Box>
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
                <LoyaltyIcon sx={{ mr: 1 }} /> Retention Rate
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {retentionRate.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={retentionRate}
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
                <ShoppingCartIcon sx={{ mr: 1 }} /> Lifetime Value
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(customerLifetimeValue)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TrendingUpIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  +3.2% this month
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
              Customer Acquisition & Churn
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={acquisitionData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="new"
                  stroke="#8884d8"
                  name="New Customers"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="returning"
                  stroke="#82ca9d"
                  name="Returning Customers"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="churn"
                  stroke="#ff8042"
                  name="Customer Churn"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Demographics
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={demographicData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {demographicData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Purchasing Behavior */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Purchasing Behavior by Category
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={purchasingData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="customers" name="Unique Customers" fill="#8884d8" />
            <Bar
              dataKey="transactions"
              name="Total Transactions"
              fill="#82ca9d"
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Top Customers */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Top Customers
        </Typography>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="top customers table">
            <TableHead>
              <TableRow>
                <TableCell>Customer ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Loyalty Level</TableCell>
                <TableCell align="right">Total Spend</TableCell>
                <TableCell>Last Purchase</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {topCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell component="th" scope="row">
                    {customer.id}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          mr: 1,
                          bgcolor: "primary.main",
                        }}
                      >
                        {customer.name.charAt(0)}
                      </Avatar>
                      {customer.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LocationOnIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {customer.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={customer.loyalty}
                      color={getLoyaltyColor(customer.loyalty)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(customer.spend)}
                  </TableCell>
                  <TableCell>{formatDate(customer.lastPurchase)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default CustomerInsights;
