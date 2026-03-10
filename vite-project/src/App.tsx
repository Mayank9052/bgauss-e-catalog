import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashbaord";
import SearchParts from "./SearchParts";
import CheckoutPage from "./checkout";
import AdminUsers from "./admin";
import OrderDetails from "./order_details";
import VehiclePreview from "./V_preview";
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
        <Route
          path="/"
          element={<Login />}
        />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/V_Priview"
          element={
          <ProtectedRoute allowedRoles={["Admin", "User"]}>
        <VehiclePreview />
      </ProtectedRoute>
      }
      />
        <Route
          path="/parts"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <SearchParts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order_details"
          element={
            <ProtectedRoute allowedRoles={["Admin", "User"]}>
              <OrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
