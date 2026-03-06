import { useState, useEffect } from "react";
import type { Part } from "../services/api";

interface Props {
  parts: Part[];
  setFilteredParts: (parts: Part[]) => void;
}

const GlobalSearch = ({ parts, setFilteredParts }: Props) => {

  const [query, setQuery] = useState("");

  useEffect(() => {

    if (!query.trim()) {
      setFilteredParts(parts);
      return;
    }

    const q = query.toLowerCase();

    const filtered = parts.filter(p =>
      p.partName?.toLowerCase().includes(q) ||
      p.partNumber?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );

    setFilteredParts(filtered);

  }, [query, parts, setFilteredParts]);

  return (

    <div className="global-search" style={{ display: "flex", gap: "6px" }}>

      <input
        type="text"
        placeholder="Search parts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

    </div>

  );

};

export default GlobalSearch;