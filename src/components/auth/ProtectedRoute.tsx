// ============================================
// ProtectedRoute - Protección de rutas por autenticación y permisos
// RBAC Enforcement con 5 roles
// 
// SECURITY NOTE: Client-side route protection for UX only.
// Actual security: RLS policies, has_role() DB function, Edge Functions auth.
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Permission, AppRole, ROLE_DISPLAY_NAMES } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: AppRole;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  allowedRoles
}) => {
  const { isAuthenticated, loading, hasPermission, hasRole, hasAnyRole, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied role={role} detail={`Permiso requerido: ${requiredPermission}`} />;
  }

  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied role={role} detail={`Rol requerido: ${ROLE_DISPLAY_NAMES[requiredRole] || requiredRole}`} />;
  }

  // Check allowed roles list
  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    const allowed = allowedRoles.map(r => ROLE_DISPLAY_NAMES[r] || r).join(', ');
    return <AccessDenied role={role} detail={`Roles permitidos: ${allowed}`} />;
  }

  return <>{children}</>;
};

function AccessDenied({ role, detail }: { role: string | null; detail: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-destructive mb-4">Acceso Denegado</h2>
        <p className="text-muted-foreground mb-4">
          No tienes permiso para acceder a esta sección.
        </p>
        <p className="text-sm text-muted-foreground">
          Tu rol: <span className="font-semibold">{role ? (ROLE_DISPLAY_NAMES[role] || role) : 'Sin rol'}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">{detail}</p>
      </div>
    </div>
  );
}

export default ProtectedRoute;
