import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminRegister } from '../services/api';
import { Lock, Mail, ArrowLeft, UserPlus } from 'lucide-react';

export default function AdminRegister() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await adminRegister({ email, password });
            localStorage.setItem('adminToken', data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
                <div className="mb-6">
                    <Link to="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Public site
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Signup</h2>
                    <p className="text-sm text-gray-500">Create a new administrator account.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700 mb-4 rounded-r">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="newadmin@utsanova.com"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" /> {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an admin account?{' '}
                    <Link to="/admin/login" className="text-blue-600 hover:underline font-medium">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}