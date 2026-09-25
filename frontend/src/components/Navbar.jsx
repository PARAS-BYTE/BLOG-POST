import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Shield, LogOut } from 'lucide-react';

/**
 * Navbar Component
 * Classic, clean, light-colored navigation bar used across the site.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if an admin is currently logged in
  const token = localStorage.getItem('adminToken');
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Handle admin logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 text-slate-900 hover:text-blue-600 transition">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            U
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">
              UTSAN<span className="text-blue-600">OVA</span>
            </span>
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Engineering & Tech Blog
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            to="/"
            className={`text-sm font-medium transition px-3 py-1.5 rounded-md ${
              location.pathname === '/'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Articles
          </Link>

          {/* Show Admin links depending on authentication */}
          {token ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/dashboard"
                className={`text-sm font-medium transition px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
                  location.pathname === '/admin/dashboard'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4 text-blue-600" />
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition flex items-center gap-1"
                title="Log out of admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 border border-slate-300 hover:border-blue-500 px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 bg-white shadow-xs"
            >
              <Shield className="w-4 h-4 text-slate-500" />
              Admin Portal
            </Link>
          )}
        </nav>

      </div>
    </header>
  );
}
