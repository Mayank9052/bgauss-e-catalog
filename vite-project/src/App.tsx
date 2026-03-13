import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashbaord";
import SearchParts from "./SearchParts";
import CheckoutPage from "./checkout";
import AdminUsers from "./admin";
import OrderDetails from "./order_details";
import VehiclePreview from "./V_preview";
import AssemblyCatalogue from "./assembly_catalogue";
import AdminModules from "./AdminModules";
import { ProtectedRoute } from "./components/RouteGuard";

function ScrollToTop() {

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {

  return (

    <BrowserRouter>

      <ScrollToTop />

      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/login" element={<Login />} />

        {/* Dashboard */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Vehicle Preview */}

        <Route
          path="/V_Priview"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <VehiclePreview />
            </ProtectedRoute>
          }
        />

        {/* Search Parts */}

        <Route
          path="/parts"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <SearchParts />
            </ProtectedRoute>
          }
        />

        {/* Assembly Catalogue */}

        <Route
          path="/assembly_catalogue"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <AssemblyCatalogue />
            </ProtectedRoute>
          }
        />

        {/* Checkout */}

        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* Order Details */}

        <Route
          path="/order_details"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* Admin Users */}

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        {/* Admin Modules (NEW ROUTE) */}

        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminModules />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

    </BrowserRouter>

  );
}

export default App;