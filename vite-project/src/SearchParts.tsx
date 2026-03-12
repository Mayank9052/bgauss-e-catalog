import "./searchparts.css"
import logo from "./assets/logo.jpg"
import { useLocation,useNavigate } from "react-router-dom"
import { useState,useEffect } from "react"
import axios from "axios"
import AccountMenu from "./components/AccountMenu"
import type { Part } from "./services/api"

const SearchParts = () => {

  const location = useLocation()
  const navigate = useNavigate()

  const { modelId, assemblyId, assemblyName, partPosition } = location.state || {}

  const [parts,setParts] = useState<Part[]>([])
  const [selectedParts,setSelectedParts] = useState<number[]>([])
  const [quantities,setQuantities] = useState<Record<number,number>>({})
  const [cartCount,setCartCount] = useState(0)

  /* FETCH PARTS */

  useEffect(()=>{

    const fetchParts = async()=>{

      const positionFilter = partPosition != null
        ? `&partPosition=${encodeURIComponent(String(partPosition))}`
        : ""

      const res = await fetch(
        `/api/parts/by-assembly?modelId=${modelId}&assemblyId=${assemblyId}${positionFilter}`
      )
      const data = await res.json()

      setParts(data)

      const qty:Record<number,number> = {}
      data.forEach((p:Part)=>qty[p.id]=1)

      setQuantities(qty)

    }

    fetchParts()

  },[assemblyId, modelId, partPosition])

  /* FETCH CART COUNT */

  useEffect(()=>{

    const fetchCart = async()=>{

      try{

        const res = await axios.get("/cart/my-cart")

        if(res.data?.items){
          setCartCount(res.data.items.length)
        }

      }catch{}

    }

    fetchCart()

  },[])

  /* SELECT PART */

  const toggleSelect=(part:Part)=>{

    if(part.stockQuantity===0){
      alert(`⚠ ${part.partName} is Out of Stock`)
      return
    }

    setSelectedParts(prev=>{

      if(prev.includes(part.id))
        return prev.filter(x=>x!==part.id)

      return [...prev,part.id]

    })

  }

  /* QUANTITY CONTROL */

  const changeQty=(id:number,delta:number)=>{

    const part = parts.find(p=>p.id===id)
    if(!part) return

    setQuantities(prev=>{

      const currentQty = prev[id] || 1
      const newQty = currentQty + delta

      if(newQty < 1) return prev

      if(newQty > part.stockQuantity){
        alert(`⚠ Only ${part.stockQuantity} items available`)
        return prev
      }

      return{
        ...prev,
        [id]:newQty
      }

    })

  }

  /* ADD TO CART */

  const addSelectedToCart = async()=>{

    if(selectedParts.length===0){
      alert("Please select parts")
      return
    }

    try{

      for(const partId of selectedParts){

        const qty = quantities[partId] || 1

        await axios.post("/cart/add",{
          PartId:partId,
          Quantity:qty
        })

      }

      navigate("/checkout")

    }catch{

      alert("Failed to add items to cart")

    }

  }

  return(

    <div className="catalog-wrapper">

      {/* NAVBAR */}

      <nav className="catalog-navbar">

        <div className="brand">

          <img src={logo} className="nav-logo"/>

          <span>Electronic Parts Catalog</span>

        </div>

        <div className="nav-right">

          <button
            className="back-button"
            onClick={()=>navigate(-1)}
          >
            ← Back
          </button>

          <div
            className="cart-icon"
            onClick={()=>navigate("/checkout")}
          >
            🛒
            {cartCount>0 &&
              <span className="cart-badge">
                {cartCount}
              </span>
            }
          </div>

          <AccountMenu/>

        </div>

      </nav>

      {/* PAGE TITLE */}

      <h2 className="assembly-title">
        {assemblyName}
        {partPosition != null ? ` - Hotspot ${partPosition}` : ""}
      </h2>

      {/* ACTION BUTTON */}

      <div className="parts-actions">

        <button
          disabled={!selectedParts.length}
          onClick={addSelectedToCart}
        >
          Add Selected To Cart
        </button>

      </div>

      {/* PARTS TABLE */}

      <div className="parts-table">

        <table>

          <thead>

            <tr>
              <th>Select</th>
              <th>Part Number</th>
              <th>Part Name</th>
              <th>Stock</th>
              <th>Quantity</th>
            </tr>

          </thead>

          <tbody>

            {parts.map(part=>{

              const qty = quantities[part.id] || 1

              return(

                <tr key={part.id} className={part.stockQuantity===0 ? "row-out-stock" : ""}>

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedParts.includes(part.id)}
                      disabled={part.stockQuantity===0}
                      onChange={()=>toggleSelect(part)}
                    />

                  </td>

                  <td>{part.partNumber}</td>

                  <td>{part.partName}</td>

                  {/* STOCK DIGITS ONLY */}

                  <td className={part.stockQuantity===0 ? "out-stock" : ""}>
                    {part.stockQuantity}
                  </td>

                  {/* QUANTITY */}

                  <td>

                    <div className="qty-control">

                      <button
                        onClick={()=>changeQty(part.id,-1)}
                        disabled={qty <= 1 || part.stockQuantity === 0}
                      >
                        -
                      </button>

                      <span>{qty}</span>

                      <button
                        onClick={()=>changeQty(part.id,1)}
                        disabled={qty >= part.stockQuantity || part.stockQuantity === 0}
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
