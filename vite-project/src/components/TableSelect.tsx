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
                    }`}
                    onClick={() => handleSelect(option.id)}
                  >
                    {columns.map((col) => (
                      <td key={col}>{option[col.toLowerCase()] || "-"}</td>
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
