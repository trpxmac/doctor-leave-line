import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentDoctor } = useAuth();

  if (!currentDoctor) {
    return <Navigate to="/" replace />;
  }

  const hasRole = allowedRoles.some(role => currentDoctor.roles.includes(role));

  if (!hasRole) {
    // If not allowed, redirect to a default safe page based on their role
    if (currentDoctor.roles.includes('ADMIN')) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
