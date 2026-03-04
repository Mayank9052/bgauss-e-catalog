import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./carts.css";
import logo from "./assets/logo.jpg";
import GlobalSearch from "./components/GlobalSearch";

interface CartItem {
  cartItemId: number;
  partName: string;
  partNumber: string;
  quantity: number;
}

const EpcCartPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const userId = 1;
  const navigate = useNavigate();

  const fetchCart = async () => {
    const response = await axios.get(
      `http://localhost:5053/api/cart/${userId}`
    );
    setItems(response.data.items || []);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /* ================= UPDATE QUANTITY ================= */

  const updateQuantity = async (id: number, qty: number) => {
    if (qty < 1) return;

    await axios.put(
      `http://localhost:5053/api/cart/update/${id}?quantity=${qty}`
    );

    fetchCart();
  };

  /* ================= REMOVE SINGLE ================= */

  const removeItem = async (id: number) => {
    await axios.delete(`http://localhost:5053/api/cart/${id}`);
    fetchCart();
  };

  /* ================= REMOVE SELECTED ================= */

  const removeSelected = async () => {

    for (const id of selectedItems) {
      await axios.delete(`http://localhost:5053/api/cart/${id}`);
    }

    setSelectedItems([]);
    fetchCart();
  };

  /* ================= CLEAR CART ================= */

  const clearCart = async () => {

    for (const item of items) {
      await axios.delete(
        `http://localhost:5053/api/cart/${item.cartItemId}`
      );
    }

    fetchCart();
  };

  /* ================= SELECT LOGIC ================= */

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map((i) => i.cartItemId));
    } else {
      setSelectedItems([]);
    }
  };

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;

  const currentItems = items.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(items.length / rowsPerPage);

  /* ================= ADD TO CART ================= */

  const addToCart = async (partNumber: string) => {

    await axios.post(
      `http://localhost:5053/api/cart/add`,
      {
        userId: userId,
        partNumber: partNumber,
        quantity: 1
      }
    );

    fetchCart();
  };

  return (
    <>
      {/* NAVBAR */}

      <nav className="epc-navbar">

        <div className="epc-brand">
          <img src={logo} alt="Logo" />
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="epc-nav-right">
          <span onClick={() => navigate("/dashboard")}>Home</span>
          <span>Contact Us</span>
          <GlobalSearch />
          <span>👤</span>
          <span>🛒</span>
        </div>

      </nav>

      {/* MAIN LAYOUT */}

      <div className="epc-container">

        {/* LEFT IMAGE PANEL */}

        <div className="epc-left">

          {selectedImage ? (
            <img src={selectedImage} alt="Part" />
          ) : (
            <div className="image-placeholder">
              Select a part to preview
            </div>
          )}

        </div>

        {/* RIGHT CONTENT */}

        <div className="epc-right">

          {/* ACTION BUTTONS */}

          <div className="cart-actions">

            <button
              onClick={removeSelected}
              disabled={!selectedItems.length}
            >
              Remove Selected
            </button>

            <button
              onClick={clearCart}
              disabled={!items.length}
            >
              Clear Cart
            </button>

          </div>

          {/* TABLE TOP BAR */}

          <div className="table-top-bar">

            <div>
              Select Rows:

              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>

            </div>

            <div className="pagination-top">

              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => (

                <button
                  key={i}
                  className={
                    currentPage === i + 1
                      ? "page-btn active-page"
                      : "page-btn"
                  }
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>

              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                →
              </button>

            </div>

          </div>

          {/* TABLE */}

          <table className="epc-table">

            <thead>

              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      selectAll(e.target.checked)
                    }
                  />
                </th>

                <th>Item No</th>
                <th>Part No</th>
                <th>Description</th>
                <th>Reqd Qty</th>
                <th>Ordered Qty</th>
                <th>Action</th>
                <th>Add</th>
              </tr>

            </thead>

            <tbody>

              {currentItems.map((item, index) => (

                <tr
                  key={item.cartItemId}
                  onClick={() =>
                    setSelectedImage(`/images/${item.partNumber}.jpg`)
                  }
                >

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.cartItemId)}
                      onChange={() =>
                        toggleSelect(item.cartItemId)
                      }
                    />

                  </td>

                  <td>{indexOfFirst + index + 1}</td>

                  <td>{item.partNumber}</td>

                  <td>{item.partName}</td>

                  <td>1</td>

                  <td>

                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      className="qty-input"
                      onChange={(e) =>
                        updateQuantity(
                          item.cartItemId,
                          Number(e.target.value)
                        )
                      }
                    />

                  </td>

                  <td>

                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.cartItemId);
                      }}
                    >
                      🗑
                    </button>

                  </td>

                  <td>

                    <button
                      className="add-cart-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item.partNumber);
                      }}
                    >
                      Add
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {/* CHECKOUT BUTTON */}

          <div className="checkout-container">

            <button
              className="checkout-btn"
              disabled={!items.length}
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>

          </div>

        </div>

      </div>

    </>
  );
};

export default EpcCartPage;