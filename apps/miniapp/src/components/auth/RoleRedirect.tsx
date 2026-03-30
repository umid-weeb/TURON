import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../lib/role';
import { UserRoleEnum } from '@turon/shared';

export const RoleRedirect: React.FC = () => {
  const { isAuthenticated, role } = useRole();

  if (!isAuthenticated || !role) {
    return <Navigate to="/" replace />;
  }

  if (role === UserRoleEnum.ADMIN) return <Navigate to="/admin" replace />;
  if (role === UserRoleEnum.COURIER) return <Navigate to="/courier" replace />;
  return <Navigate to="/customer" replace />;
};
