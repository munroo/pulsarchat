import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("capacitor");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
