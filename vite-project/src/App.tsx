import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashbaord";
import SearchParts from "./SearchParts";
import CartPage from "./carts";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/parts" element={<SearchParts />} />
        <Route path="/carts" element={<CartPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;