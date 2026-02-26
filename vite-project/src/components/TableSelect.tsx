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
}

const TableSelect = ({
  label,
  columns,
  options,
  value,
  onChange,
  displayColumn,
  disabled = false,
}: TableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);
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

  const selectedObj = options.find((opt) => opt.id === value);

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
                      option.id === value ? "selected" : ""
                    } ${hoveredId === option.id ? "hovered" : ""}`}
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHoveredId(option.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {columns.map((col) => {
                      const colKey = Object.keys(option).find(
                        (key) => key.toLowerCase() === col.toLowerCase()
                      );
                      return (
                        <td key={col}>
                          {colKey ? option[colKey as keyof typeof option] : "-"}
                        </td>
                      );
                    })}
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
