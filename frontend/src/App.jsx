import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import WebSearch from "./pages/WebSearch";
import DeepSearch from "./pages/DeepSearch";
import Chat from "./pages/Chat";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {/* <nav className="bg-gray-800 text-white p-4">
          <ul className="flex space-x-4">
            <li>
              <Link to="/" className="hover:underline">Home</Link>
            </li>
            <li>
              <Link to="/search" className="hover:underline">Web Search</Link>
            </li>
          </ul>
        </nav> */}

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<DeepSearch />} />
            <Route path="/search" element={<WebSearch />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<div>Not Found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
