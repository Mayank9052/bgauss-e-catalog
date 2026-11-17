// DataTable.tsx — shared UI pieces for Admin tables:
//   <HeaderCell>       sortable header + checkbox filter dropdown
//   <TableToolbar>     search with clear, record count, status quick-filter, reset
//   <Pagination>       page navigation + page-size selector
//   <StatusToggle>     Active / Inactive switch
//   <EmptyRow>         friendly empty state
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  FaSort, FaSortUp, FaSortDown, FaFilter, FaSearch, FaTimes, FaUndo,
  FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import type { TableState } from "./useTableState";
import "./dataTable.css";

/* ───────────────────────── Header cell ───────────────────────── */
export function HeaderCell<T>({
  table, colKey, children, align, width,
}: {
  table: TableState<T>;
  colKey: string;
  children?: ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
}) {
  const col = table.columns.find(c => c.key === colKey);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  if (!col) return <th>{children}</th>;

  const sortable   = col.sortable !== false;
  const filterable = !!col.filterable;
  const sortDir    = table.sort?.key === colKey ? table.sort.dir : null;
  const filterOn   = !!table.filters[colKey];

  return (
    <th
      style={{ textAlign: align, width }}
      aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none"}
      className={`dt-th${sortDir ? " dt-th--sorted" : ""}${filterOn ? " dt-th--filtered" : ""}`}
    >
      <div className="dt-th__inner" style={{ justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
        {sortable ? (
          <button type="button" className="dt-th__sort" onClick={() => table.toggleSort(colKey)}
            title={sortDir === "asc" ? "Sorted ascending — click for descending" : sortDir === "desc" ? "Sorted descending — click to clear" : "Click to sort ascending"}>
            <span>{children ?? col.label}</span>
            <span className="dt-th__sort-icon">
              {sortDir === "asc" ? <FaSortUp /> : sortDir === "desc" ? <FaSortDown /> : <FaSort />}
            </span>
          </button>
        ) : (
          <span className="dt-th__label">{children ?? col.label}</span>
        )}
        {filterable && (
          <button
            ref={btnRef}
            type="button"
            className={`dt-th__filter${filterOn ? " dt-th__filter--on" : ""}`}
            onClick={() => setOpen(o => !o)}
            title={filterOn ? `Filtered (${table.filters[colKey].size} selected)` : `Filter by ${col.label}`}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <FaFilter />
          </button>
        )}
      </div>
      {open && filterable && (
        <FilterDropdown table={table} colKey={colKey} label={col.label}
          anchor={btnRef.current} onClose={() => setOpen(false)} />
      )}
    </th>
  );
}

/* ───────────────────────── Filter dropdown ───────────────────────── */
const MAX_VISIBLE_VALUES = 400;

function FilterDropdown<T>({
  table, colKey, label, anchor, onClose,
}: {
  table: TableState<T>;
  colKey: string;
  label: string;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const values  = useMemo(() => table.uniqueValues(colKey), [table, colKey]);
  const current = table.filters[colKey];               // undefined = all selected
  const isChecked = (v: string) => !current || current.has(v);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? values.filter(v => v.value.toLowerCase().includes(q)) : values;
  }, [values, query]);

  // position under the filter icon, kept inside the viewport
  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = 260;
      const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      setPos({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  // close on outside click / Esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const allValues = values.map(v => v.value);

  const toggle = (v: string) => {
    const base = current ? new Set(current) : new Set(allValues);
    if (base.has(v)) base.delete(v); else base.add(v);
    // everything ticked again → remove the filter entirely
    table.setFilter(colKey, base.size === allValues.length && allValues.every(x => base.has(x)) ? null : base);
  };

  const selectAll = () => {
    if (query.trim()) {
      const base = current ? new Set(current) : new Set(allValues);
      shown.forEach(v => base.add(v.value));
      table.setFilter(colKey, base.size >= allValues.length ? null : base);
    } else {
      table.setFilter(colKey, null);
    }
  };

  const clearAll = () => {
    if (query.trim()) {
      const base = current ? new Set(current) : new Set(allValues);
      shown.forEach(v => base.delete(v.value));
      table.setFilter(colKey, base);
    } else {
      table.setFilter(colKey, new Set());
    }
  };

  const selectedCount = current ? current.size : allValues.length;

  return createPortal(
    <div ref={boxRef} className="dt-filter" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={`Filter ${label}`}>
      <div className="dt-filter__head">
        <span className="dt-filter__title">Filter: {label}</span>
        <button type="button" className="dt-filter__x" onClick={onClose} aria-label="Close"><FaTimes /></button>
      </div>
      <div className="dt-filter__search">
        <FaSearch />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search values…" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear"><FaTimes /></button>}
      </div>
      <div className="dt-filter__bulk">
        <button type="button" onClick={selectAll}>Select All</button>
        <button type="button" onClick={clearAll}>Clear All</button>
        <span className="dt-filter__count">{selectedCount}/{allValues.length}</span>
      </div>
      <div className="dt-filter__list">
        {shown.length === 0 && <div className="dt-filter__empty">No matching values</div>}
        {shown.slice(0, MAX_VISIBLE_VALUES).map(v => (
          <label key={v.value} className={`dt-filter__item${v.count === 0 ? " dt-filter__item--zero" : ""}`}>
            <input type="checkbox" checked={isChecked(v.value)} onChange={() => toggle(v.value)} />
            <span className="dt-filter__val" title={v.value}>{v.value}</span>
            <span className="dt-filter__n">{v.count}</span>
          </label>
        ))}
        {shown.length > MAX_VISIBLE_VALUES && (
          <div className="dt-filter__more">
            Showing first {MAX_VISIBLE_VALUES} of {shown.length}. Type above to narrow the list.
          </div>
        )}
      </div>
      <div className="dt-filter__foot">
        <button type="button" className="dt-filter__reset" disabled={!current}
          onClick={() => table.setFilter(colKey, null)}>
          <FaUndo /> Reset
        </button>
        <button type="button" className="dt-filter__done" onClick={onClose}>Done</button>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────── Toolbar ───────────────────────── */
export type StatusFilterValue = "all" | "Active" | "Inactive";

export function TableToolbar<T>({
  table, placeholder, statusKey, children,
}: {
  table: TableState<T>;
  placeholder: string;
  /** column key holding "Active" / "Inactive" — enables the quick status switch */
  statusKey?: string;
  children?: ReactNode;
}) {
  const statusSet = statusKey ? table.filters[statusKey] : undefined;
  const statusValue: StatusFilterValue =
    !statusSet ? "all" :
    statusSet.size === 1 && statusSet.has("Active") ? "Active" :
    statusSet.size === 1 && statusSet.has("Inactive") ? "Inactive" : "all";

  const setStatus = (v: StatusFilterValue) => {
    if (!statusKey) return;
    table.setFilter(statusKey, v === "all" ? null : new Set([v]));
  };

  const chips = Object.entries(table.filters);
  const hasAnything = chips.length > 0 || table.search.trim().length > 0 || !!table.sort;

  return (
    <div className="dt-toolbar">
      <div className="dt-toolbar__row">
        <div className="dt-search">
          <FaSearch className="dt-search__icon" />
          <input
            className="dt-search__input"
            value={table.search}
            onChange={e => table.setSearch(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
          {table.search && (
            <button type="button" className="dt-search__clear" onClick={() => table.setSearch("")} title="Clear search">
              <FaTimes />
            </button>
          )}
        </div>

        {statusKey && (
          <div className="dt-seg" role="group" aria-label="Status filter">
            {(["all", "Active", "Inactive"] as StatusFilterValue[]).map(v => (
              <button key={v} type="button"
                className={`dt-seg__btn${statusValue === v ? " dt-seg__btn--on" : ""}${v !== "all" ? ` dt-seg__btn--${v.toLowerCase()}` : ""}`}
                onClick={() => setStatus(v)}>
                {v === "all" ? "All" : v}
              </button>
            ))}
          </div>
        )}

        {children}

        <span className="dt-count">
          {table.rows.length === table.total
            ? `${table.total} record${table.total !== 1 ? "s" : ""}`
            : `${table.rows.length} of ${table.total} records`}
        </span>

        <button type="button" className="dt-reset" disabled={!hasAnything} onClick={table.resetAll}
          title="Clear search, filters and sorting">
          <FaUndo /> Reset
        </button>
      </div>

      {chips.length > 0 && (
        <div className="dt-chips">
          {chips.map(([key, set]) => {
            const col = table.columns.find(c => c.key === key);
            const vals = Array.from(set);
            const text = vals.length === 0 ? "none" : vals.length <= 2 ? vals.join(", ") : `${vals.length} selected`;
            return (
              <span key={key} className="dt-chip">
                <strong>{col?.label ?? key}:</strong>&nbsp;{text}
                <button type="button" onClick={() => table.setFilter(key, null)} aria-label={`Remove ${col?.label} filter`}>
                  <FaTimes />
                </button>
              </span>
            );
          })}
          <button type="button" className="dt-chips__clear" onClick={table.clearFilters}>Clear all filters</button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Empty row ───────────────────────── */
export function EmptyRow<T>({ table, colSpan, entity }: { table: TableState<T>; colSpan: number; entity: string }) {
  if (table.rows.length > 0) return null;
  const filtered = table.total > 0;
  return (
    <tr>
      <td colSpan={colSpan} className="dt-empty">
        <div className="dt-empty__box">
          <div className="dt-empty__icon"><FaSearch /></div>
          <div className="dt-empty__title">
            {filtered ? `No ${entity} match your search or filters` : `No ${entity} yet`}
          </div>
          {filtered && (
            <button type="button" className="dt-empty__btn" onClick={table.resetAll}>
              <FaUndo /> Clear search &amp; filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ───────────────────────── Pagination ───────────────────────── */
export function Pagination<T>({ table, sizes = [25, 50, 100, 250] }: { table: TableState<T>; sizes?: number[] }) {
  if (table.rows.length === 0) return null;
  const { page, pageCount } = table;
  const from = (page - 1) * table.pageSize + 1;
  const to   = Math.min(page * table.pageSize, table.rows.length);

  const pages: (number | "…")[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || (n >= page - 2 && n <= page + 2)) {
      if (pages.length && typeof pages[pages.length - 1] === "number" && n - (pages[pages.length - 1] as number) > 1) pages.push("…");
      pages.push(n);
    }
  }

  return (
    <div className="dt-pager">
      <span className="dt-pager__info">Showing {from}–{to} of {table.rows.length}</span>
      <div className="dt-pager__nav">
        <button type="button" disabled={page <= 1} onClick={() => table.setPage(page - 1)} aria-label="Previous page"><FaChevronLeft /></button>
        {pages.map((p, i) => p === "…"
          ? <span key={`e${i}`} className="dt-pager__ellipsis">…</span>
          : <button key={p} type="button" className={p === page ? "dt-pager__on" : ""} onClick={() => table.setPage(p)}>{p}</button>)}
        <button type="button" disabled={page >= pageCount} onClick={() => table.setPage(page + 1)} aria-label="Next page"><FaChevronRight /></button>
      </div>
      <label className="dt-pager__size">
        Rows
        <select value={table.pageSize} onChange={e => table.setPageSize(+e.target.value)}>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  );
}

/* ───────────────────────── Status ───────────────────────── */
export function StatusToggle({
  active, onChange, busy = false, compact = false,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={busy}
      className={`dt-status${active ? " dt-status--on" : " dt-status--off"}${busy ? " dt-status--busy" : ""}`}
      onClick={() => onChange(!active)}
      title={active ? "Active — click to deactivate" : "Inactive — click to activate"}
    >
      <span className="dt-status__track"><span className="dt-status__knob" /></span>
      {!compact && <span className="dt-status__label">{busy ? "Saving…" : active ? "Active" : "Inactive"}</span>}
    </button>
  );
}
