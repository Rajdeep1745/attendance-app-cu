import { useState, useCallback } from "react";
import BatchContext from "./BatchContext";

const BatchState = ({ children }) => {
  const [activeBatch, setActiveBatch] = useState(null);

  const fetchBatchById = useCallback(async (id) => {
    if (!id) {
      setActiveBatch(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/batches/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch batch");
      }

      setActiveBatch(data);
    } catch (err) {
      console.error("Error fetching batch:", err);
    }
  }, []);

  return (
    <BatchContext.Provider
      value={{ activeBatch, setActiveBatch, fetchBatchById }}
    >
      {children}
    </BatchContext.Provider>
  );
};

export default BatchState;
