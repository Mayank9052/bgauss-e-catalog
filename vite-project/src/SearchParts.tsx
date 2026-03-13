import "./searchparts.css"
import logo from "./assets/logo.jpg"
import { useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import AccountMenu from "./components/AccountMenu"
import type { Part } from "./services/api"

import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa"

interface CartItemSummary {
  id: number
  partId: number
  quantity: number
}

const SearchParts = () => {

  const location = useLocation()
  const navigate = useNavigate()

  const { modelId, assemblyId, assemblyName, partPosition } = location.state || {}

  const [parts, setParts] = useState<Part[]>([])
  const [selectedParts, setSelectedParts] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [cartCount, setCartCount] = useState(0)
  const [cartPartQuantities, setCartPartQuantities] = useState<Record<number, number>>({})

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

  /* FETCH PARTS */

  useEffect(() => {

    const fetchParts = async () => {

      try {

        const positionFilter = partPosition != null
          ? `&partPosition=${encodeURIComponent(String(partPosition))}`
          : ""

        const res = await fetch(
          `/api/parts/by-assembly?modelId=${modelId}&assemblyId=${assemblyId}${positionFilter}`
        )

        if (!res.ok) {
          console.error("API error:", res.status)
          setParts([])
          return
        }

        const text = await res.text()

        let data: Part[] = []

        try {
          data = JSON.parse(text)
        } catch {
          console.error("Invalid JSON:", text)
          data = []
        }

        setParts(data)

        const qty: Record<number, number> = {}
        const rem: Record<number, string> = {}

        data.forEach((part: Part) => {
          qty[part.id] = 1
          rem[part.id] = ""
        })

        setQuantities(qty)
        setRemarks(rem)

      } catch (err) {
        console.error("Fetch error:", err)
        setParts([])
      }

    }

    fetchParts()
    fetchCart()

  }, [assemblyId, modelId, partPosition])

  const getAvailableStock = (part: Part) =>
    Math.max(0, part.stockQuantity - (cartPartQuantities[part.id] ?? 0))

  /* SELECT PART */

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

  /* QUANTITY CONTROL */

  const changeQty = (id: number, delta: number) => {

    const part = parts.find(p => p.id === id)
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

  /* ADD TO CART */

  const addSelectedToCart = async () => {

    if (selectedParts.length === 0) {
      alert("Please select parts")
      return
    }

    try {

      for (const partId of selectedParts) {

        const part = parts.find((item) => item.id === partId)
        if (!part) continue

        const qty = quantities[partId] || 1
        const availableStock = getAvailableStock(part)

        if (availableStock <= 0) {
          alert(`${part.partName} is out of stock`)
          return
        }

        if (qty > availableStock) {
          alert(`Only ${availableStock} items available for ${part.partName}`)
          return
        }

        await axios.post("/cart/add", {
          PartId: partId,
          Quantity: qty
        })

      }

      await fetchCart()
      navigate("/checkout")

    } catch (error: any) {

      alert(error.response?.data || "Failed to add items to cart")

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
            title="Home"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button
            className="nav-icon-btn"
            title="Contact"
          >
            <FaPhoneAlt />
          </button>

          <button
            className="nav-icon-btn cart-btn"
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

      <h2 className="assembly-title">
        {assemblyName}
        {partPosition != null ? ` - Hotspot ${partPosition}` : ""}
      </h2>

      <div className="parts-actions">

        <button
          disabled={!selectedParts.length}
          onClick={addSelectedToCart}
        >
          Add Selected To Cart
        </button>

      </div>

      <div className="parts-table">

        <table>

          <thead>

            <tr>
              <th>Select</th>
              <th>Part Number</th>
              <th>Part Name</th>
              <th>Available Stock</th>
              <th>Remarks</th>
              <th>Quantity</th>
            </tr>

          </thead>

          <tbody>

            {parts.length === 0 && (
              <tr>
                <td colSpan={6} className="no-data">
                  No parts available
                </td>
              </tr>
            )}

            {parts.map(part => {

              const qty = quantities[part.id] || 1
              const availableStock = getAvailableStock(part)

              return (

                <tr key={part.id} className={availableStock === 0 ? "row-out-stock" : ""}>

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedParts.includes(part.id)}
                      disabled={availableStock === 0}
                      onChange={() => toggleSelect(part)}
                    />

                  </td>

                  <td>{part.partNumber}</td>

                  <td>{part.partName}</td>

                  <td>{availableStock}</td>

                  <td>

                    <input
                      type="text"
                      className="remarks-input"
                      placeholder="Enter remarks"
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
                        disabled={qty <= 1 || availableStock === 0}
                      >
                        -
                      </button>

                      <span>{qty}</span>

                      <button
                        onClick={() => changeQty(part.id, 1)}
                        disabled={qty >= availableStock || availableStock === 0}
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

  )

}

export default SearchParts
