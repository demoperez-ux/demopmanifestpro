import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { printZenithSignature } from "./lib/zenithSignature";

// ZENITH Architectural Signature
printZenithSignature();

createRoot(document.getElementById("root")!).render(<App />);
