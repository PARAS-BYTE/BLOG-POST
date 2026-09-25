import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogin } from '../services/api';
import { Lock, Mail, ArrowLeft, Shield, AlertCircle } from 'lucide-react';

/**
 * AdminLogin Page
 * Secure login portal for authorized blog administrators.
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
      // Store token securely in localStorage
      localStorage.setItem('adminToken', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to auto-fill default admin credentials for testing
  const fillDefaultCredentials = () => {
    setEmail('admin@utsanova.com');
    setPassword('AdminSecurePassword123');
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
            Authorized access only. Enter your admin credentials to manage content.
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
                placeholder="admin@utsanova.com"
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
              'Sign In as Admin'
            )}
          </button>
        </form>

        {/* Demo Credentials Helper Pill */}
        <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-700">Quick Test Credentials:</span>
            <div className="text-[11px] text-slate-500">admin@utsanova.com</div>
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="text-xs bg-white border border-slate-200 hover:border-blue-400 text-blue-600 font-medium px-2.5 py-1 rounded transition shadow-2xs"
          >
            Auto-fill
          </button>
        </div>

        {/* Sign Up Redirect */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Need an administrator account?{' '}
          <Link to="/admin/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Create Admin Account
          </Link>
        </div>

      </div>
    </div>
  );
}