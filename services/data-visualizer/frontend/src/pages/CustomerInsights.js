import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import StarIcon from "@mui/icons-material/Star";
import EmailIcon from "@mui/icons-material/Email";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PublicIcon from "@mui/icons-material/Public";

// Generate sample customer data
const generateCustomers = (count = 50) => {
  const statuses = ["active", "inactive", "pending"];
  const regions = ["North", "South", "East", "West", "Central"];
  const segments = ["New", "Regular", "VIP", "At Risk", "Lapsed"];

  const customers = [];

  for (let i = 0; i < count; i++) {
    const registrationDate = new Date();
    registrationDate.setDate(
      registrationDate.getDate() - Math.floor(Math.random() * 365)
    );

    const lastActivityDate = new Date();
    lastActivityDate.setDate(
      lastActivityDate.getDate() - Math.floor(Math.random() * 30)
    );

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const totalSpend = parseFloat((Math.random() * 1000 + 50).toFixed(2));

    customers.push({
      id: `CUST-${10000 + i}`,
      name: `Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      status,
      region,
      segment,
      registrationDate: registrationDate.toISOString(),
      lastActivityDate: lastActivityDate.toISOString(),
      purchaseCount: Math.floor(Math.random() * 20) + 1,
      totalSpend,
      averageOrderValue: parseFloat(
        (totalSpend / (Math.floor(Math.random() * 20) + 1)).toFixed(2)
      ),
    });
  }

  return customers;
};

// Generate region data for charts
const generateRegionData = (customers) => {
  const regionMap = {};

  customers.forEach((customer) => {
    if (!regionMap[customer.region]) {
      regionMap[customer.region] = 0;
    }
    regionMap[customer.region]++;
  });

  return Object.keys(regionMap).map((region) => ({
    name: region,
    value: regionMap[region],
  }));
};

// Generate segment data for charts
const generateSegmentData = (customers) => {
  const segmentMap = {};

  customers.forEach((customer) => {
    if (!segmentMap[customer.segment]) {
      segmentMap[customer.segment] = 0;
    }
    segmentMap[customer.segment]++;
  });

  return Object.keys(segmentMap).map((segment) => ({
    name: segment,
    value: segmentMap[segment],
  }));
};

// Generate activity data for charts
const generateActivityData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    name: day,
    registrations: Math.floor(Math.random() * 15) + 5,
    activity: Math.floor(Math.random() * 40) + 20,
  }));
};

function CustomerInsights({ recentEvents = [] }) {
  const theme = useTheme();
  const [customers, setCustomers] = useState(generateCustomers());
  const [regionData, setRegionData] = useState([]);
  const [segmentData, setSegmentData] = useState([]);
  const [activityData, setActivityData] = useState(generateActivityData());
  const [recentActivities, setRecentActivities] = useState([]);

  // COLORS for pie charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  // Process customer events
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      // Update recent activities
      const newActivities = recentEvents.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        customerId: event.data?.customer_id || "Unknown",
        customerName: event.data?.name || "Unknown Customer",
        email: event.data?.email || "",
      }));

      setRecentActivities((prevActivities) => {
        const combined = [...newActivities, ...prevActivities];
        return combined.slice(0, 10); // Keep only the 10 most recent
      });

      // If it's a registration event, add a new customer
      const registrations = recentEvents.filter(
        (e) => e.type === "CUSTOMER_REGISTRATION"
      );
      if (registrations.length > 0) {
        const newCustomers = registrations.map((event) => {
          const data = event.data || {};
          return {
            id:
              data.customer_id ||
              `CUST-${Math.floor(Math.random() * 90000) + 10000}`,
            name: data.name || "New Customer",
            email: data.email || "customer@example.com",
            status: "active",
            region: "Central", // Default region for new customers
            segment: "New",
            registrationDate: event.timestamp || new Date().toISOString(),
            lastActivityDate: event.timestamp || new Date().toISOString(),
            purchaseCount: 0,
            totalSpend: 0,
            averageOrderValue: 0,
          };
        });

        setCustomers((prevCustomers) => [...newCustomers, ...prevCustomers]);
      }
    }
  }, [recentEvents]);

  // Update chart data when customers change
  useEffect(() => {
    setRegionData(generateRegionData(customers));
    setSegmentData(generateSegmentData(customers));
  }, [customers]);

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

  // Calculate customer metrics
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const newCustomers = customers.filter((c) => {
    const regDate = new Date(c.registrationDate);
    const today = new Date();
    const daysDiff = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7; // Registered in the last 7 days
  }).length;

  const totalSpend = customers.reduce(
    (sum, customer) => sum + customer.totalSpend,
    0
  );
  const averageSpend = totalSpend / customers.length;

  // Get top customers by spend
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Customer Insights
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Analytics and trends for customer behavior and demographics
      </Typography>

      {/* Customer Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <GroupIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Customers</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {customers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeCustomers} active customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <PersonAddIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">New Customers</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {newCustomers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In the last 7 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <LocalOfferIcon
                  sx={{ color: theme.palette.success.main, mr: 1 }}
                />
                <Typography variant="h6">Average Spend</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(averageSpend)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Per customer lifetime
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <EmailIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
                <Typography variant="h6">Email Subscribers</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {Math.floor(customers.length * 0.85)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.floor(
                  ((customers.length * 0.85) / customers.length) * 100
                )}
                % of customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Region Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Customers by Region
            </Typography>
            <Box
              sx={{ height: 300, display: "flex", justifyContent: "center" }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill={theme.palette.primary.main}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {regionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} customers`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Segment Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Customer Segments
            </Typography>
            <Box
              sx={{ height: 300, display: "flex", justifyContent: "center" }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill={theme.palette.secondary.main}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {segmentData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} customers`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Activity Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Weekly Activity
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activityData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="registrations"
                    name="New Customers"
                    fill={theme.palette.secondary.main}
                  />
                  <Bar
                    dataKey="activity"
                    name="Active Sessions"
                    fill={theme.palette.primary.main}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Bottom Section: Top Customers and Recent Activity */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Top Customers */}
        <Grid item xs={12} md={6}>
          <Paper>
            <CardHeader
              title="Top Customers by Spend"
              titleTypographyProps={{ variant: "h6" }}
            />
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Segment</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Total Spend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              mr: 1,
                              bgcolor: theme.palette.primary.main,
                            }}
                          >
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {customer.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {customer.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.segment}
                          size="small"
                          color={
                            customer.segment === "VIP"
                              ? "secondary"
                              : customer.segment === "Regular"
                              ? "primary"
                              : customer.segment === "New"
                              ? "success"
                              : customer.segment === "At Risk"
                              ? "warning"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {customer.purchaseCount}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(customer.totalSpend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Paper>
            <CardHeader
              title="Recent Customer Activities"
              titleTypographyProps={{ variant: "h6" }}
            />
            <List sx={{ maxHeight: 350, overflow: "auto" }}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider variant="inset" component="li" />}
                    <ListItem
                      alignItems="flex-start"
                      className={index === 0 ? "new-event" : ""}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: activity.type.includes("REGISTRATION")
                              ? theme.palette.success.main
                              : theme.palette.primary.main,
                          }}
                        >
                          {activity.type.includes("REGISTRATION") ? (
                            <PersonAddIcon />
                          ) : (
                            <PersonIcon />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" component="span">
                              {activity.type}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatTime(activity.timestamp)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {activity.customerName}
                            </Typography>
                            {" — "}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              {activity.customerId}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No recent activities"
                    secondary="Customer events will appear here when received"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Customer Table */}
      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
          All Customers
        </Typography>
        <TableContainer className="scrollable-table">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Segment</TableCell>
                <TableCell>Region</TableCell>
                <TableCell align="right">Total Spend</TableCell>
                <TableCell>Last Activity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.slice(0, 20).map((customer) => (
                <TableRow
                  key={customer.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {customer.id}
                  </TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={customer.status}
                      size="small"
                      color={
                        customer.status === "active"
                          ? "success"
                          : customer.status === "inactive"
                          ? "error"
                          : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell>{customer.segment}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PublicIcon fontSize="small" sx={{ mr: 0.5 }} />
                      {customer.region}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(customer.totalSpend)}
                  </TableCell>
                  <TableCell>{formatTime(customer.lastActivityDate)}</TableCell>
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
