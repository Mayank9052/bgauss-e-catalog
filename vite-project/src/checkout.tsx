import { useEffect, useState } from "react";
import axios from "axios";
import "./checkout.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";

interface CartItem {
  cartItemId: number;
  partName: string;
  partNumber: string;
  price: number;
  quantity: number;
  subTotal: number;
}

const CheckoutPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();
  const userId = 1;

  const fetchCart = async () => {
    const res = await axios.get(
      `http://localhost:5053/api/cart/${userId}`
    );

    setItems(res.data.items || []);
    setTotal(res.data.totalAmount || 0);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = (id: number, value: number) => {

    setItems(prev =>
      prev.map(item =>
        item.cartItemId === id
          ? { ...item, quantity: value, subTotal: item.price * value }
          : item
      )
    );

  };

  const removeItem = (id: number) => {

    setItems(prev =>
      prev.filter(item => item.cartItemId !== id)
    );

  };

  return (

    <div className="checkout-wrapper">

      {/* NAVBAR */}

      <nav className="checkout-navbar">

        <div className="brand">
          <img src={logo} alt="logo" />
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="nav-links">
          <span onClick={() => navigate("/dashboard")}>Home</span>
          <span>Contact Us</span>
          <span>🔍</span>
          <span>👤</span>
          <span>🛒</span>
        </div>

      </nav>

      <div className="checkout-container">

        <h2>Cart</h2>

        {/* TABLE */}

        <table className="checkout-table">

          <thead>
            <tr>
              <th></th>
              <th>Product Image</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
            </tr>
          </thead>

          <tbody>

            {items.map(item => (

              <tr key={item.cartItemId}>

                <td>
                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item.cartItemId)}
                  >
                    ×
                  </button>
                </td>

                <td>
                  <img
                    src="/placeholder.png"
                    className="product-img"
                    alt="product"
                  />
                </td>

                <td>{item.partNumber}</td>

                <td>₹{item.price}</td>

                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    min={1}
                    className="qty-box"
                    onChange={(e) =>
                      updateQuantity(
                        item.cartItemId,
                        Number(e.target.value)
                      )
                    }
                  />
                </td>

                <td>₹{item.subTotal}</td>

              </tr>

            ))}

          </tbody>

        </table>

        {/* ACTION BUTTONS */}

        <div className="checkout-actions">

          <button className="empty-btn">Empty Cart</button>

          <button className="btn">Update Cart</button>

          <button
            className="btn"
            onClick={() => navigate("/parts")}
          >
            Shop More
          </button>

          <button className="btn">
            Download Cart as PDF
          </button>

          <button className="btn">
            Download Cart Data as CSV
          </button>

          <div className="total-box">
            Total Sum: ₹{total}
          </div>

        </div>

      </div>

    </div>

  );

};

export default CheckoutPage;