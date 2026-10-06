import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogin } from '../services/api';
import { Lock, Mail, ArrowLeft, Shield, AlertCircle, Crown, UserCheck } from 'lucide-react';

/**
 * AdminLogin Page
 * Secure sign-in portal for SuperAdmin and authorized administrators.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await adminLogin({ email: email.trim(), password });
      // Store token, role, and permissions securely in localStorage
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminRole', data.role || 'admin');
      localStorage.setItem('adminEmail', data.email);
      localStorage.setItem('adminStatus', data.status || 'active');
      localStorage.setItem('adminPermissions', JSON.stringify(data.permissions || {}));
      if (data.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to auto-fill SuperAdmin credentials
  const fillSuperAdminCredentials = () => {
    setEmail('superadmin@utsanova.com');
    setPassword('superadmin@1234');
    setError('');
  };

  // Helper function to auto-fill regular Admin credentials
  const fillAdminCredentials = () => {
    setEmail('admin@utsanova.com');
    setPassword('admin@1234');
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to public blog
          </Link>
          
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Portal Sign In</h1>
          </div>
          <p className="text-xs text-slate-500">
            Sign in as SuperAdmin or Administrator to manage articles and automated scheduling.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3.5 mb-5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@utsanova.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying Credentials...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Quick Autofill Selector */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Quick Test Accounts (Auto-fill)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillSuperAdminCredentials}
              className="flex items-center justify-center gap-1.5 p-2 bg-white border border-amber-200 hover:border-amber-300 hover:bg-amber-50/50 rounded-lg text-xs font-semibold text-amber-900 transition cursor-pointer shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" /> SuperAdmin
            </button>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="flex items-center justify-center gap-1.5 p-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Admin
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
            • <strong>SuperAdmin</strong> can create & manage admin accounts and schedule blogs.<br/>
            • <strong>Admin</strong> can create, edit, and schedule blogs.
          </p>
        </div>

      </div>
    </div>
  );
}