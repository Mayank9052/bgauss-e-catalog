import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login";
import Dashboard from "./dashbaord";
import SearchParts from "./searchparts";


function App() {
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/parts" element={<SearchParts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;