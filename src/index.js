import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import BatchProvider from "./context/batch/BatchState";
import AlertProvider from "./context/alert/AlertState";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AlertProvider>
      <BatchProvider>
        <App />
      </BatchProvider>
    </AlertProvider>
  </React.StrictMode>
);
