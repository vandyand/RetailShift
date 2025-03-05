import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Generate sample inventory data for visualization
const generateSampleData = () => {
  const categories = [
    "Electronics",
    "Clothing",
    "Home Goods",
    "Groceries",
    "Toys",
  ];
  const locations = ["Store 1", "Store 2", "Warehouse A", "Warehouse B"];

  const products = [];
  for (let i = 1; i <= 20; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const quantity = Math.floor(Math.random() * 100);
    const threshold = Math.floor(Math.random() * 20) + 10;

    products.push({
      id: `PROD-${i.toString().padStart(3, "0")}`,
      name: `Product ${i}`,
      category,
      location,
      quantity,
      threshold,
      status: quantity < threshold ? "low_stock" : "normal",
      lastUpdated: new Date(
        Date.now() - Math.random() * 86400000
      ).toISOString(),
    });
  }

  return products;
};

// Generate chart data for inventory by category
const generateCategoryData = (products) => {
  const categoryMap = {};

  products.forEach((product) => {
    if (!categoryMap[product.category]) {
      categoryMap[product.category] = {
        name: product.category,
        total: 0,
        lowStock: 0,
      };
    }

    categoryMap[product.category].total += 1;
    if (product.status === "low_stock") {
      categoryMap[product.category].lowStock += 1;
    }
  });

  return Object.values(categoryMap);
};

// Generate chart data for inventory by location
const generateLocationData = (products) => {
  const locationMap = {};

  products.forEach((product) => {
    if (!locationMap[product.location]) {
      locationMap[product.location] = {
        name: product.location,
        value: 0,
        items: 0,
      };
    }

    locationMap[product.location].value += product.quantity;
    locationMap[product.location].items += 1;
  });

  return Object.values(locationMap);
};

function InventoryMonitor({ events }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryData, setInventoryData] = useState(generateSampleData());
  const [filteredData, setFilteredData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  // Process inventory events
  useEffect(() => {
    if (events && events.length > 0) {
      // Update the last event
      setLastEvent(events[0]);

      // Integrate new event data with existing inventory
      const event = events[0];
      if (event.data && event.data.product_id) {
        setInventoryData((prevData) => {
          const updatedData = [...prevData];
          const productIndex = updatedData.findIndex(
            (p) => p.id === event.data.product_id
          );

          if (productIndex >= 0) {
            // Update existing product
            updatedData[productIndex] = {
              ...updatedData[productIndex],
              quantity:
                event.data.quantity || updatedData[productIndex].quantity,
              status:
                event.data.status ||
                (event.data.quantity < updatedData[productIndex].threshold
                  ? "low_stock"
                  : "normal"),
              lastUpdated: event.timestamp,
            };
          } else if (event.data.quantity) {
            // Add new product
            const categories = [
              "Electronics",
              "Clothing",
              "Home Goods",
              "Groceries",
              "Toys",
            ];
            const locations = [
              "Store 1",
              "Store 2",
              "Warehouse A",
              "Warehouse B",
            ];

            updatedData.push({
              id: event.data.product_id,
              name: `Product ${event.data.product_id.split("-")[1]}`,
              category:
                categories[Math.floor(Math.random() * categories.length)],
              location:
                event.data.location_id ||
                locations[Math.floor(Math.random() * locations.length)],
              quantity: event.data.quantity,
              threshold: Math.floor(Math.random() * 20) + 10,
              status: event.data.status || "normal",
              lastUpdated: event.timestamp,
            });
          }

          return updatedData;
        });
      }
    }
  }, [events]);

  // Update filtered data when search term or inventory data changes
  useEffect(() => {
    const filtered = inventoryData.filter(
      (product) =>
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredData(filtered);

    // Update chart data
    setCategoryData(generateCategoryData(filtered));
    setLocationData(generateLocationData(filtered));

    // Count low stock items
    setLowStockCount(filtered.filter((p) => p.status === "low_stock").length);
  }, [searchTerm, inventoryData]);

  // Format timestamp to a readable format
  const formatTime = (isoString) => {
    if (!isoString) return "Unknown";

    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inventory Monitor
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Real-time monitoring and analysis of inventory across all locations
      </Typography>

      {/* Alert for low stock items */}
      {lowStockCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningIcon fontSize="inherit" />}
          sx={{ mb: 3 }}
        >
          <AlertTitle>Low Stock Warning</AlertTitle>
          {lowStockCount} {lowStockCount === 1 ? "product is" : "products are"}{" "}
          below minimum inventory thresholds.
        </Alert>
      )}

      {/* Last event notification */}
      {lastEvent && (
        <Paper
          elevation={2}
          sx={{ p: 2, mb: 3, bgcolor: "primary.dark", color: "white" }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Latest Inventory Update
          </Typography>
          <Typography variant="body2">
            Product: {lastEvent.data?.product_id || "Unknown"}
            {lastEvent.data?.location_id && ` @ ${lastEvent.data.location_id}`}
            {lastEvent.data?.quantity &&
              ` - Quantity: ${lastEvent.data.quantity}`}
            {lastEvent.timestamp && ` at ${formatTime(lastEvent.timestamp)}`}
          </Typography>
        </Paper>
      )}

      {/* Search and filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by product ID, name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Reset search">
                  <IconButton onClick={() => setSearchTerm("")} edge="end">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Inventory by Category
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="total" fill="#3f51b5" name="Total Products" />
                <Bar dataKey="lowStock" fill="#f44336" name="Low Stock" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Inventory by Location
            </Typography>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={locationData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="value" fill="#4caf50" name="Total Quantity" />
                <Bar dataKey="items" fill="#ff9800" name="Unique Items" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Inventory Table */}
      <Paper elevation={2}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="inventory table">
            <TableHead>
              <TableRow>
                <TableCell>Product ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Status</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((product) => (
                <TableRow
                  key={product.id}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    bgcolor:
                      product.status === "low_stock"
                        ? "rgba(244, 67, 54, 0.08)"
                        : "inherit",
                  }}
                >
                  <TableCell component="th" scope="row">
                    {product.id}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.location}</TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      {product.quantity}
                      {product.status === "low_stock" && (
                        <WarningIcon
                          fontSize="small"
                          color="error"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={
                        product.status === "low_stock" ? "Low Stock" : "Normal"
                      }
                      color={
                        product.status === "low_stock" ? "error" : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatTime(product.lastUpdated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default InventoryMonitor;
