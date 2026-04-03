import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/auth/AuthContext";
import BatchProvider from "./context/batch/BatchState";
import AlertProvider from "./context/alert/AlertState";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AlertProvider>
        <BatchProvider>
          <App />
        </BatchProvider>
      </AlertProvider>
    </AuthProvider>
  </React.StrictMode>
);
