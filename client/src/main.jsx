import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Join from "./pages/Join"; 
import Game from "./pages/Game";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/game/:code" element={<Game />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);