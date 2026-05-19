// SearchParts.tsx — BGAUSS Electronic Parts Catalog
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
  FaSearchPlus, FaSearchMinus, FaTimes, FaEnvelope,
  FaChevronLeft, FaChevronRight,
} from "react-icons/fa"

const PAGE_SIZE = 20

interface PartWithPrice extends Part {
  bdp?: number
  mrp?: number
  taxPercent?: number
}
interface CartItemSummary {
  id: number; partId: number; quantity: number; price?: number
}

const toStockInt = (v: number | string | undefined | null): number => {
  if (v == null || v === "" || v === "null") return 0
  const n = typeof v === "number" ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}
const toImgStr = (v: string | number | undefined | null): string =>
  String(v ?? "").trim()

const naturalCmp = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [serverErr, setServerErr] = useState("")

  const ch = (field: string, val: string | boolean) =>
    setForm(p => ({ ...p, [field]: val }))

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!form.subject.trim()) e.subject = "Please select a kind of request."
    if (form.firstName && !/^[A-Za-z\s.'-]+$/.test(form.firstName)) e.firstName = "Letters only."
    if (form.lastName  && !/^[A-Za-z\s.'-]+$/.test(form.lastName))  e.lastName  = "Letters only."
    if (!form.email.trim()) e.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email."
    if (form.phone && form.phone.replace(/\D/g, "").length !== 10) e.phone = "Must be 10 digits."
    if (!form.message.trim()) e.message = "Message is required."
    if (!form.agree) e.agree = "You must agree to the data protection terms."
    return e
  }

  const handlePhone = (val: string) => ch("phone", val.replace(/\D/g, "").slice(0, 10))
  const handleName  = (f: string, val: string) => ch(f, val.replace(/[^A-Za-z\s.'-]/g, ""))

  const handleSubmit = async () => {
    const errs = validate(); setErrors(errs)
    if (Object.values(errs).some(v => v)) return
    setServerErr(""); setSending(true)
    try {
      await axios.post("/contact/send", {
        subject: form.subject, salutation: form.salutation,
        firstName: form.firstName, lastName: form.lastName,
        company: form.company, email: form.email.trim(),
        phone: form.phone, message: form.message,
      })
      setSent(true); setTimeout(onClose, 2800)
    } catch { setServerErr("Failed to send. Please try again.") }
    finally { setSending(false) }
  }

  return (
    <>
      <div className="sp-modal-bg" onClick={onClose} />
      <div className="sp-contact-modal">
        <div className="sp-contact-header">
          <div>
            <h2 className="sp-contact-title"><FaEnvelope style={{ marginRight: 8 }} />Contact Us</h2>
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
            {serverErr && <div className="sp-contact-error">{serverErr}</div>}
            <div className="sp-cf-field">
              <label>Kind of Request <span style={{ color: "#dc2626" }}>*</span></label>
              <select value={form.subject}
                onChange={e => { ch("subject", e.target.value); setErrors(p => ({ ...p, subject: "" })) }}
                className={errors.subject ? "sp-cf-err" : ""}>
                <option value="">Please choose…</option>
                <option>Technical Assistance</option><option>Product Suggestion</option>
                <option>Parts Ordering Query</option><option>Return / Replacement</option>
                <option>Other</option>
              </select>
              {errors.subject && <span className="sp-cf-field-err">{errors.subject}</span>}
            </div>
            <div className="sp-cf-row sp-cf-row--3">
              <div className="sp-cf-field">
                <label>Salutation</label>
                <select value={form.salutation} onChange={e => ch("salutation", e.target.value)}>
                  <option value="">—</option><option>Mr.</option><option>Ms.</option>
                  <option>Mrs.</option><option>Dr.</option>
                </select>
              </div>
              <div className="sp-cf-field">
                <label>First Name</label>
                <input value={form.firstName} onChange={e => handleName("firstName", e.target.value)}
                  placeholder="First name" className={errors.firstName ? "sp-cf-err" : ""} />
                {errors.firstName && <span className="sp-cf-field-err">{errors.firstName}</span>}
              </div>
              <div className="sp-cf-field">
                <label>Last Name</label>
                <input value={form.lastName} onChange={e => handleName("lastName", e.target.value)}
                  placeholder="Last name" className={errors.lastName ? "sp-cf-err" : ""} />
                {errors.lastName && <span className="sp-cf-field-err">{errors.lastName}</span>}
              </div>
            </div>
            <div className="sp-cf-row sp-cf-row--2">
              <div className="sp-cf-field">
                <label>Company</label>
                <input value={form.company} onChange={e => ch("company", e.target.value)} placeholder="Company name" />
              </div>
              <div className="sp-cf-field">
                <label>Mobile (10 digits)</label>
                <input type="tel" value={form.phone} onChange={e => handlePhone(e.target.value)}
                  maxLength={10} placeholder="10-digit number" className={errors.phone ? "sp-cf-err" : ""} />
                {errors.phone && <span className="sp-cf-field-err">{errors.phone}</span>}
              </div>
            </div>
            <div className="sp-cf-field">
              <label>Email <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="email" value={form.email}
                onChange={e => { ch("email", e.target.value); setErrors(p => ({ ...p, email: "" })) }}
                placeholder="your@email.com" className={errors.email ? "sp-cf-err" : ""} />
              {errors.email && <span className="sp-cf-field-err">{errors.email}</span>}
            </div>
            <div className="sp-cf-field">
              <label>Your Message <span style={{ color: "#dc2626" }}>*</span></label>
              <textarea rows={4} value={form.message}
                onChange={e => { ch("message", e.target.value); setErrors(p => ({ ...p, message: "" })) }}
                placeholder="Describe your query…" className={errors.message ? "sp-cf-err" : ""} />
              {errors.message && <span className="sp-cf-field-err">{errors.message}</span>}
            </div>
            <div className="sp-cf-agree">
              <input type="checkbox" id="sp-agree" checked={form.agree}
                onChange={e => { ch("agree", e.target.checked); setErrors(p => ({ ...p, agree: "" })) }} />
              <label htmlFor="sp-agree">
                I agree to the collection and processing of my personal data.
                See our <a href="https://www.bgauss.com/privacy-policy/" target="_blank" rel="noreferrer">Data Protection Policy</a>.
              </label>
            </div>
            {errors.agree && <div className="sp-cf-field-err" style={{ marginBottom: 8 }}>{errors.agree}</div>}
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

  // ── Read full context from partsPageState (written by assembly_catalogue
  //    when navigating here) so breadcrumb back-nav carries variantId/colourId.
  //    location.state only contains what assembly_catalogue passed, so we
  //    also read sessionStorage as the authoritative full-context source.
  const partsPageState = (() => {
    try { return JSON.parse(sessionStorage.getItem("partsPageState") ?? "null") ?? {} }
    catch { return {} }
  })()

  // ── assemblyPageState is what we pass back to assembly_catalogue via
  //    breadcrumb. It MUST include variantId + colourId so the catalogue
  //    re-fetches with the correct filters (not "show all").
  //    Priority: location.state fields > partsPageState fields.
  const assemblyPageState = {
    modelId:   modelId   ?? partsPageState.modelId,
    variantId: (location.state?.variantId) ?? partsPageState.variantId,
    colourId:  (location.state?.colourId)  ?? partsPageState.colourId,
  }

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
  const [currentPage,   setCurrentPage]   = useState(1)

  const addingRef = useRef(false)
  const [addingToCart, setAddingToCart] = useState(false)

  // ── Zoom / pan ────────────────────────────────────────────────
  const [zoomOpen,  setZoomOpen]  = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const isDragging     = useRef(false)
  const dragStart      = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const zoomViewportRef = useRef<HTMLDivElement>(null)

  // Chip state
  const [activeNums, setActiveNums] = useState<Set<string>>(new Set())
  const [hoveredNum, setHoveredNum] = useState<string | null>(null)

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const rowRefs        = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = zoomOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [zoomOpen])

  // ── Wheel zoom — zooms toward cursor ──────────────────────────
  useEffect(() => {
    const el = zoomViewportRef.current
    if (!el || !zoomOpen) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect    = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left - rect.width  / 2
      const cursorY = e.clientY - rect.top  - rect.height / 2
      setZoomScale(prev => {
        const next = Math.max(1, Math.min(5, prev + (e.deltaY < 0 ? 0.25 : -0.25)))
        if (next === prev) return prev
        const factor = next / prev
        setPanX(px => next <= 1 ? 0 : cursorX - factor * (cursorX - px))
        setPanY(py => next <= 1 ? 0 : cursorY - factor * (cursorY - py))
        return next
      })
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [zoomOpen])

  // ── Drag to pan ───────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return
    isDragging.current = true
    dragStart.current  = { x: e.clientX, y: e.clientY, panX, panY }
    e.preventDefault()
  }
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    setPanX(dragStart.current.panX + (e.clientX - dragStart.current.x))
    setPanY(dragStart.current.panY + (e.clientY - dragStart.current.y))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  useEffect(() => {
    if (!zoomOpen) return
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
  }, [zoomOpen, onMouseMove, onMouseUp])

  const openZoom  = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoomOpen(true); setZoomScale(1); setPanX(0); setPanY(0)
  }
  const closeZoom = () => { setZoomOpen(false); setZoomScale(1); setPanX(0); setPanY(0) }
  const zoomIn    = (e: React.MouseEvent) => { e.stopPropagation(); setZoomScale(p => Math.min(5, +(p + 0.5).toFixed(1))) }
  const zoomOut   = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoomScale(p => { const n = Math.max(1, +(p - 0.5).toFixed(1)); if (n <= 1) { setPanX(0); setPanY(0) }; return n })
  }
  const zoomReset = (e: React.MouseEvent) => { e.stopPropagation(); setZoomScale(1); setPanX(0); setPanY(0) }

  const hydratePartState = (items: PartWithPrice[]) => {
    setQuantities(prev => { const n = { ...prev }; items.forEach(p => { if (n[p.id] == null) n[p.id] = 1 }); return n })
    setRemarks(prev => { const n = { ...prev }; items.forEach(p => { if (n[p.id] == null) n[p.id] = p.remarks ?? "" }); return n })
  }

  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get("/cart/my-cart")
      const cartItems: CartItemSummary[] = res.data?.items || []
      setCartCount(cartItems.length)
      setCartPartQtys(Object.fromEntries(cartItems.map(i => [i.partId, i.quantity])))
    } catch { setCartCount(0); setCartPartQtys({}) }
  }, [])

  useEffect(() => {
    const fetchParts = async () => {
      if (modelId == null || assemblyId == null) {
        setAllParts([]); setVisibleParts([]); setPartsLoading(false); return
      }
      try {
        setPartsLoading(true)
        const posFilter = partPosition != null ? `&partPosition=${encodeURIComponent(String(partPosition))}` : ""
        const res = await fetch(`/api/parts/by-assembly?modelId=${modelId}&assemblyId=${assemblyId}${posFilter}`)
        if (!res.ok) { setAllParts([]); setVisibleParts([]); return }
        const raw: PartWithPrice[] = await res.json()
        const normalised = (Array.isArray(raw) ? raw : []).map(p => ({
          ...p, imageNumber: toImgStr(p.imageNumber), stockQuantity: toStockInt(p.stockQuantity),
        })).sort((a, b) => naturalCmp(toImgStr(a.imageNumber), toImgStr(b.imageNumber)))
        setAllParts(normalised); setVisibleParts(normalised); hydratePartState(normalised)
      } catch { setAllParts([]); setVisibleParts([]) }
      finally { setPartsLoading(false) }
    }
    void fetchParts(); void fetchCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assemblyId, modelId, partPosition, fetchCart])

  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (!trimmed) { setVisibleParts(allParts); setSearchLoading(false); return }
    let cancelled = false
    setSearchLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const data = await commonSearch<PartWithPrice>("parts", trimmed)
        const filtered = data
          .filter(p => Number(p.modelId) === Number(modelId) && Number(p.assemblyId) === Number(assemblyId))
          .map(p => ({ ...p, imageNumber: toImgStr(p.imageNumber), stockQuantity: toStockInt(p.stockQuantity) }))
          .sort((a, b) => naturalCmp(toImgStr(a.imageNumber), toImgStr(b.imageNumber)))
        if (cancelled) return
        hydratePartState(filtered); setVisibleParts(filtered)
      } catch { if (!cancelled) setVisibleParts([]) }
      finally  { if (!cancelled) setSearchLoading(false) }
    }, 300)
    return () => { cancelled = true; window.clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParts, assemblyId, modelId, searchTerm])

  useEffect(() => {
    setActiveNums(new Set()); setHoveredNum(null); rowRefs.current = {}; setCurrentPage(1)
  }, [assemblyId, modelId])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, activeNums])

  useEffect(() => {
    if (!hoveredNum) return
    const row = rowRefs.current[hoveredNum]
    if (row && tableScrollRef.current) {
      const container = tableScrollRef.current
      container.scrollTo({ top: Math.max(0, row.offsetTop - container.clientHeight / 2 + row.offsetHeight / 2), behavior: "smooth" })
    }
  }, [hoveredNum])

  const getAvailableStock = useCallback((p: PartWithPrice): number =>
    Math.max(0, toStockInt(p.stockQuantity) - (cartPartQtys[p.id] ?? 0)),
  [cartPartQtys])

  const hotspotNumbers: string[] = Array.from(
    new Set(allParts.map(p => toImgStr(p.imageNumber)).filter(n => n.length > 0))
  ).sort(naturalCmp)

  const displayParts = activeNums.size > 0
    ? visibleParts.filter(p => { const n = toImgStr(p.imageNumber); return n.length > 0 && activeNums.has(n) })
    : visibleParts

  const totalPages = Math.max(1, Math.ceil(displayParts.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const pagedParts = displayParts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleChipClick = (num: string) => {
    setActiveNums(prev => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
        setSelectedParts(sp => sp.filter(id => {
          const pNum = toImgStr(allParts.find(p => p.id === id)?.imageNumber)
          return pNum !== num || next.has(pNum)
        }))
      } else {
        next.add(num)
        const toSelect = allParts.filter(p => toImgStr(p.imageNumber) === num && getAvailableStock(p) > 0).map(p => p.id)
        setSelectedParts(sp => Array.from(new Set([...sp, ...toSelect])))
      }
      return next
    })
  }

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

  const addSelectedToCart = async () => {
    if (selectedParts.length === 0) { alert("Please select at least one part"); return }
    if (addingRef.current) return
    addingRef.current = true; setAddingToCart(true)
    try {
      for (const partId of selectedParts) {
        await axios.post("/cart/add", { PartId: partId, Quantity: quantities[partId] || 1 })
      }
      await fetchCart(); navigate("/checkout")
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as string | undefined) : undefined
      alert(msg ?? "Failed to add items to cart.")
    } finally { addingRef.current = false; setAddingToCart(false) }
  }

  const getRowClass = (part: PartWithPrice, stock: number): string => {
    const imgNum = toImgStr(part.imageNumber)
    if (stock === 0)                                              return "row--out-stock"
    if (selectedParts.includes(part.id))                         return "row--selected"
    if (hoveredNum != null && imgNum === hoveredNum)              return "row--chip-hover"
    if (activeNums.size > 0 && imgNum && activeNums.has(imgNum)) return "row--hotspot-match"
    return ""
  }

  return (
    <div className="sp-wrapper">
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      {/* Zoom overlay at ROOT level */}
      {zoomOpen && (
        <div className="sp-zoom-overlay" onClick={closeZoom}>
          <button className="sp-zoom-close" onClick={e => { e.stopPropagation(); closeZoom() }}>
            <FaTimes />
          </button>
          <div className="sp-zoom-controls" onClick={e => e.stopPropagation()}>
            <button className="sp-zoom-btn" onClick={zoomOut} disabled={zoomScale <= 1} title="Zoom out">
              <FaSearchMinus />
            </button>
            <span className="sp-zoom-level">{Math.round(zoomScale * 100)}%</span>
            <button className="sp-zoom-btn" onClick={zoomIn} disabled={zoomScale >= 5} title="Zoom in">
              <FaSearchPlus />
            </button>
            <button className="sp-zoom-btn sp-zoom-btn--reset" onClick={zoomReset} disabled={zoomScale === 1}>
              Reset
            </button>
          </div>
          <div
            ref={zoomViewportRef}
            className="sp-zoom-viewport"
            onClick={e => e.stopPropagation()}
            onMouseDown={onMouseDown}
            style={{ cursor: zoomScale > 1 ? (isDragging.current ? "grabbing" : "grab") : "zoom-in" }}
          >
            <img
              src={assemblyImage as string}
              alt={assemblyName as string}
              draggable={false}
              style={{
                transform: `scale(${zoomScale}) translate(${panX / zoomScale}px, ${panY / zoomScale}px)`,
                transition: isDragging.current ? "none" : "transform 0.15s ease",
                maxWidth: "90%", maxHeight: "90%",
                objectFit: "contain",
                userSelect: "none", pointerEvents: "none",
              }}
            />
          </div>
          <p className="sp-zoom-hint">Scroll to zoom · Drag to pan · Click outside to close</p>
        </div>
      )}

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

      {/*
        ── FIX: assemblyPageState now carries variantId + colourId ──────────
        Previously this was just { modelId }, which caused assembly_catalogue
        to re-fetch without variantId and show ALL assemblies when the user
        clicked "Assembly Catalogue" in the breadcrumb.

        assemblyPageState is built at the top of this component from
        location.state (set by assembly_catalogue's goToAssembly) merged with
        partsPageState from sessionStorage, so variantId/colourId survive even
        if location.state gets cleared during a browser back navigation.
      */}
      <BreadcrumbPath
        current="parts"
        stateMap={{
          dashboard:         null,
          vehicle_preview:   null,
          assembly_catalogue: assemblyPageState,
        }}
      />

      <h2 className="sp-assembly-title">{assemblyName as string}</h2>

      <div className="sp-layout">

        {/* LEFT */}
        <aside className="sp-image-panel">
          {assemblyImage ? (
            <>
              <div className="sp-image-frame">
                <img
                  src={assemblyImage as string}
                  className="sp-assembly-img"
                  alt={assemblyName as string}
                  onClick={openZoom}
                />
                <button className="sp-zoom-trigger" onClick={openZoom} title="Zoom image">
                  <FaSearchPlus style={{ fontSize: 11 }} /> Zoom
                </button>
              </div>

              {!partsLoading && (
                <div className="sp-chip-panel">
                  <div className="sp-chip-panel__header">
                    <span className="sp-chip-panel__label">
                      Image No.
                      {hotspotNumbers.length > 0 && activeNums.size > 0 && (
                        <span className="sp-chip-panel__count">&nbsp;({activeNums.size}/{hotspotNumbers.length})</span>
                      )}
                    </span>
                    {activeNums.size > 0 && (
                      <button className="sp-chip-panel__clear"
                        onClick={() => { setActiveNums(new Set()); setSelectedParts([]) }}>
                        ✕ Clear
                      </button>
                    )}
                  </div>
                  {hotspotNumbers.length > 0 ? (
                    <>
                      <div className="sp-chip-list">
                        {hotspotNumbers.map(num => (
                          <button
                            key={num} type="button"
                            className={["sp-chip", activeNums.has(num) ? "sp-chip--active" : "", hoveredNum === num ? "sp-chip--hover" : ""].filter(Boolean).join(" ")}
                            onMouseEnter={() => setHoveredNum(num)}
                            onMouseLeave={() => setHoveredNum(null)}
                            onClick={() => handleChipClick(num)}
                            title={`Filter image no. ${num}`}
                          >{num}</button>
                        ))}
                      </div>
                      {hoveredNum && (
                        <div className="sp-chip-hover-hint">
                          <span className="sp-chip-hover-arrow">▶</span>
                          Scrolling to image no. <strong>{hoveredNum}</strong>
                        </div>
                      )}
                      {activeNums.size > 0 && (
                        <p className="sp-chip-panel__info">
                          Showing {displayParts.length} part{displayParts.length !== 1 ? "s" : ""} for img no.&nbsp;
                          <strong>{Array.from(activeNums).sort(naturalCmp).join(", ")}</strong>
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      No image numbers assigned to parts in this assembly.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="sp-image-empty">Image not available</div>
          )}
        </aside>

        {/* RIGHT */}
        <section className="sp-table-panel">
          <div className="sp-toolbar">
            <input
              type="text" className="sp-search"
              placeholder="Search parts by name, number, or description…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
            <button disabled={!selectedParts.length || addingToCart}
              onClick={() => void addSelectedToCart()} className="sp-add-btn">
              <FaShoppingBasket />
              {addingToCart ? "Adding…" : `Add to Cart (${selectedParts.length})`}
            </button>
          </div>

          <div className="sp-status-bar">
            <span className="sp-status-bar__text">
              {partsLoading ? "Loading parts…"
                : searchLoading ? "Searching…"
                : activeNums.size > 0
                  ? `${displayParts.length} part${displayParts.length !== 1 ? "s" : ""} for img no. ${Array.from(activeNums).sort(naturalCmp).join(", ")}`
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
                <col style={{ width: 40  }} />
                <col style={{ width: 38  }} />
                <col style={{ width: 60  }} />
                <col style={{ width: "13%" }} />
                <col />
                <col style={{ width: 96  }} />
                <col style={{ width: 78  }} />
                <col style={{ width: 78  }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: 92  }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Sr.</th>
                  <th style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={allDisplaySelected}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      className="sp-checkbox" title="Select all in-stock" />
                  </th>
                  <th style={{ textAlign: "center" }}>Img No.</th>
                  <th>Part No.</th>
                  <th>Part Name</th>
                  <th style={{ textAlign: "center" }}>Stock</th>
                  <th style={{ textAlign: "center" }}>BDP</th>
                  <th style={{ textAlign: "center" }}>MRP</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {pagedParts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="sp-table__empty" data-label="">
                      {partsLoading ? "Loading parts…" : searchLoading ? "Searching parts…"
                        : activeNums.size > 0 ? "No parts for selected image numbers" : "No parts found"}
                    </td>
                  </tr>
                ) : pagedParts.map((part, idx) => {
                  const qty    = quantities[part.id] || 1
                  const stock  = getAvailableStock(part)
                  const imgNum = toImgStr(part.imageNumber)
                  const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1

                  return (
                    <tr
                      key={part.id}
                      data-imgnum={imgNum}
                      className={getRowClass(part, stock)}
                      onClick={() => stock > 0 && toggleSelect(part)}
                      style={{ cursor: stock > 0 ? "pointer" : "not-allowed" }}
                      ref={el => { if (imgNum) rowRefs.current[imgNum] = el }}
                    >
                      <td data-label="Sr." style={{ textAlign: "center" }} className="sp-td--sr">{globalIdx}</td>
                      <td data-label="Select" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedParts.includes(part.id)}
                          disabled={stock === 0} onChange={() => toggleSelect(part)} className="sp-checkbox" />
                      </td>
                      <td
                        data-label="Img No."
                        className="sp-td--img-num"
                        style={{
                          textAlign: "center",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          overflowWrap: "break-word",
                          maxWidth: "120px"
                        }}
                      >
                        {imgNum || "—"}
                      </td>
                      <td className="sp-td--part-num" data-label="Part No.">{part.partNumber}</td>
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
                        <input className="sp-remarks-input" value={remarks[part.id] ?? ""}
                          onChange={e => setRemarks(prev => ({ ...prev, [part.id]: e.target.value }))} />
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

          {totalPages > 1 && (
            <div className="sp-pagination">
              <button className="sp-page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1} title="Previous page">
                <FaChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || (n >= safePage - 2 && n <= safePage + 2))
                .reduce<(number | "...")[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("...")
                  acc.push(n); return acc
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`e${i}`} className="sp-page-ellipsis">…</span>
                  ) : (
                    <button key={item}
                      className={`sp-page-btn${safePage === item ? " sp-page-btn--active" : ""}`}
                      onClick={() => setCurrentPage(item as number)}>{item}</button>
                  )
                )}
              <button className="sp-page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages} title="Next page">
                <FaChevronRight />
              </button>
              <span className="sp-page-info">
                Page {safePage} of {totalPages} &nbsp;·&nbsp; {displayParts.length} parts
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default SearchParts