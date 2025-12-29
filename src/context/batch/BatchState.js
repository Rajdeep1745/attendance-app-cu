import { useState } from "react";
import BatchContext from "./BatchContext";

const BatchState = ({ children }) => {
  const [activeBatch, setActiveBatch] = useState(null);

  return (
    <BatchContext.Provider value={{ activeBatch, setActiveBatch }}>
      {children}
    </BatchContext.Provider>
  );
};

export default BatchState;

