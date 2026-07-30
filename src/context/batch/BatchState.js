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

  const fetchBatchBySubject = useCallback(async (subjectId) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/batches/subject/${subjectId}`,
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

      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  return (
    <BatchContext.Provider
      value={{
        activeBatch,
        setActiveBatch,
        fetchBatchById,
        fetchBatchBySubject,
      }}     
    >
      {children}
    </BatchContext.Provider>
  );
};

export default BatchState;
