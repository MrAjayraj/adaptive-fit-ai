import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
} else {
  // Should never happen, but prevents a completely silent failure
  document.body.innerHTML =
    '<div style="background:#111113;color:#F5C518;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;">Failed to load — missing root element.</div>';
}
