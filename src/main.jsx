// USend — application entry point.

import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App.jsx";
import { registerServiceWorker } from "./lib/pwa.js";

const rootElement = document.getElementById("root");
// Keep the root across hot reloads so the page is not torn down in dev.
const root = import.meta.hot
  ? (globalThis.__usendRoot ||= createRoot(rootElement))
  : createRoot(rootElement);
root.render(<App />);

registerServiceWorker();
