import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// @ts-ignore
import "./styles.css";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
