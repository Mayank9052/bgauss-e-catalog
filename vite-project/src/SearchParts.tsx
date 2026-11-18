// SearchParts.tsx — BGAUSS Electronic Parts Catalog
//  • Assembly drawing (PDF or image) with zoom / pan / full-screen
//  • Clickable part numbers on the drawing → part details + auto-selection
//  • Individual Part Image column and preview
//  • Only ACTIVE parts compatible with the selected model / variant / colour
//  • Download the catalogue as PDF (this assembly / this vehicle / complete)
import "./searchparts.css"
import logo from "./assets/logo.jpg"
import { useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import axios from "axios"
import AccountMenu from "./components/AccountMenu"
import BreadcrumbPath from "./components/BreadcrumbPath"
import type { Part } from "./services/api"
import AssemblyDrawingViewer from "./components/drawing/AssemblyDrawingViewer"
import { PartImageThumb } from "./components/PartImageThumb"
import CatalogueDownload from "./components/catalogue/CatalogueDownload"
import type { CatalogueScope } from "./components/catalogue/CatalogueDownload"
import { resolveMediaUrl } from "./utils/media"
import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaShoppingBasket,
  FaTimes, FaEnvelope, FaChevronLeft, FaChevronRight, FaInfoCircle,
  FaRedo, FaArrowLeft, FaCheck,
} from "react-icons/fa"

const PAGE_SIZE = 20

interface PartWithPrice extends Part {
  bdp?: number
  mrp?: number
  taxPercent?: number
  partImagePath?: string
  colourNames?: string
  modelName?: string
  variantName?: string
  assemblyName?: string
  torqueNm?: number
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

const money = (v?: number | null) => (v != null ? `₹${Number(v).toFixed(2)}` : "—")

const StockBadge = ({ stock }: { stock: number }) => {
  if (stock === 0) return <span className="badge badge--out">OUT OF STOCK</span>
  if (stock <= 5)  return <span className="badge badge--low">LOW: {stock}</span>
  return               <span className="badge badge--in">IN STOCK: {stock}</span>
}

const readSession = <T,>(key: string): T | null => {
  try { return JSON.parse(sessionStorage.getItem(key) ?? "null") as T | null }
  catch { return null }
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

// ── Part details drawer (opened from the drawing or the Img No. cell) ──
function PartDetailsDrawer({
  label, parts, selected, getStock, onToggle, onClose, vehicle,
}: {
  label: string
  parts: PartWithPrice[]
  selected: number[]
  getStock: (p: PartWithPrice) => number
  onToggle: (p: PartWithPrice) => void
  onClose: () => void
  vehicle: { model?: string; variant?: string; colour?: string }
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <>
      <div className="sp-drawer-bg" onClick={onClose} />
      <aside className="sp-drawer" role="dialog" aria-label={`Parts for image number ${label}`}>
        <div className="sp-drawer__head">
          <button type="button" className="sp-drawer__back" onClick={onClose}>
            <FaArrowLeft /> Back to drawing
          </button>
          <button type="button" className="sp-drawer__x" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>
        <h3 className="sp-drawer__title">
          Image No. <span className="sp-drawer__no">{label}</span>
          <small>{parts.length} part{parts.length === 1 ? "" : "s"}</small>
        </h3>

        {parts.length === 0 && (
          <div className="sp-drawer__empty">
            No active part in this assembly is linked to image number <strong>{label}</strong> for the selected vehicle.
          </div>
        )}

        <div className="sp-drawer__list">
          {parts.map(p => {
            const stock = getStock(p)
            const isSel = selected.includes(p.id)
            return (
              <article key={p.id} className={`sp-pd${isSel ? " sp-pd--sel" : ""}`}>
                <div className="sp-pd__img">
                  <PartImageThumb path={p.partImagePath} alt={`${p.partNumber} ${p.partName}`} size={120}
                    caption={`${p.partNumber} — ${p.partName}`} />
                </div>
                <div className="sp-pd__body">
                  <div className="sp-pd__pn">{p.partNumber}</div>
                  <div className="sp-pd__name">{p.partName}</div>
                  {p.description && p.description !== p.partName && <p className="sp-pd__desc">{p.description}</p>}
                  <dl className="sp-pd__grid">
                    <dt>Model</dt><dd>{p.modelName || vehicle.model || "—"}</dd>
                    <dt>Variant</dt><dd>{p.variantName || "All variants"}</dd>
                    <dt>Colour</dt><dd>{p.colourNames || "All colours"}</dd>
                    {p.assemblyName && (<><dt>Assembly</dt><dd>{p.assemblyName}</dd></>)}
                    <dt>Stock</dt><dd><StockBadge stock={stock} /></dd>
                    <dt>BDP</dt><dd>{money(p.bdp)}</dd>
                    <dt>MRP</dt><dd className="sp-pd__mrp">{money(p.mrp ?? p.price)}</dd>
                    {p.torqueNm ? (<><dt>Torque</dt><dd>{p.torqueNm} Nm</dd></>) : null}
                    {p.remarks ? (<><dt>Remarks</dt><dd>{p.remarks}</dd></>) : null}
                  </dl>
                  <button type="button"
                    className={`sp-pd__btn${isSel ? " sp-pd__btn--sel" : ""}`}
                    disabled={stock === 0}
                    onClick={() => onToggle(p)}>
                    {stock === 0 ? "Out of stock" : isSel ? <><FaCheck /> Selected for cart</> : <><FaShoppingBasket /> Select for cart</>}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </aside>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────
const SearchParts = () => {
  const location = useLocation()
  const navigate  = useNavigate()

  // ── Full context: location.state (fresh navigation) → sessionStorage (refresh / back)
  const partsPageState = readSession<Record<string, unknown>>("partsPageState") ?? {}
  const searchState    = readSession<Record<string, unknown>>("partsSearchState") ?? {}
  const st = (location.state ?? {}) as Record<string, unknown>

  const modelId       = (st.modelId       ?? partsPageState.modelId)       as number | undefined
  const assemblyId    = (st.assemblyId    ?? partsPageState.assemblyId)    as number | undefined
  const assemblyName  = (st.assemblyName  ?? partsPageState.assemblyName ?? "") as string
  const assemblyImage = resolveMediaUrl((st.assemblyImage ?? partsPageState.assemblyImage ?? "") as string)
  const partPosition  = st.partPosition as string | number | undefined
  const variantId     = (st.variantId ?? partsPageState.variantId) as number | undefined
  const colourId      = (st.colourId  ?? partsPageState.colourId)  as number | undefined

  const vehicle = {
    model:   (searchState.modelName   as string) || undefined,
    variant: (searchState.variantName as string) || undefined,
    colour:  (searchState.colourName  as string) || undefined,
  }

  // breadcrumb back-navigation must carry variantId + colourId
  const assemblyPageState = { modelId, variantId, colourId }

  const [allParts,      setAllParts]      = useState<PartWithPrice[]>([])
  const [selectedParts, setSelectedParts] = useState<number[]>([])
  const [quantities,    setQuantities]    = useState<Record<number, number>>({})
  const [remarks,       setRemarks]       = useState<Record<number, string>>({})
  const [cartCount,     setCartCount]     = useState(0)
  const [cartPartQtys,  setCartPartQtys]  = useState<Record<number, number>>({})
  const [partsLoading,  setPartsLoading]  = useState(true)
  const [partsError,    setPartsError]    = useState("")
  const [reloadKey,     setReloadKey]     = useState(0)
  const [searchTerm,    setSearchTerm]    = useState("")
  const [showContact,   setShowContact]   = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)
  const [detailLabel,   setDetailLabel]   = useState<string | null>(null)
  const [notice,        setNotice]        = useState("")

  const addingRef = useRef(false)
  const [addingToCart, setAddingToCart] = useState(false)

  // Chip state
  const [activeNums, setActiveNums] = useState<Set<string>>(new Set())
  const [hoveredNum, setHoveredNum] = useState<string | null>(null)

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const rowRefs        = useRef<Record<string, HTMLTableRowElement | null>>({})

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

  // ── Parts for the selected configuration (active only, variant/colour compatible)
  useEffect(() => {
    let cancelled = false
    const fetchParts = async () => {
      if (modelId == null || assemblyId == null) {
        setAllParts([]); setPartsLoading(false)
        setPartsError("No assembly selected. Please choose an assembly from the Assembly Catalogue.")
        return
      }
      try {
        setPartsLoading(true); setPartsError("")
        const res = await axios.get<PartWithPrice[]>("/parts/by-assembly", {
          params: {
            modelId, assemblyId,
            variantId: variantId ?? undefined,
            colourId:  colourId ?? undefined,
            partPosition: partPosition ?? undefined,
          },
        })
        if (cancelled) return
        const normalised = (Array.isArray(res.data) ? res.data : []).map(p => ({
          ...p, imageNumber: toImgStr(p.imageNumber), stockQuantity: toStockInt(p.stockQuantity),
        })).sort((a, b) => naturalCmp(toImgStr(a.imageNumber), toImgStr(b.imageNumber)))
        setAllParts(normalised); hydratePartState(normalised)
      } catch {
        if (!cancelled) { setAllParts([]); setPartsError("Parts could not be loaded. Please check your connection and try again.") }
      } finally {
        if (!cancelled) setPartsLoading(false)
      }
    }
    void fetchParts(); void fetchCart()
    return () => { cancelled = true }
  }, [assemblyId, modelId, variantId, colourId, partPosition, fetchCart, reloadKey])

  // ── Instant client-side search within this assembly (every word must match)
  const visibleParts = useMemo(() => {
    const words = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return allParts
    return allParts.filter(p => {
      const hay = [p.partNumber, p.partName, p.description, p.imageNumber, p.remarks, p.colourNames]
        .map(x => String(x ?? "").toLowerCase()).join(" ")
      return words.every(w => hay.includes(w))
    })
  }, [allParts, searchTerm])

  useEffect(() => {
    setActiveNums(new Set()); setHoveredNum(null); rowRefs.current = {}; setCurrentPage(1); setDetailLabel(null)
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

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(""), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  const getAvailableStock = useCallback((p: PartWithPrice): number =>
    Math.max(0, toStockInt(p.stockQuantity) - (cartPartQtys[p.id] ?? 0)),
  [cartPartQtys])

  const hotspotNumbers: string[] = useMemo(() => Array.from(
    new Set(allParts.map(p => toImgStr(p.imageNumber)).filter(n => n.length > 0))
  ).sort(naturalCmp), [allParts])

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

  // ── Click on a part number in the drawing: highlight, filter, select and show details
  const handleHotspotClick = (num: string) => {
    const matches = allParts.filter(p => toImgStr(p.imageNumber) === num)
    setActiveNums(prev => (prev.has(num) ? prev : new Set([...prev, num])))
    const inStock = matches.filter(p => getAvailableStock(p) > 0).map(p => p.id)
    if (inStock.length) setSelectedParts(sp => Array.from(new Set([...sp, ...inStock])))
    if (matches.length > 0 && inStock.length === 0) setNotice(`Image no. ${num} is currently out of stock.`)
    setDetailLabel(num)
  }

  const toggleSelect = (part: PartWithPrice) => {
    if (getAvailableStock(part) === 0) { setNotice(`"${part.partName}" is out of stock.`); return }
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
      if (next > stock) { setNotice(`Only ${stock} item(s) available`); return prev }
      return { ...prev, [id]: next }
    })
  }

  const addSelectedToCart = async () => {
    if (selectedParts.length === 0) { setNotice("Please select at least one part"); return }
    if (addingRef.current) return
    addingRef.current = true; setAddingToCart(true)
    try {
      for (const partId of selectedParts) {
        await axios.post("/cart/add", { PartId: partId, Quantity: quantities[partId] || 1 })
      }
      await fetchCart(); navigate("/checkout")
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as string | undefined) : undefined
      alert(typeof msg === "string" && msg ? msg : "Failed to add items to cart.")
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

  // ── PDF catalogue scopes
  const vehicleTitle = [vehicle.model, vehicle.variant, vehicle.colour].filter(Boolean).join(" · ") || "Selected vehicle"
  const pdfScopes: CatalogueScope[] = [
    {
      key: "assembly", label: "This assembly",
      description: `${assemblyName || "Current assembly"} — drawing and parts list`,
      title: `${vehicleTitle} · ${assemblyName}`,
      params: { modelId, variantId, colourId, assemblyId },
    },
    {
      key: "vehicle", label: "This vehicle configuration",
      description: `All active assemblies for ${vehicleTitle}`,
      title: vehicleTitle,
      params: { modelId, variantId, colourId },
    },
    {
      key: "all", label: "Complete catalogue",
      description: "Every active model, variant and assembly",
      title: "Complete Parts Catalogue",
      params: {}, heavy: true,
    },
  ]

  const detailParts = detailLabel ? allParts.filter(p => toImgStr(p.imageNumber) === detailLabel) : []

  return (
    <div className="sp-wrapper">
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {detailLabel && (
        <PartDetailsDrawer
          label={detailLabel}
          parts={detailParts}
          selected={selectedParts}
          getStock={getAvailableStock}
          onToggle={toggleSelect}
          onClose={() => setDetailLabel(null)}
          vehicle={vehicle}
        />
      )}
      {notice && <div className="sp-notice" role="status"><FaInfoCircle /> {notice}</div>}

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

      <BreadcrumbPath
        current="parts"
        stateMap={{
          dashboard:          null,
          vehicle_preview:    null,
          assembly_catalogue: assemblyPageState,
        }}
      />

      <div className="sp-title-row">
        <div>
          <h2 className="sp-assembly-title">{assemblyName}</h2>
          {(vehicle.model || vehicle.variant || vehicle.colour) && (
            <div className="sp-vehicle-chips">
              {vehicle.model   && <span className="sp-vchip"><b>Model</b> {vehicle.model}</span>}
              {vehicle.variant && <span className="sp-vchip"><b>Variant</b> {vehicle.variant}</span>}
              {vehicle.colour  && <span className="sp-vchip"><b>Colour</b> {vehicle.colour}</span>}
            </div>
          )}
        </div>
        {modelId != null && <CatalogueDownload scopes={pdfScopes} />}
      </div>

      <div className="sp-layout">

        {/* LEFT — drawing */}
        <aside className="sp-image-panel">
          {assemblyImage ? (
            <AssemblyDrawingViewer
              src={assemblyImage}
              title={assemblyName}
              assemblyId={assemblyId}
              labels={hotspotNumbers}
              activeLabels={activeNums}
              focusLabel={detailLabel}
              hoveredLabel={hoveredNum}
              onHotspotClick={handleHotspotClick}
              onHotspotHover={setHoveredNum}
            />
          ) : (
            <div className="sp-image-empty">Drawing not available for this assembly</div>
          )}

          {!partsLoading && !partsError && (
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
                        onDoubleClick={() => setDetailLabel(num)}
                        title={`Filter image no. ${num} (double-click for details)`}
                      >{num}</button>
                    ))}
                  </div>
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
        </aside>

        {/* RIGHT — parts table */}
        <section className="sp-table-panel">
          <div className="sp-toolbar">
            <div className="sp-search-wrap">
              <input
                type="text" className="sp-search"
                placeholder="Search parts by number, name, description or image no.…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search parts"
              />
              {searchTerm && (
                <button type="button" className="sp-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search"><FaTimes /></button>
              )}
            </div>
            <button disabled={!selectedParts.length || addingToCart}
              onClick={() => void addSelectedToCart()} className="sp-add-btn">
              <FaShoppingBasket />
              {addingToCart ? "Adding…" : `Add to Cart (${selectedParts.length})`}
            </button>
          </div>

          <div className="sp-status-bar">
            <span className="sp-status-bar__text">
              {partsLoading ? "Loading parts…"
                : partsError ? "—"
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
                <col style={{ width: 36  }} />
                <col style={{ width: 34  }} />
                <col style={{ width: 56  }} />
                <col style={{ width: 56  }} />
                <col style={{ width: 118 }} />
                <col />{/* Part Name takes the remaining width (table has a min-width, see .sp-table) */}
                <col style={{ width: 88  }} />
                <col style={{ width: 72  }} />
                <col style={{ width: 72  }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 88  }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Sr.</th>
                  <th style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={allDisplaySelected}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      className="sp-checkbox" title="Select all in-stock" />
                  </th>
                  <th style={{ textAlign: "center" }}>Image</th>
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
                {partsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk${i}`} className="sp-skeleton-row">
                      {Array.from({ length: 11 }).map((__, j) => <td key={j}><span className="sp-skel" /></td>)}
                    </tr>
                  ))
                ) : partsError ? (
                  <tr>
                    <td colSpan={11} className="sp-table__empty" data-label="">
                      <div className="sp-state">
                        <p>{partsError}</p>
                        {modelId != null && assemblyId != null ? (
                          <button type="button" className="sp-state__btn" onClick={() => setReloadKey(k => k + 1)}><FaRedo /> Try again</button>
                        ) : (
                          <button type="button" className="sp-state__btn" onClick={() => navigate("/assembly_catalogue", { state: assemblyPageState })}><FaArrowLeft /> Assembly Catalogue</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : pagedParts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="sp-table__empty" data-label="">
                      <div className="sp-state">
                        <p>{searchTerm ? `No parts match "${searchTerm}"`
                          : activeNums.size > 0 ? "No parts for the selected image numbers"
                          : "No active parts are listed for this assembly and vehicle configuration."}</p>
                        {(searchTerm || activeNums.size > 0) && (
                          <button type="button" className="sp-state__btn" onClick={() => { setSearchTerm(""); setActiveNums(new Set()) }}>
                            Clear search &amp; filters
                          </button>
                        )}
                      </div>
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
                      <td data-label="Image" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()} className="sp-td--pic">
                        <PartImageThumb path={part.partImagePath} alt={`${part.partNumber} ${part.partName}`} size={44}
                          caption={`${part.partNumber} — ${part.partName}`} />
                      </td>
                      <td
                        data-label="Img No."
                        className="sp-td--img-num"
                        style={{ textAlign: "center", wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "break-word", maxWidth: "120px" }}
                        onClick={e => { if (imgNum) { e.stopPropagation(); setDetailLabel(imgNum) } }}
                      >
                        {imgNum ? (
                          <button type="button" className="sp-imgno-btn" title="View part details">{imgNum}</button>
                        ) : "—"}
                      </td>
                      <td className="sp-td--part-num" data-label="Part No.">{part.partNumber}</td>
                      <td className="sp-td--part-name" data-label="Part Name">
                        {part.partName}
                        {part.colourNames && <span className="sp-colour-tag" title="Colour-specific part">{part.colourNames}</span>}
                      </td>
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
