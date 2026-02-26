import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AddToCartPage.css";

interface Part {
  id: number;
  partNumber: string;
  partName: string;
  description?: string;
  price?: number;
}

interface SelectedPart {
  quantity: number;
}

const AddToCartPage: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<Record<number, SelectedPart>>({});
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async (): Promise<void> => {
    try {
      const res = await axios.get<Part[]>("http://localhost:5176/api/parts");
      setParts(res.data);
    } catch (error) {
      console.error("Error loading parts:", error);
    }
  };

  const handleCheckbox = (partId: number): void => {
    setSelectedParts((prev) => {
      const updated = { ...prev };
      if (updated[partId]) {
        delete updated[partId];
      } else {
        updated[partId] = { quantity: 1 };
      }
      return updated;
    });
  };

  const handleQuantityChange = (partId: number, qty: number): void => {
    setSelectedParts((prev) => ({
      ...prev,
      [partId]: { quantity: qty }
    }));
  };

  const addToCart = async (): Promise<void> => {
    const userId = 1; // Replace with logged-in user ID

    try {
      for (const partId in selectedParts) {
        const item = selectedParts[Number(partId)];
        await axios.post(
          `http://localhost:5176/api/cart/add`,
          {},
          {
            params: {
              userId,
              partId: Number(partId),
              quantity: item.quantity
            }
          }
        );
      }

      alert("Items added to cart");
      setCartCount(cartCount + Object.keys(selectedParts).length);
      setSelectedParts({});
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  return (
    <div className="container-fluid mt-3">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3 header-bar">
        <h5 className="text-white m-0">Electronic Parts Catalog</h5>
        <div className="cart-icon">
          🛒 <span className="badge bg-danger">{cartCount}</span>
        </div>
      </div>

      <div className="row">

        {/* LEFT IMAGE SECTION */}
        <div className="col-md-4 image-section">
          <img
            src="/bike-parts.png"
            alt="Bike Parts"
            className="img-fluid"
          />
        </div>

        {/* RIGHT TABLE SECTION */}
        <div className="col-md-8">
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-primary text-center">
                <tr>
                  <th>Select</th>
                  <th>Item No</th>
                  <th>Part No</th>
                  <th>Description</th>
                  <th>Reqd Qty</th>
                  <th>Ordered Qty</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part, index) => (
                  <tr key={part.id}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={!!selectedParts[part.id]}
                        onChange={() => handleCheckbox(part.id)}
                      />
                    </td>

                    <td className="text-center">{index + 1}</td>

                    <td>{part.partNumber}</td>

                    <td>{part.partName}</td>

                    <td className="text-center">1</td>

                    <td>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={selectedParts[part.id]?.quantity || 1}
                        disabled={!selectedParts[part.id]}
                        onChange={(e) =>
                          handleQuantityChange(
                            part.id,
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-success mt-2"
              onClick={addToCart}
              disabled={Object.keys(selectedParts).length === 0}
            >
              Add Selected to Cart
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AddToCartPage;