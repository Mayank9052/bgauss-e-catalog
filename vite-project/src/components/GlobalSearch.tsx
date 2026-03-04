import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { commonSearch } from "../services/serachapi";

const GlobalSearch = () => {

  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("parts");

  const navigate = useNavigate();

  const handleSearch = async () => {

    if (!query.trim()) return;

    try {

      const results = await commonSearch(entity, query);

      // 🚀 CHECK RESULTS
      if (!results || results.length === 0) {
        alert("No products available ❌");
        return;
      }

      navigate("/parts", {
        state: {
          searchType: "global",
          results
        }
      });

      setQuery("");

    } catch (err) {

      console.error("Search failed", err);
      alert("Search failed ❌");

    }
  };

  // ✅ ENTER KEY SEARCH
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (

    <div className="global-search" style={{ display: "flex", gap: "6px" }}>

      <select
        value={entity}
        onChange={(e) => setEntity(e.target.value)}
      >
        <option value="parts">Parts</option>
        <option value="assemblies">Assemblies</option>
        <option value="categories">Categories</option>
        <option value="vehiclemodels">Models</option>
        <option value="vehiclevariants">Variants</option>
        <option value="vehiclecolours">Colours</option>
      </select>

      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button onClick={handleSearch}>
        🔍
      </button>

    </div>

  );
};

export default GlobalSearch;