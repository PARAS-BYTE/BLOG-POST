import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BlogDetail from './pages/BlogDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
        </Routes>
        <footer className="text-center py-6 text-sm text-gray-500 border-t bg-white">
          Utsanova Blog Management System © 2026
        </footer>
      </div>
    </Router>
  );
}

export default App;