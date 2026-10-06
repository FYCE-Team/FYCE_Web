import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/global.css";
import "./index.css";

import App from "./App.jsx";
import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "./styles/concert.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
