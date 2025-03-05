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
  TextField,
  InputAdornment,
  Alert,
  Chip,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

// Function to generate sample inventory data
const generateSampleData = () => {
  const categories = [
    "Electronics",
    "Clothing",
    "Home Goods",
    "Groceries",
    "Beauty",
    "Toys",
    "Sports",
    "Books",
  ];

  const locations = [
    "Store 1",
    "Store 2",
    "Store 3",
    "Warehouse A",
    "Warehouse B",
  ];

  const data = [];

  for (let i = 0; i < 50; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const quantity = Math.floor(Math.random() * 100);
    const status = quantity < 10 ? "low_stock" : "in_stock";

    data.push({
      id: `PROD-${1000 + i}`,
      name: `Product ${i + 1}`,
      category,
      location,
      quantity,
      status,
      lastUpdated: new Date(
        Date.now() - Math.floor(Math.random() * 86400000)
      ).toISOString(),
    });
  }

  return data;
};

// Function to generate chart data for inventory by category
const generateCategoryData = (inventoryData) => {
  const categoryMap = {};

  inventoryData.forEach((item) => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = 0;
    }
    categoryMap[item.category] += item.quantity;
  });

  return Object.keys(categoryMap).map((category) => ({
    name: category,
    value: categoryMap[category],
  }));
};

// Function to generate chart data for inventory by location
const generateLocationData = (inventoryData) => {
  const locationMap = {};

  inventoryData.forEach((item) => {
    if (!locationMap[item.location]) {
      locationMap[item.location] = 0;
    }
    locationMap[item.location] += item.quantity;
  });

  return Object.keys(locationMap).map((location) => ({
    name: location,
    value: locationMap[location],
  }));
};

function InventoryMonitor({ recentEvents = [] }) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryData, setInventoryData] = useState(generateSampleData());
  const [filteredData, setFilteredData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  // Process inventory events
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      // Update last event
      setLastEvent(recentEvents[0]);

      // In a real application, we would update the inventory data based on the events
      // For demo purposes, we'll just randomly update some inventory items
      setInventoryData((prevData) => {
        const newData = [...prevData];
        const index = Math.floor(Math.random() * newData.length);

        if (index < newData.length) {
          newData[index] = {
            ...newData[index],
            quantity: Math.floor(Math.random() * 100),
            lastUpdated: new Date().toISOString(),
          };

          // Update status based on quantity
          newData[index].status =
            newData[index].quantity < 10 ? "low_stock" : "in_stock";
        }

        return newData;
      });
    }
  }, [recentEvents]);

  // Filter inventory data based on search term
  useEffect(() => {
    const filtered = inventoryData.filter(
      (item) =>
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredData(filtered);

    // Update chart data
    setCategoryData(generateCategoryData(inventoryData));
    setLocationData(generateLocationData(inventoryData));

    // Count low stock items
    const lowStock = inventoryData.filter(
      (item) => item.status === "low_stock"
    ).length;
    setLowStockCount(lowStock);
  }, [searchTerm, inventoryData]);

  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inventory Monitor
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Real-time monitoring of inventory levels and updates
      </Typography>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <Alert
          severity="warning"
          icon={<NotificationsActiveIcon />}
          sx={{ mb: 3 }}
        >
          {lowStockCount} items are currently low in stock and need attention
        </Alert>
      )}

      {/* Latest update notification */}
      {lastEvent && (
        <Alert severity="info" icon={<InventoryIcon />} sx={{ mb: 3 }}>
          Latest update: {lastEvent.type} at {formatTime(lastEvent.timestamp)}
        </Alert>
      )}

      {/* Search field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by ID, name, category, or location"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Charts section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Inventory by Category
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke={theme.palette.text.secondary}
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Quantity"
                    fill={theme.palette.primary.main}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Inventory by Location
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={locationData}
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
                  <Bar
                    dataKey="value"
                    name="Quantity"
                    fill={theme.palette.secondary.main}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Inventory table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer className="scrollable-table">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Product ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow
                  key={item.id}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    bgcolor:
                      item.status === "low_stock"
                        ? alpha(theme.palette.warning.main, 0.1)
                        : "inherit",
                  }}
                >
                  <TableCell component="th" scope="row">
                    {item.id}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        item.status === "low_stock" ? "Low Stock" : "In Stock"
                      }
                      color={
                        item.status === "low_stock" ? "warning" : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatTime(item.lastUpdated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// Helper function to create transparent color
function alpha(color, alpha) {
  return (
    color +
    Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

export default InventoryMonitor;
