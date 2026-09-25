import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LogOut, Moon } from 'lucide-react';

/**
 * Navbar Component
 * Styled with UTSANOVA's signature navy branding matching the official corporate identity.
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <header className="bg-[#0B132B] border-b border-slate-800/80 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        
        {/* UTSANOVA Official Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          {/* Stylized Logo Icon with cyber dot effect */}
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-extrabold text-xl tracking-tighter">
              U
            </div>
            {/* Ambient spark dots */}
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          </div>

          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-white leading-none">
              UTSAN<span className="text-blue-400">OVA</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold mt-0.5">
              Technologies
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium">
          <Link
            to="/"
            className={`transition px-3 py-1.5 rounded-lg ${
              location.pathname === '/'
                ? 'text-white bg-white/10'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </Link>

          <a
            href="https://about.utsanova.com"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-block text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Services
          </a>

          <a
            href="https://about.utsanova.com"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-block text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Portfolio
          </a>

          <a
            href="mailto:hr@utsanova.com"
            className="hidden lg:inline-block text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Careers
          </a>

          {/* Admin Link / Status */}
          {token ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
                className="text-xs font-medium text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                title="Sign out of admin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-blue-400 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Admin Portal
            </Link>
          )}

          {/* Dark / Moon Icon as seen in reference image */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer">
            <Moon className="w-4 h-4" />
          </div>
        </nav>

      </div>
    </header>
  );
}
