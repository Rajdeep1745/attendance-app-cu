import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import BatchProvider from "./context/batch/BatchState";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BatchProvider>
      <App />
    </BatchProvider>
  </React.StrictMode>
);
