// useTableState.ts — reusable search + sort + multi-select filter + pagination
// Used by every Admin Modules table so behaviour is identical across tabs.
import { useCallback, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export type CellValue = string | number | boolean | null | undefined;
export type ColumnType = "text" | "number" | "date" | "boolean";

export interface ColumnDef<T> {
  /** Unique key used for sort / filter state */
  key: string;
  label: string;
  /** Raw value used for sorting and searching */
  value: (row: T) => CellValue;
  /** Optional display text used for the filter checklist (defaults to String(value)) */
  filterText?: (row: T) => string;
  type?: ColumnType;
  sortable?: boolean;      // default true
  filterable?: boolean;    // default false
  searchable?: boolean;    // default true
}

export interface SortState { key: string; dir: SortDir }

export const BLANK_LABEL = "(Blank)";

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const toFilterText = <T,>(col: ColumnDef<T>, row: T): string => {
  if (col.filterText) {
    const t = col.filterText(row);
    return t && t.trim() ? t.trim() : BLANK_LABEL;
  }
  const v = col.value(row);
  if (v === null || v === undefined || v === "") return BLANK_LABEL;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).trim() || BLANK_LABEL;
};

const compareValues = (a: CellValue, b: CellValue, type: ColumnType = "text"): number => {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;          // blanks always last
  if (bEmpty) return -1;

  switch (type) {
    case "number": {
      const na = typeof a === "number" ? a : parseFloat(String(a));
      const nb = typeof b === "number" ? b : parseFloat(String(b));
      if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
      if (Number.isNaN(na)) return 1;
      if (Number.isNaN(nb)) return -1;
      return na - nb;
    }
    case "date":
      return new Date(String(a)).getTime() - new Date(String(b)).getTime();
    case "boolean":
      return Number(Boolean(a)) - Number(Boolean(b));
    default:
      return naturalCollator.compare(String(a), String(b));
  }
};

export interface TableState<T> {
  search: string;
  setSearch: (v: string) => void;
  sort: SortState | null;
  toggleSort: (key: string) => void;
  filters: Record<string, Set<string>>;
  setFilter: (key: string, values: Set<string> | null) => void;
  clearFilters: () => void;
  resetAll: () => void;
  /** Distinct filter values for a column, faceted by search + the OTHER active filters */
  uniqueValues: (key: string) => { value: string; count: number }[];
  activeFilterCount: number;
  rows: T[];               // after search + filters + sort
  pageRows: T[];           // current page slice
  total: number;           // unfiltered count
  page: number;
  setPage: (p: number) => void;
  pageCount: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  columns: ColumnDef<T>[];
}

export function useTableState<T>(
  data: T[],
  columns: ColumnDef<T>[],
  options: { pageSize?: number; initialSort?: SortState | null } = {},
): TableState<T> {
  const [search, setSearchRaw]    = useState("");
  const [sort, setSort]           = useState<SortState | null>(options.initialSort ?? null);
  const [filters, setFilters]     = useState<Record<string, Set<string>>>({});
  const [page, setPageRaw]        = useState(1);
  const [pageSize, setPageSizeRaw] = useState(options.pageSize ?? 25);

  const colMap = useMemo(() => {
    const m: Record<string, ColumnDef<T>> = {};
    columns.forEach(c => { m[c.key] = c; });
    return m;
  }, [columns]);

  const setSearch = useCallback((v: string) => { setSearchRaw(v); setPageRaw(1); }, []);
  const setPageSize = useCallback((n: number) => { setPageSizeRaw(n); setPageRaw(1); }, []);

  const toggleSort = useCallback((key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears sorting
    });
  }, []);

  const setFilter = useCallback((key: string, values: Set<string> | null) => {
    setFilters(prev => {
      const next = { ...prev };
      if (values === null) delete next[key];
      else next[key] = new Set(values);
      return next;
    });
    setPageRaw(1);
  }, []);

  const clearFilters = useCallback(() => { setFilters({}); setPageRaw(1); }, []);
  const resetAll = useCallback(() => {
    setFilters({}); setSearchRaw(""); setSort(options.initialSort ?? null); setPageRaw(1);
  }, [options.initialSort]);

  // ── search predicate (multi-word, every word must match some searchable column)
  const searchWords = useMemo(
    () => search.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [search],
  );

  const matchesSearch = useCallback((row: T) => {
    if (searchWords.length === 0) return true;
    const hay = columns
      .filter(c => c.searchable !== false)
      .map(c => {
        const v = c.filterText ? c.filterText(row) : c.value(row);
        return v === null || v === undefined ? "" : String(v).toLowerCase();
      })
      .join(" \u0001 ");
    return searchWords.every(w => hay.includes(w));
  }, [columns, searchWords]);

  const matchesFilters = useCallback((row: T, skipKey?: string) => {
    for (const [key, set] of Object.entries(filters)) {
      if (key === skipKey) continue;
      const col = colMap[key];
      if (!col) continue;
      if (!set.has(toFilterText(col, row))) return false;
    }
    return true;
  }, [filters, colMap]);

  const searched = useMemo(() => data.filter(matchesSearch), [data, matchesSearch]);

  const rows = useMemo(() => {
    const out = searched.filter(r => matchesFilters(r));
    if (sort) {
      const col = colMap[sort.key];
      if (col) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out.sort((a, b) => {
          const va = col.value(a), vb = col.value(b);
          const aEmpty = va === null || va === undefined || va === "";
          const bEmpty = vb === null || vb === undefined || vb === "";
          if (aEmpty !== bEmpty) return aEmpty ? 1 : -1; // blanks last in both directions
          return compareValues(va, vb, col.type) * dir;
        });
      }
    }
    return out;
  }, [searched, matchesFilters, sort, colMap]);

  const uniqueValues = useCallback((key: string) => {
    const col = colMap[key];
    if (!col) return [];
    const counts = new Map<string, number>();
    searched.forEach(r => {
      if (!matchesFilters(r, key)) return;
      const t = toFilterText(col, r);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    // keep currently-selected values visible even if they now have 0 matches
    filters[key]?.forEach(v => { if (!counts.has(v)) counts.set(v, 0); });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        if (a.value === BLANK_LABEL) return 1;
        if (b.value === BLANK_LABEL) return -1;
        return col.type === "number"
          ? compareValues(a.value, b.value, "number")
          : naturalCollator.compare(a.value, b.value);
      });
  }, [colMap, searched, matchesFilters, filters]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const pageRows  = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  const setPage = useCallback((p: number) => setPageRaw(Math.max(1, p)), []);

  return {
    search, setSearch, sort, toggleSort,
    filters, setFilter, clearFilters, resetAll, uniqueValues,
    activeFilterCount: Object.keys(filters).length,
    rows, pageRows, total: data.length,
    page: safePage, setPage, pageCount, pageSize, setPageSize,
    columns,
  };
}
