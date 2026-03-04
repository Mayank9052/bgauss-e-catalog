import { useState } from "react";
import { useNavigate } from "react-router-dom";

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!query.trim()) return;

    navigate(`/parts?q=${encodeURIComponent(query)}`);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="global-search">
      <input
        type="text"
        placeholder="Search Parts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSearch}>🔍</button>
    </div>
  );
};

export default GlobalSearch;