import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentDoctor, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-[#002d74] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-600 font-medium text-sm">กำลังโหลดข้อมูลระบบ...</p>
      </div>
    );
  }

  if (!currentDoctor) {
    return <Navigate to="/" replace />;
  }

  const userRoles = currentDoctor.roles || [];
  const hasRole = !allowedRoles || allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role));

  if (!hasRole) {
    // If user is medical admin, allow viewing all doctor pages or fallback safely
    if (userRoles.includes('ADMIN') || userRoles.includes('MEDICAL_ADMIN')) {
      return children; // Admins can view all pages
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
