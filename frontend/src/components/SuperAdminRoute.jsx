import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchCurrentUser } from '../services/api';
import { Loader2 } from 'lucide-react';

/**
 * SuperAdminRoute Guard
 * Ensures only authenticated users with 'superadmin' role can access the SuperAdmin Panel.
 * Non-superadmins are redirected to the standard /admin/dashboard.
 * Unauthenticated users are redirected to /admin/login.
 */
export default function SuperAdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  const storedRole = localStorage.getItem('adminRole');
  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(storedRole === 'superadmin');

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }

    const verifyRole = async () => {
      try {
        const user = await fetchCurrentUser();
        if (user.role === 'superadmin' && user.status !== 'revoked' && user.isActive !== false) {
          localStorage.setItem('adminRole', user.role);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        // If token invalid or revoked
        setIsAuthorized(false);
      } finally {
        setChecking(false);
      }
    };

    verifyRole();
  }, [token]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (checking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">Verifying SuperAdministrator Credentials...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
