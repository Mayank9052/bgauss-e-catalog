import { useState, useRef, useEffect } from "react";
import "../styles/tableselect.css";

interface TableSelectProps {
  label: string;
  columns: string[];
  options: Array<{ id: number | string; [key: string]: any }>;
  value: string | number;
  onChange: (id: string | number) => void;
  displayColumn: string;
  disabled?: boolean;
  columnKeys?: string[]; // Mapping for column display names to object keys
}

const TableSelect = ({
  label,
  columns,
  options,
  value,
  onChange,
  displayColumn,
  disabled = false,
  columnKeys,
}: TableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a mapping of column display names to object keys
  const columnMapping = columnKeys || columns.map((col) => {
    // Convert "Model Name" -> "modelName"
    return col
      .split(" ")
      .map((word, idx) => 
        idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join("");
  });

  const selectedOption = options.find((opt) => String(opt.id) === String(value));
  const displayValue = selectedOption ? selectedOption[displayColumn] : "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string | number) => {
    onChange(id);
    setIsOpen(false);
  };

  const selectedObj = options.find((opt) => String(opt.id) === String(value));

  return (
    <div className="table-select-wrapper" ref={containerRef}>
      <div
        className="table-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="table-select-label">{label}</span>
        <span className="table-select-value">
          {displayValue || "Select..."}
        </span>
        <span className={`table-select-arrow ${isOpen ? "open" : ""}`}>
          ▼
        </span>
      </div>

      {selectedObj && displayValue && (
        <div className="table-select-details">
          <div className="detail-row">
            <span className="detail-label">Selected:</span>
            <span className="detail-value">{displayValue}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">ID:</span>
            <span className="detail-value">{selectedObj.id}</span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="table-select-dropdown">
          <table className="table-select-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="no-data">
                    No options available
                  </td>
                </tr>
              ) : (
                options.map((option) => (
                  <tr
                    key={option.id}
                    className={`table-select-row ${
                      String(option.id) === String(value) ? "selected" : ""
                    } ${String(hoveredId) === String(option.id) ? "hovered" : ""}`}
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHoveredId(option.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {columnMapping.map((key, idx) => (
                      <td key={idx}>
                        {option[key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TableSelect;
