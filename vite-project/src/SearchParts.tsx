import "./searchparts.css"
import logo from "./assets/logo.jpg"
import { useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import AccountMenu from "./components/AccountMenu"
import type { Part } from "./services/api"
import { commonSearch } from "./services/serachapi"

import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa"

interface CartItemSummary {
  id: number
  partId: number
  quantity: number
}

const SearchParts = () => {

  const location = useLocation()
  const navigate = useNavigate()

  const {
    modelId,
    assemblyId,
    assemblyName,
    assemblyImage,
    partPosition
  } = location.state || {}

  const [allParts, setAllParts] = useState<Part[]>([])
  const [visibleParts, setVisibleParts] = useState<Part[]>([])
  const [selectedParts, setSelectedParts] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [cartCount, setCartCount] = useState(0)
  const [cartPartQuantities, setCartPartQuantities] = useState<Record<number, number>>({})
  const [partsLoading, setPartsLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeImageNumber, setActiveImageNumber] = useState("")

  const hydratePartState = (items: Part[]) => {

    setQuantities(prev => {

      const next = { ...prev }

      items.forEach((part) => {
        if (next[part.id] == null) {
          next[part.id] = 1
        }
      })

      return next

    })

    setRemarks(prev => {

      const next = { ...prev }

      items.forEach((part) => {
        if (next[part.id] == null) {
          next[part.id] = part.remarks ?? ""
        }
      })

      return next

    })

  }

  const fetchCart = async () => {

    try {

      const res = await axios.get("/cart/my-cart")
      const cartItems: CartItemSummary[] = res.data?.items || []

      setCartCount(cartItems.length)

      setCartPartQuantities(
        Object.fromEntries(
          cartItems.map((item) => [item.partId, item.quantity])
        )
      )

    } catch {

      setCartCount(0)
      setCartPartQuantities({})

    }

  }

  useEffect(() => {

    const fetchParts = async () => {

      if (modelId == null || assemblyId == null) {
        setAllParts([])
        setVisibleParts([])
        setPartsLoading(false)
        return
      }

      try {

        setPartsLoading(true)

        const positionFilter = partPosition != null
          ? `&partPosition=${encodeURIComponent(String(partPosition))}`
          : ""

        const res = await fetch(
          `/api/parts/by-assembly?modelId=${modelId}&assemblyId=${assemblyId}${positionFilter}`
        )

        const data = await res.json()

        setAllParts(data)
        setVisibleParts(data)
        hydratePartState(data)

      } catch {

        setAllParts([])
        setVisibleParts([])

      } finally {

        setPartsLoading(false)

      }

    }

    fetchParts()
    fetchCart()

  }, [assemblyId, modelId, partPosition])

  useEffect(() => {

    const trimmedTerm = searchTerm.trim()

    if (!trimmedTerm) {
      setVisibleParts(allParts)
      setSearchLoading(false)
      return
    }

    if (modelId == null || assemblyId == null) {
      setVisibleParts([])
      setSearchLoading(false)
      return
    }

    let cancelled = false

    setSearchLoading(true)

    const timeoutId = window.setTimeout(async () => {

      try {

        const data = await commonSearch<Part>("parts", trimmedTerm)
        const filteredParts = data.filter((part) =>
          Number(part.modelId) === Number(modelId) &&
          Number(part.assemblyId) === Number(assemblyId)
        )

        if (cancelled) {
          return
        }

        hydratePartState(filteredParts)
        setVisibleParts(filteredParts)

      } catch {

        if (!cancelled) {
          setVisibleParts([])
        }

      } finally {

        if (!cancelled) {
          setSearchLoading(false)
        }

      }

    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }

  }, [allParts, assemblyId, modelId, searchTerm])

  useEffect(() => {

    setActiveImageNumber("")

  }, [assemblyId, modelId])

  const getAvailableStock = (part: Part) =>
    Math.max(0, part.stockQuantity - (cartPartQuantities[part.id] ?? 0))

  const hotspotNumbers = Array.from(
    new Set(
      allParts
        .map((part) => part.imageNumber?.trim())
        .filter((imageNumber): imageNumber is string => Boolean(imageNumber))
    )
  ).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
  )

  const displayParts = activeImageNumber
    ? visibleParts.filter((part) => part.imageNumber?.trim() === activeImageNumber)
    : visibleParts

  const toggleSelect = (part: Part) => {

    if (getAvailableStock(part) === 0) {
      alert(`${part.partName} is out of stock`)
      return
    }

    setSelectedParts(prev => {

      if (prev.includes(part.id))
        return prev.filter(x => x !== part.id)

      return [...prev, part.id]

    })

  }

  const changeQty = (id: number, delta: number) => {

    const part = allParts.find(p => p.id === id) || visibleParts.find(p => p.id === id)
    if (!part) return

    const availableStock = getAvailableStock(part)

    setQuantities(prev => {

      const currentQty = prev[id] || 1
      const newQty = currentQty + delta

      if (newQty < 1) return prev

      if (newQty > availableStock) {
        alert(`Only ${availableStock} items available`)
        return prev
      }

      return {
        ...prev,
        [id]: newQty
      }

    })

  }

  const addSelectedToCart = async () => {

    if (selectedParts.length === 0) {
      alert("Please select parts")
      return
    }

    try {

      for (const partId of selectedParts) {

        const qty = quantities[partId] || 1

        await axios.post("/cart/add", {
          PartId: partId,
          Quantity: qty
        })

      }

      await fetchCart()
      navigate("/checkout")

    } catch (error: any) {

      alert(error.response?.data || "Failed to add items")

    }

  }

  return (

    <div className="catalog-wrapper">

      <nav className="catalog-navbar">

        <div className="brand">

          <img src={logo} className="nav-logo" />

          <div className="brand-text">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="nav-actions">

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button className="nav-icon-btn">
            <FaPhoneAlt />
          </button>

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/checkout")}
          >
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </button>

          <AccountMenu />

        </div>

      </nav>

      <h2 className="assembly-title">{assemblyName}</h2>

      <div className="parts-layout">

        <div className="assembly-image-panel">

          {assemblyImage ? (

            <>

              <div className="assembly-image-frame">

                <img
                  src={assemblyImage}
                  className="assembly-large-image"
                />

              </div>

              {hotspotNumbers.length > 0 && (

                <div className="image-number-panel">

                  <span className="image-number-label">Image No.</span>

                  <div className="image-number-list">

                    {hotspotNumbers.map((imageNumber) => (

                      <button
                        key={imageNumber}
                        type="button"
                        className={`image-number-chip${activeImageNumber === imageNumber ? " active" : ""}`}
                        onClick={() =>
                          setActiveImageNumber((current) =>
                            current === imageNumber ? "" : imageNumber
                          )
                        }
                      >
                        {imageNumber}
                      </button>

                    ))}

                  </div>

                </div>

              )}

            </>

          ) : (

            <div className="assembly-image-empty">
              Image not available
            </div>

          )}

        </div>

        <div className="parts-table">

          <div className="parts-actions">

            <input
              type="text"
              className="parts-search"
              placeholder="Search parts by name, number, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button
              disabled={!selectedParts.length}
              onClick={addSelectedToCart}
            >
              Add Selected To Cart
            </button>

          </div>

          <div className="parts-search-status">
            {partsLoading
              ? "Loading parts..."
              : searchLoading
                ? "Searching parts..."
                : activeImageNumber
                  ? `${displayParts.length} parts found for image no ${activeImageNumber}`
                  : `${displayParts.length} parts found`}
          </div>

          <div className="parts-table-scroll">

            <table className="parts-data-table">

              <colgroup>
                <col className="col-select" />
                <col className="col-part-number" />
                <col className="col-part-name" />
                <col className="col-remarks" />
                <col className="col-qty" />
              </colgroup>

              <thead>

                <tr>
                  <th>Select</th>
                  <th>Part Number</th>
                  <th>Part Name</th>
                  <th>Remarks</th>
                  <th>Qty</th>
                </tr>

              </thead>

              <tbody>

                {displayParts.length === 0 ? (

                  <tr>
                    <td className="parts-empty-state" colSpan={5}>
                      {partsLoading
                        ? "Loading parts..."
                        : searchLoading
                          ? "Searching parts..."
                          : activeImageNumber
                            ? `No parts found for image no ${activeImageNumber}`
                            : "No parts found"}
                    </td>
                  </tr>

                ) : displayParts.map(part => {

                  const qty = quantities[part.id] || 1
                  const availableStock = getAvailableStock(part)

                  return (

                    <tr
                      key={part.id}
                      className={`${availableStock === 0 ? "row-out-stock" : ""}${activeImageNumber && part.imageNumber?.trim() === activeImageNumber ? " row-hotspot-match" : ""}`}
                    >

                      <td>

                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part.id)}
                          disabled={availableStock === 0}
                          onChange={() => toggleSelect(part)}
                        />

                      </td>

                      <td className="part-number-cell">{part.partNumber}</td>
                      <td className="part-name-cell">{part.partName}</td>

                      <td>

                        <input
                          className="remarks-input"
                          value={remarks[part.id] || ""}
                          onChange={(e) =>
                            setRemarks(prev => ({
                              ...prev,
                              [part.id]: e.target.value
                            }))
                          }
                        />

                      </td>

                      <td>

                        <div className="qty-control">

                          <button
                            onClick={() => changeQty(part.id, -1)}
                            disabled={qty <= 1}
                          >
                            -
                          </button>

                          <span>{qty}</span>

                          <button
                            onClick={() => changeQty(part.id, 1)}
                            disabled={qty >= availableStock}
                          >
                            +
                          </button>

                        </div>

                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>

  )

}

export default SearchParts
