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
  imagePath?: string | null;
  quantity: number;
}

const EpcCartPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedPreviewItemId, setSelectedPreviewItemId] = useState<number | null>(null);

  const navigate = useNavigate();
  const fallbackImage = "/vite.svg";

  const resolvePartImage = (item: Pick<CartItem, "imagePath" | "partNumber">) => {
    const baseUrl = "http://localhost:5053";

    if (item.imagePath && item.imagePath.trim().length > 0) {
      if (item.imagePath.startsWith("http://") || item.imagePath.startsWith("https://")) {
        return item.imagePath;
      }

      const normalized = item.imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const fromImagesFolder = normalized.startsWith("images/")
        ? normalized
        : `images/${normalized}`;

      return `${baseUrl}/${fromImagesFolder}`;
    }

    return `${baseUrl}/images/${item.partNumber}.jpg`;
  };

  /* ================= FETCH CART ================= */

  const fetchCart = async () => {
    try {
      const response = await axios.get("/cart/my-cart");

      const normalizedItems: CartItem[] = (response.data.items || []).map((item: any) => ({
        cartItemId: item.cartItemId ?? item.id,
        partName: item.partName,
        partNumber: item.partNumber,
        imagePath: item.imagePath ?? null,
        quantity: item.quantity
      }));

      setItems(normalizedItems);
      setSelectedPreviewItemId((prev) => {
        if (!normalizedItems.length) return null;
        if (prev && normalizedItems.some((item) => item.cartItemId === prev)) {
          return prev;
        }
        return normalizedItems[0].cartItemId;
      });
    } catch (error) {
      console.error("Failed to fetch cart", error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /* ================= UPDATE QUANTITY ================= */

  const updateQuantity = async (id: number, qty: number) => {
    try {
      if (qty < 1) return;

      if (!id) return;

      await axios.put(`/cart/update/${id}?quantity=${qty}`);

      fetchCart();
    } catch (error) {
      console.error("Failed to update quantity", error);
    }
  };

  /* ================= REMOVE SINGLE ================= */

  const removeItem = async (id: number) => {
    try {
      if (!id) return;

      await axios.delete(`/cart/remove/${id}`);

      fetchCart();
    } catch (error) {
      console.error("Failed to remove item", error);
    }
  };

  /* ================= REMOVE SELECTED ================= */

  const removeSelected = async () => {
    try {
      for (const id of selectedItems) {

        if (!id) continue;
        await axios.delete(`/cart/remove/${id}`);

      }

      setSelectedItems([]);
      fetchCart();
    } catch (error) {
      console.error("Failed to remove selected items", error);
    }
  };

  /* ================= CLEAR CART ================= */

  const clearCart = async () => {
    try {
      await axios.delete("/cart/empty");

      fetchCart();
    } catch (error) {
      console.error("Failed to clear cart", error);
    }
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
  const selectedPreviewItem = items.find((item) => item.cartItemId === selectedPreviewItemId) || null;
  const selectedImage = selectedPreviewItem ? resolvePartImage(selectedPreviewItem) : null;

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
            <img
              src={selectedImage}
              alt="Part"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackImage;
              }}
            />
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

              </tr>

            </thead>

            <tbody>

              {currentItems.map((item, index) => (

                <tr
                  key={item.cartItemId}
                  onClick={() => setSelectedPreviewItemId(item.cartItemId)}
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
