import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";


// PWA (safe; no-op in dev unless you want it)
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });


const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:needRefresh"));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa:offlineReady"));
  },
});

(window as any).__pwaUpdateSW = updateSW;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


