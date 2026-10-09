import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LogOut,
  Moon,
  Sun,
  BookOpen,
  Crown,
  Menu,
  X,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Navbar Component (Feature 10: Responsive Mobile Navbar)
 * Adopts UTSANOVA's signature dark navy palette and cyber-accent branding.
 * Fully responsive across desktop, tablet, and mobile with a sleek drawer menu.
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  const token = localStorage.getItem('adminToken');
  const role = localStorage.getItem('adminRole');
  const adminEmail = localStorage.getItem('adminEmail') || '';

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminStatus');
    localStorage.removeItem('adminPermissions');
    setMobileMenuOpen(false);
    navigate('/admin/login');
  };

  return (
    <header className="bg-[#0B132B] dark:bg-[#070b18] border-b border-slate-800 sticky top-0 z-40 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        
        {/* UTSANOVA Official Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center">
            {/* Gradient Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-extrabold text-xl group-hover:scale-105 transition-transform">
              U
            </div>
            {/* Glowing dot accent */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
          </div>

          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-white leading-none">
              UTSAN<span className="text-blue-400">OVA</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold mt-0.5">
              Engineering Blog
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className={`transition px-3.5 py-1.5 rounded-full text-sm ${
              location.pathname === '/' && !location.search.includes('sort=popular')
                ? 'text-white bg-white/10 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Articles
          </Link>

          <Link
            to="/?sort=popular"
            className={`transition px-3.5 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
              location.search.includes('sort=popular')
                ? 'text-amber-300 bg-amber-500/20 font-semibold'
                : 'text-slate-300 hover:text-amber-300 hover:bg-white/5'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Popular Posts</span>
          </Link>

          {/* Admin Management Link */}
          {token ? (
            <div className="flex items-center gap-2">
              {role === 'superadmin' && (
                <Link
                  to="/superadmin/dashboard"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                    location.pathname.startsWith('/superadmin')
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40'
                  }`}
                  title="SuperAdministrator Operations Center"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>SuperAdmin Panel</span>
                </Link>
              )}

              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  location.pathname === '/admin/dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-200 bg-white/10 hover:bg-white/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 rounded-full transition flex items-center gap-1 cursor-pointer"
                title="Sign out of admin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-blue-400 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Admin Portal
            </Link>
          )}

          {/* Theme Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-slate-700/60 transition cursor-pointer shadow-2xs group"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Dark and Light Mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-blue-300 group-hover:-rotate-12 transition-transform" />
            )}
          </button>
        </nav>

        {/* Mobile Controls (Theme Toggle + Hamburger) */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-slate-800 transition cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Dark and Light Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-slate-800 transition cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Dropdown Menu (Feature 10) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A1024] border-t border-slate-800/80 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <Link
              to="/"
              className={`px-4 py-2.5 rounded-xl transition flex items-center justify-between ${
                location.pathname === '/' && !location.search.includes('sort=popular')
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                All Articles
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/?sort=popular"
              className={`px-4 py-2.5 rounded-xl transition flex items-center justify-between ${
                location.search.includes('sort=popular')
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Popular Posts
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {/* Mobile Theme Toggle Item */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2.5 rounded-xl transition flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer text-left"
            >
              <span className="flex items-center gap-2">
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
                <span>Theme: <strong className="text-white capitalize">{theme} Mode</strong></span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-semibold">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {token ? (
              <>
                {role === 'superadmin' && (
                  <Link
                    to="/superadmin/dashboard"
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      SuperAdmin Operations
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                <Link
                  to="/admin/dashboard"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Admin Dashboard
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    Signed in as <strong className="text-slate-300">{adminEmail || role}</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
              >
                <Shield className="w-4 h-4 text-blue-200" />
                <span>Admin Portal Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
