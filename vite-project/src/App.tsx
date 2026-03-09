import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashbaord";
import SearchParts from "./SearchParts";
import CheckoutPage from "./checkout";
import AdminUsers from "./admin";
import OrderDetails from "./order_details";

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/parts" element={<SearchParts />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/order_details" element={<OrderDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
