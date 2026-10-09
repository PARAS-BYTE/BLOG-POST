import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, ShieldCheck } from 'lucide-react';

/**
 * Footer Component
 * Classic, clean, light-colored footer displaying UTSANOVA company details.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 mt-auto text-slate-600 dark:text-slate-400 text-sm transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-100 dark:border-slate-800/80">
          
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 dark:text-slate-100 text-base">
              <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs">U</span>
              UTSANOVA TECHNOLOGIES PVT. LTD.
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Empowering technology enthusiasts and engineers with insights, tutorials, and deep dives into modern software engineering.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-blue-600 transition">
                  Published Articles
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-blue-600 transition">
                  Admin Login Portal
                </Link>
              </li>
              <li>
                <Link to="/admin/register" className="hover:text-blue-600 transition">
                  Admin Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact / Verification */}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-3">Contact & Details</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <a 
                  href="https://about.utsanova.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  www.about.utsanova.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <a 
                  href="mailto:hr@utsanova.com" 
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  hr@utsanova.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400 dark:text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Protected Role-Based System</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <p>© {currentYear} UTSANOVA TECHNOLOGIES PVT. LTD. All rights reserved.</p>
          <p className="text-slate-400 dark:text-slate-500">Version 1.0 • Blog Management System</p>
        </div>

      </div>
    </footer>
  );
}
