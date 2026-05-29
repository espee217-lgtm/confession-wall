import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import {
  applyPerformanceMode,
  getSavedPerformanceMode,
  setSavedPerformanceMode,
} from "./utils/performanceMode";
import "./AppStyle.css";
import "./styles/cosmetic-animations.css";

const initialPerformanceMode = getSavedPerformanceMode();
setSavedPerformanceMode(initialPerformanceMode);
applyPerformanceMode(initialPerformanceMode);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
