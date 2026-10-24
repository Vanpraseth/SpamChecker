import { NavLink, Route, Routes } from "react-router-dom";
import SpamDetection from "../pages/SpamDetection";
import Home from "../pages/Home";
import About from "../pages/About.jsx";
import "./App.css";

export default function App() {
    return (
        <div className="app-shell">
            <header className="nav">
                <NavLink className="brand" to="/" aria-label="SpamChecker analyzer">
                    <img src={`${import.meta.env.BASE_URL}spamchecker-logo.svg`} alt="" />
                    <span>SpamChecker</span>
                </NavLink>
                <nav className="links" aria-label="Main navigation">
                    <NavLink to="/" end>
                        Home
                    </NavLink>
                    <NavLink to="/analyzer">
                        Analyzer
                    </NavLink>
                    <NavLink to="/about">About</NavLink>
                </nav>
            </header>

            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/analyzer" element={<SpamDetection />} />
                    <Route path="/about" element={<About />} />
                </Routes>
            </main>
        </div>
    );
}
