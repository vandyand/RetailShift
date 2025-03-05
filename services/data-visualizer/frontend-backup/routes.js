import React from "react";
import { Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SystemTopology from "./pages/SystemTopology";
import InventoryMonitor from "./pages/InventoryMonitor";
import TransactionStream from "./pages/TransactionStream";
import CustomerInsights from "./pages/CustomerInsights";

import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  PointOfSale as PointOfSaleIcon,
  People as PeopleIcon,
  AccountTree as AccountTreeIcon,
} from "@mui/icons-material";

// Define routes accessible from the sidebar navigation
const routes = [
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    icon: <DashboardIcon />,
    name: "Dashboard",
  },
  {
    path: "/system-topology",
    element: <SystemTopology />,
    icon: <AccountTreeIcon />,
    name: "System Topology",
  },
  {
    path: "/inventory",
    element: <InventoryMonitor />,
    icon: <InventoryIcon />,
    name: "Inventory Monitor",
  },
  {
    path: "/transactions",
    element: <TransactionStream />,
    icon: <PointOfSaleIcon />,
    name: "Transaction Stream",
  },
  {
    path: "/customers",
    element: <CustomerInsights />,
    icon: <PeopleIcon />,
    name: "Customer Insights",
  },
];

export default routes;
