import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

const Router = import.meta.env.VITE_DEMO_MODE === "true" ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Router>
            <App />
        </Router>
    </StrictMode>
);
