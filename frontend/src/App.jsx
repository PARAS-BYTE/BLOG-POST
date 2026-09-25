import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import BlogDetail from './pages/BlogDetail';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Main Application Component
 * Sets up routing, top navigation bar, main view area, and footer.
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased font-sans">
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/blog/:id" element={<BlogDetail />} />

            {/* Admin Authentication Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />

            {/* Protected Admin Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;