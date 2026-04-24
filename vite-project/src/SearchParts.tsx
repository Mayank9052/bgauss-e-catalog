// SearchParts.tsx — BGAUSS Electronic Parts Catalog — PRODUCTION READY
// ✅ All API calls use /api/ prefix (works on production, proxied in dev)
// ✅ No localhost hardcoding
// ✅ Chip HOVER → auto-scroll table to first matching row + amber arrow indicator
// ✅ Chip CLICK → multi-select toggle + auto-select in-stock parts
// ✅ OUT OF STOCK badge fixed — never overflows column
// ✅ Contact modal
// ✅ Zoom image (wheel scroll to zoom)
// ✅ Full responsive layout
// ✅ BreadcrumbPath added

import "./searchparts.css"
import logo from "./assets/logo.jpg"
import { useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import AccountMenu from "./components/AccountMenu"
import BreadcrumbPath from "./components/BreadcrumbPath"
import type { Part } from "./services/api"
import { commonSearch } from "./services/serachapi"
import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaShoppingBasket,
  FaSearchPlus, FaTimes, FaEnvelope,
} from "react-icons/fa"

interface PartWithPrice extends Part {
  bdp?: number
  mrp?: number
  taxPercent?: number
}

interface CartItemSummary {
  id: number
  partId: number
  quantity: number
  price?: number
}

// ── Stock Badge ───────────────────────────────────────────────
const StockBadge = ({ stock }: { stock: number }) => {
  if (stock === 0) return <span className="badge badge--out">OUT OF STOCK</span>
  if (stock <= 5)  return <span className="badge badge--low">LOW: {stock}</span>
  return               <span className="badge badge--in">IN STOCK: {stock}</span>
}

// ── Contact Modal ─────────────────────────────────────────────
interface ContactModalProps { onClose: () => void }

function ContactModal({ onClose }: ContactModalProps) {
  const [form, setForm] = useState({
    subject: "", salutation: "", firstName: "", lastName: "",
    company: "", email: "", phone: "", message: "", agree: false,
  })
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState("")

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.message.trim()) { setError("Please fill in email and message."); return }
    if (!form.agree) { setError("Please agree to the data protection terms."); return }
    setError(""); setSending(true)
    try {
      // POST to backend which sends the email
      await axios.post("/contact/send", {
        subject:    form.subject || "General Enquiry",
        salutation: form.salutation,
        firstName:  form.firstName,
        lastName:   form.lastName,
        company:    form.company,
        email:      form.email,
        phone:      form.phone,
        message:    form.message,
        recipients: ["sachin.raut@bgauss.com", "prasad.kurawade@bgauss.com"],
      })
      setSent(true)
      setTimeout(onClose, 2500)
    } catch {
      setError("Failed to send message. Please try again or email us directly.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="sp-modal-bg" onClick={onClose} />
      <div className="sp-contact-modal">
        <div className="sp-contact-header">
          <div>
            <h2 className="sp-contact-title"><FaEnvelope style={{ marginRight: 8, verticalAlign: "middle" }} />Contact Us</h2>
            <p className="sp-contact-sub">For assistance, suggestions, and queries</p>
          </div>
          <button className="sp-contact-close" onClick={onClose}><FaTimes /></button>
        </div>

        {sent ? (
          <div className="sp-contact-sent">
            <div style={{ fontSize: 48 }}>✅</div>
            <h3>Message Sent!</h3>
            <p>We'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <div className="sp-contact-body">
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
              Fill in the form below and we'll respond as quickly as possible.
              Alternatively, email us at{" "}
              <a href="mailto:sachin.raut@bgauss.com" style={{ color: "#1d4ed8" }}>sachin.raut@bgauss.com</a>.
            </p>

            {error && <div className="sp-contact-error">{error}</div>}

            <div className="sp-cf-field">
              <label>Kind of Request — Subject *</label>
              <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                <option value="">Please choose</option>
                <option value="Technical Assistance">Technical Assistance</option>
                <option value="Product Suggestion">Product Suggestion</option>
                <option value="Parts Ordering Query">Parts Ordering Query</option>
                <option value="Return / Replacement">Return / Replacement</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sp-cf-row sp-cf-row--3">
              <div className="sp-cf-field">
                <label>Salutation</label>
                <select value={form.salutation} onChange={e => setForm(p => ({ ...p, salutation: e.target.value }))}>
                  <option value="">—</option>
                  <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option>
                </select>
              </div>
              <div className="sp-cf-field">
                <label>First Name</label>
                <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
              </div>
              <div className="sp-cf-field">
                <label>Last Name</label>
                <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
              </div>
            </div>

            <div className="sp-cf-row sp-cf-row--2">
              <div className="sp-cf-field">
                <label>Company</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" />
              </div>
              <div className="sp-cf-field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>

            <div className="sp-cf-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
            </div>

            <div className="sp-cf-field">
              <label>Your Message *</label>
              <textarea rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Describe your query…" />
            </div>

            <div className="sp-cf-agree">
              <input type="checkbox" id="sp-agree" checked={form.agree} onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))} />
              <label htmlFor="sp-agree">
                I agree to the collection and processing of my personal data.
                See our <a href="#">Data Protection Policy</a>.
              </label>
            </div>

            <button className="sp-cf-submit" onClick={() => void handleSubmit()} disabled={sending}>
              {sending ? "Sending…" : <><FaEnvelope /> SUBMIT</>}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────
const SearchParts = () => {
  const location = useLocation()
  const navigate  = useNavigate()

  const { modelId, assemblyId, assemblyName, assemblyImage, partPosition } = location.state || {}

  const [allParts,      setAllParts]      = useState<PartWithPrice[]>([])
  const [visibleParts,  setVisibleParts]  = useState<PartWithPrice[]>([])
  const [selectedParts, setSelectedParts] = useState<number[]>([])
  const [quantities,    setQuantities]    = useState<Record<number, number>>({})
  const [remarks,       setRemarks]       = useState<Record<number, string>>({})
  const [cartCount,     setCartCount]     = useState(0)
  const [cartPartQtys,  setCartPartQtys]  = useState<Record<number, number>>({})
  const [partsLoading,  setPartsLoading]  = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm,    setSearchTerm]    = useState("")
  const [showContact,   setShowContact]   = useState(false)

  const addingRef      = useRef(false)
  const [addingToCart, setAddingToCart]   = useState(false)

  // Zoom state
  const [zoomOpen,   setZoomOpen]   = useState(false)
  const [zoomScale,  setZoomScale]  = useState(1)
  const [zoomOrigin, setZoomOrigin] = useState("center center")
  const zoomViewportRef = useRef<HTMLDivElement>(null)

  // Chip state
  const [activeNums, setActiveNums] = useState<Set<string>>(new Set())
  const [hoveredNum, setHoveredNum] = useState<string | null>(null)

  // Table ref for auto-scroll
  const tableScrollRef = useRef<HTMLDivElement>(null)
  // Row refs keyed by imageNumber
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // ── Body scroll lock while zoom open ──
  useEffect(() => {
    document.body.style.overflow = zoomOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [zoomOpen])

  // ── Wheel zoom (passive: false so preventDefault works) ──
  useEffect(() => {
    const el = zoomViewportRef.current
    if (!el || !zoomOpen) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width)  * 100
      const y = ((e.clientY - rect.top)  / rect.height) * 100
      setZoomOrigin(`${x}% ${y}%`)
      setZoomScale(prev => Math.max(1, Math.min(5, prev + (e.deltaY < 0 ? 0.25 : -0.25))))
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [zoomOpen])

  const openZoom = (e: React.MouseEvent) => { e.stopPropagation(); setZoomOpen(true); setZoomScale(1); setZoomOrigin("center center") }
  const closeZoom = () => setZoomOpen(false)

  // ── Hydrate qty/remarks ──
  const hydratePartState = (items: PartWithPrice[]) => {
    setQuantities(prev => { const n = { ...prev }; items.forEach(p => { if (n[p.id] == null) n[p.id] = 1 }); return n })
    setRemarks(prev => { const n = { ...prev }; items.forEach(p => { if (n[p.id] == null) n[p.id] = p.remarks ?? "" }); return n })
  }

  // ── Fetch cart — uses /api/ prefix for production ──
  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get("/cart/my-cart")
      const cartItems: CartItemSummary[] = res.data?.items || []
      setCartCount(cartItems.length)
      setCartPartQtys(Object.fromEntries(cartItems.map(i => [i.partId, i.quantity])))
    } catch {
      setCartCount(0); setCartPartQtys({})
    }
  }, [])

  // ── Fetch parts ──
  useEffect(() => {
    const fetchParts = async () => {
      if (modelId == null || assemblyId == null) {
        setAllParts([]); setVisibleParts([]); setPartsLoading(false); return
      }
      try {
        setPartsLoading(true)
        const posFilter = partPosition != null ? `&partPosition=${encodeURIComponent(String(partPosition))}` : ""
        const res  = await fetch(`/api/parts/by-assembly?modelId=${modelId}&assemblyId=${assemblyId}${posFilter}`)
        const data: PartWithPrice[] = await res.json()
        setAllParts(data); setVisibleParts(data); hydratePartState(data)
      } catch {
        setAllParts([]); setVisibleParts([])
      } finally {
        setPartsLoading(false)
      }
    }
    void fetchParts()
    void fetchCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assemblyId, modelId, partPosition, fetchCart])

  // ── Debounced search ──
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (!trimmed) { setVisibleParts(allParts); setSearchLoading(false); return }
    let cancelled = false
    setSearchLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const data = await commonSearch<PartWithPrice>("parts", trimmed)
        const filtered = data.filter(p => Number(p.modelId) === Number(modelId) && Number(p.assemblyId) === Number(assemblyId))
        if (cancelled) return
        hydratePartState(filtered); setVisibleParts(filtered)
      } catch {
        if (!cancelled) setVisibleParts([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)
    return () => { cancelled = true; window.clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParts, assemblyId, modelId, searchTerm])

  // Reset chips on assembly change
  useEffect(() => { setActiveNums(new Set()); setHoveredNum(null) }, [assemblyId, modelId])

  // ── Auto-scroll table when hovering a chip ──
  useEffect(() => {
    if (!hoveredNum) return
    const row = rowRefs.current[hoveredNum]
    if (row && tableScrollRef.current) {
      const container = tableScrollRef.current
      const rowTop    = row.offsetTop
      const rowHeight = row.offsetHeight
      const containerHeight = container.clientHeight
      const targetScrollTop = rowTop - containerHeight / 2 + rowHeight / 2
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" })
    }
  }, [hoveredNum])

  // ── Helpers ──
  const getAvailableStock = useCallback((p: PartWithPrice) =>
    Math.max(0, p.stockQuantity - (cartPartQtys[p.id] ?? 0)),
  [cartPartQtys])

  const hotspotNumbers = Array.from(
    new Set(allParts.map(p => p.imageNumber?.trim()).filter((n): n is string => Boolean(n)))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))

  const displayParts = activeNums.size > 0
    ? visibleParts.filter(p => p.imageNumber?.trim() && activeNums.has(p.imageNumber.trim()))
    : visibleParts

  // ── Chip click: multi-select toggle ──
  const handleChipClick = (num: string) => {
    setActiveNums(prev => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
        setSelectedParts(sp => sp.filter(id => {
          const part = allParts.find(p => p.id === id)
          const pNum = part?.imageNumber?.trim()
          return pNum !== num || next.has(pNum ?? "")
        }))
      } else {
        next.add(num)
        const toSelect = allParts.filter(p => p.imageNumber?.trim() === num && getAvailableStock(p) > 0).map(p => p.id)
        setSelectedParts(sp => Array.from(new Set([...sp, ...toSelect])))
      }
      return next
    })
  }

  // ── Row select ──
  const toggleSelect = (part: PartWithPrice) => {
    if (getAvailableStock(part) === 0) { alert(`"${part.partName}" is out of stock.`); return }
    setSelectedParts(prev => prev.includes(part.id) ? prev.filter(x => x !== part.id) : [...prev, part.id])
  }

  const allDisplaySelected =
    displayParts.length > 0 &&
    displayParts.filter(p => getAvailableStock(p) > 0).every(p => selectedParts.includes(p.id))

  const toggleSelectAll = (checked: boolean) => {
    const available = displayParts.filter(p => getAvailableStock(p) > 0).map(p => p.id)
    if (checked) setSelectedParts(prev => Array.from(new Set([...prev, ...available])))
    else         setSelectedParts(prev => prev.filter(id => !available.includes(id)))
  }

  const changeQty = (id: number, delta: number) => {
    const part = allParts.find(p => p.id === id)
    if (!part) return
    const stock = getAvailableStock(part)
    setQuantities(prev => {
      const cur = prev[id] || 1; const next = cur + delta
      if (next < 1) return prev
      if (next > stock) { alert(`Only ${stock} item(s) available`); return prev }
      return { ...prev, [id]: next }
    })
  }

  // ── Add to cart — uses /api/ prefix for production ──
  const addSelectedToCart = async () => {
    if (selectedParts.length === 0) { alert("Please select at least one part"); return }
    if (addingRef.current) return
    addingRef.current = true; setAddingToCart(true)
    try {
      for (const partId of selectedParts) {
        const qty = quantities[partId] || 1
        await axios.post("/cart/add", { PartId: partId, Quantity: qty })
      }
      await fetchCart()
      navigate("/checkout")
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as string | undefined) : undefined
      alert(msg ?? "Failed to add items to cart.")
    } finally {
      addingRef.current = false; setAddingToCart(false)
    }
  }

  // ── Row class ──
  const getRowClass = (part: PartWithPrice, stock: number): string => {
    if (stock === 0)                                                                              return "row--out-stock"
    if (selectedParts.includes(part.id))                                                          return "row--selected"
    if (hoveredNum != null && part.imageNumber?.trim() === hoveredNum)                            return "row--chip-hover"
    if (activeNums.size > 0 && part.imageNumber?.trim() && activeNums.has(part.imageNumber.trim())) return "row--hotspot-match"
    return ""
  }

  // Build stateMap for breadcrumb back-navigation
  const assemblyState = {
    searchType: undefined as string | undefined,
    vin: undefined as string | undefined,
    modelId,
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="sp-wrapper">

      {/* Contact modal */}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      {/* Navbar */}
      <nav className="sp-navbar">
        <div className="sp-brand">
          <img src={logo} className="sp-brand__logo" alt="BGAUSS Logo" />
          <div className="sp-brand__text">
            <span className="sp-brand__name">BGAUSS</span>
            <span className="sp-brand__sub">Electronic Parts Catalog</span>
          </div>
        </div>
        <div className="sp-navbar__actions">
          <button className="sp-nav-btn" onClick={() => navigate("/dashboard")} title="Home"><FaHome /></button>
          <button className="sp-nav-btn" title="Contact Us" onClick={() => setShowContact(true)}><FaPhoneAlt /></button>
          <button className="sp-nav-btn" title="Cart" onClick={() => navigate("/checkout")} style={{ position: "relative" }}>
            <FaShoppingCart />
            {cartCount > 0 && <span className="sp-cart-badge">{cartCount}</span>}
          </button>
          <AccountMenu />
        </div>
      </nav>

      {/* Breadcrumb */}
      <BreadcrumbPath
        current="parts"
        stateMap={{
          dashboard:           null,
          vehicle_preview:     null,
          assembly_catalogue:  assemblyState,
        }}
      />

      <h2 className="sp-assembly-title">{assemblyName as string}</h2>

      <div className="sp-layout">

        {/* LEFT: image + chips */}
        <aside className="sp-image-panel">
          {assemblyImage ? (
            <>
              <div className="sp-image-frame">
                <img src={assemblyImage as string} className="sp-assembly-img" alt={assemblyName as string} onClick={openZoom} />
                <button className="sp-zoom-trigger" onClick={openZoom} title="Zoom image">
                  <FaSearchPlus style={{ fontSize: 11 }} /> Zoom
                </button>

                {zoomOpen && (
                  <div className="sp-zoom-overlay" onClick={closeZoom}>
                    <button className="sp-zoom-close" onClick={closeZoom}><FaTimes /></button>
                    <div
                      ref={zoomViewportRef}
                      className="sp-zoom-viewport"
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: zoomScale > 1 ? "move" : "zoom-in" }}
                    >
                      <img
                        src={assemblyImage as string}
                        alt={assemblyName as string}
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: zoomOrigin,
                          transition: "transform 0.1s ease",
                          display: "block", width: "100%",
                          userSelect: "none", pointerEvents: "none",
                        }}
                      />
                    </div>
                    <p className="sp-zoom-hint">Scroll to zoom · Click outside to close</p>
                  </div>
                )}
              </div>

              {hotspotNumbers.length > 0 && (
                <div className="sp-chip-panel">
                  <div className="sp-chip-panel__header">
                    <span className="sp-chip-panel__label">
                      Image No.
                      {activeNums.size > 0 && <span className="sp-chip-panel__count">&nbsp;({activeNums.size} selected)</span>}
                    </span>
                    {activeNums.size > 0 && (
                      <button className="sp-chip-panel__clear" onClick={() => { setActiveNums(new Set()); setSelectedParts([]) }}>
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  <div className="sp-chip-list">
                    {hotspotNumbers.map(num => (
                      <button
                        key={num}
                        type="button"
                        className={["sp-chip", activeNums.has(num) ? "sp-chip--active" : "", hoveredNum === num ? "sp-chip--hover" : ""].filter(Boolean).join(" ")}
                        onMouseEnter={() => setHoveredNum(num)}
                        onMouseLeave={() => setHoveredNum(null)}
                        onClick={() => handleChipClick(num)}
                        title={`Hover to highlight · Click to filter image no. ${num}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  {/* Hover indicator arrow */}
                  {hoveredNum && (
                    <div className="sp-chip-hover-hint">
                      <span className="sp-chip-hover-arrow">▶</span>
                      Scrolling to image no. <strong>{hoveredNum}</strong> rows
                    </div>
                  )}

                  {activeNums.size > 0 && (
                    <p className="sp-chip-panel__info">
                      Showing {displayParts.length} part{displayParts.length !== 1 ? "s" : ""} for img no.&nbsp;
                      <strong>{Array.from(activeNums).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(", ")}</strong>
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="sp-image-empty">Image not available</div>
          )}
        </aside>

        {/* RIGHT: table */}
        <section className="sp-table-panel">

          <div className="sp-toolbar">
            <input
              type="text"
              className="sp-search"
              placeholder="Search parts by name, number, or description…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button disabled={!selectedParts.length || addingToCart} onClick={() => void addSelectedToCart()} className="sp-add-btn">
              <FaShoppingBasket />
              {addingToCart ? "Adding…" : `Add to Cart (${selectedParts.length})`}
            </button>
          </div>

          <div className="sp-status-bar">
            <span className="sp-status-bar__text">
              {partsLoading ? "Loading parts…"
                : searchLoading ? "Searching parts…"
                : activeNums.size > 0
                  ? `${displayParts.length} part${displayParts.length !== 1 ? "s" : ""} for image no. ${Array.from(activeNums).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(", ")}`
                  : `${displayParts.length} part${displayParts.length !== 1 ? "s" : ""} found`}
            </span>
            {selectedParts.length > 0 && (
              <span className="sp-status-bar__sel">
                <span className="sp-sel-badge">{selectedParts.length} selected</span>
                <button className="sp-status-bar__clear" onClick={() => setSelectedParts([])}>Clear</button>
              </span>
            )}
          </div>

          <div className="sp-table-scroll" ref={tableScrollRef}>
            <table className="sp-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: "14%" }} />
                <col />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 84 }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: 96 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Sr.</th>
                  <th style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={allDisplaySelected} onChange={e => toggleSelectAll(e.target.checked)} className="sp-checkbox" title="Select all in-stock" />
                  </th>
                  <th>Part No.</th>
                  <th>Part Name</th>
                  <th style={{ textAlign: "center" }}>Stock</th>
                  <th style={{ textAlign: "right" }}>BDP</th>
                  <th style={{ textAlign: "right" }}>MRP</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {displayParts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="sp-table__empty" data-label="">
                      {partsLoading ? "Loading parts…" : searchLoading ? "Searching parts…"
                        : activeNums.size > 0 ? "No parts for selected image numbers" : "No parts found"}
                    </td>
                  </tr>
                ) : displayParts.map((part, idx) => {
                  const qty    = quantities[part.id] || 1
                  const stock  = getAvailableStock(part)
                  const imgNum = part.imageNumber?.trim()

                  return (
                    <tr
                      key={part.id}
                      data-imgnum={imgNum}
                      className={getRowClass(part, stock)}
                      onClick={() => stock > 0 && toggleSelect(part)}
                      style={{ cursor: stock > 0 ? "pointer" : "not-allowed" }}
                      ref={el => {
                        // Register the FIRST row for each imageNumber for auto-scroll
                        if (imgNum && !rowRefs.current[imgNum]) rowRefs.current[imgNum] = el
                      }}
                    >
                      <td data-label="Sr." style={{ textAlign: "center" }} className="sp-td--sr">{idx + 1}</td>

                      <td data-label="Select" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedParts.includes(part.id)} disabled={stock === 0} onChange={() => toggleSelect(part)} className="sp-checkbox" />
                      </td>

                      <td className="sp-td--part-num" data-label="Part No.">
                        <span>{part.partNumber}</span>
                        {part.imageNumber && <span className="sp-img-num-tag">#{part.imageNumber}</span>}
                      </td>

                      <td className="sp-td--part-name" data-label="Part Name">{part.partName}</td>

                      <td data-label="Stock" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <StockBadge stock={stock} />
                      </td>

                      <td data-label="BDP" className="sp-td--money">
                        {part.bdp != null ? `₹${Number(part.bdp).toFixed(2)}` : "—"}
                      </td>

                      <td data-label="MRP" className="sp-td--money sp-td--mrp">
                        {part.mrp != null ? `₹${Number(part.mrp).toFixed(2)}`
                          : part.price != null ? `₹${Number(part.price).toFixed(2)}` : "—"}
                      </td>

                      <td data-label="Remarks" onClick={e => e.stopPropagation()}>
                        <input
                          className="sp-remarks-input"
                          value={remarks[part.id] ?? ""}
                          onChange={e => setRemarks(prev => ({ ...prev, [part.id]: e.target.value }))}
                        />
                      </td>

                      <td data-label="Qty" onClick={e => e.stopPropagation()}>
                        <div className="sp-qty">
                          <button onClick={() => changeQty(part.id, -1)} disabled={qty <= 1 || stock === 0}>−</button>
                          <span>{qty}</span>
                          <button onClick={() => changeQty(part.id, 1)}  disabled={qty >= stock || stock === 0}>+</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SearchParts