// ============================================
// AuthContext - Proveedor de autenticación y RBAC
// Sistema RBAC con 5 roles: master_admin, senior_broker, it_security, asistente, agente_campo
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Roles del sistema RBAC
export type AppRole = 
  | 'master_admin'    // Superusuario: acceso total
  | 'senior_broker'   // Corredor de aduanas: operaciones completas, firma SIGA, LEXIS
  | 'it_security'     // IT/Seguridad: logs, salud del sistema, gestión de hardware
  | 'asistente'       // Asistente: ingesto LEXIS, lectura/subida de documentos
  | 'agente_campo'    // Agente de campo: PDA (fotos, escaneo)
  // Legacy roles (backward compat)
  | 'operador' | 'revisor' | 'auditor' | 'admin';

// Permisos granulares del sistema
export type Permission = 
  // Ingesto y LEXIS
  | 'cargar_manifiesto'
  | 'subir_documentos'
  | 'ver_documentos'
  // Clasificación y Aranceles
  | 'clasificar_arancelaria'
  | 'reclasificar'
  // Permisos y Gestión
  | 'gestionar_permisos'
  | 'generar_borradores'
  | 'tramitar_pagos'
  | 'ver_resultados'
  | 'solicitar_revision'
  // Firma y Transmisión (Solo Corredor)
  | 'aprobar_liquidacion'
  | 'rechazar_liquidacion'
  | 'firmar_digital'
  | 'transmitir_ana'
  // Reportes y Exportación
  | 'exportar_reportes'
  // Auditoría y Seguridad
  | 'ver_auditoria'
  | 'ver_security_logs'
  | 'verificar_integridad'
  // Administración
  | 'administrar_config'
  | 'administrar_usuarios'
  | 'gestionar_hardware'
  // Billing
  | 'ver_billing'
  | 'gestionar_billing'
  // PDA / Campo
  | 'captura_fotos'
  | 'escaneo_campo';

// ─── Matriz de Permisos por Rol ───────────────────────────
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Superusuario — acceso total
  master_admin: [
    'cargar_manifiesto', 'subir_documentos', 'ver_documentos',
    'clasificar_arancelaria', 'reclasificar',
    'gestionar_permisos', 'generar_borradores', 'tramitar_pagos',
    'ver_resultados', 'solicitar_revision',
    'aprobar_liquidacion', 'rechazar_liquidacion',
    'firmar_digital', 'transmitir_ana',
    'exportar_reportes',
    'ver_auditoria', 'ver_security_logs', 'verificar_integridad',
    'administrar_config', 'administrar_usuarios', 'gestionar_hardware',
    'ver_billing', 'gestionar_billing',
    'captura_fotos', 'escaneo_campo',
  ],
  // Corredor de aduanas — operaciones completas, firma SIGA, LEXIS
  // Sin acceso a Billing ni Gestión de Usuarios
  senior_broker: [
    'cargar_manifiesto', 'subir_documentos', 'ver_documentos',
    'clasificar_arancelaria', 'reclasificar',
    'gestionar_permisos', 'generar_borradores', 'tramitar_pagos',
    'ver_resultados', 'solicitar_revision',
    'aprobar_liquidacion', 'rechazar_liquidacion',
    'firmar_digital', 'transmitir_ana',
    'exportar_reportes',
    'ver_auditoria',
  ],
  // IT/Seguridad — logs, salud del sistema, hardware
  // Sin ver datos sensibles de clientes
  it_security: [
    'ver_resultados',
    'ver_auditoria', 'ver_security_logs', 'verificar_integridad',
    'gestionar_hardware',
    'administrar_usuarios', // solo hardware/BIOS
  ],
  // Asistente — solo ingesto LEXIS (lectura/subida)
  // Bloqueado: transmisión SIGA, finanzas
  asistente: [
    'cargar_manifiesto', 'subir_documentos', 'ver_documentos',
    'clasificar_arancelaria',
    'generar_borradores',
    'ver_resultados',
    'solicitar_revision',
  ],
  // Agente de campo — PDA exclusivo (fotos, escaneo)
  // Bloqueado para el resto del sistema
  agente_campo: [
    'captura_fotos',
    'escaneo_campo',
    'ver_documentos',
  ],
  // ─── Legacy role mappings ───────────────────────────
  admin: [
    'cargar_manifiesto', 'subir_documentos', 'ver_documentos',
    'clasificar_arancelaria', 'reclasificar',
    'gestionar_permisos', 'generar_borradores', 'tramitar_pagos',
    'ver_resultados', 'solicitar_revision',
    'aprobar_liquidacion', 'rechazar_liquidacion',
    'firmar_digital', 'transmitir_ana',
    'exportar_reportes',
    'ver_auditoria', 'ver_security_logs', 'verificar_integridad',
    'administrar_config', 'administrar_usuarios', 'gestionar_hardware',
    'ver_billing', 'gestionar_billing',
    'captura_fotos', 'escaneo_campo',
  ],
  revisor: [
    'ver_resultados',
    'aprobar_liquidacion', 'rechazar_liquidacion',
    'reclasificar', 'firmar_digital', 'transmitir_ana',
    'exportar_reportes',
  ],
  auditor: [
    'ver_resultados', 'exportar_reportes',
    'ver_auditoria', 'ver_security_logs', 'verificar_integridad',
  ],
  operador: [
    'cargar_manifiesto', 'subir_documentos', 'ver_documentos',
    'clasificar_arancelaria', 'generar_borradores',
    'ver_resultados', 'solicitar_revision',
  ],
};

// ─── Role Display Names ───────────────────────────────
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  master_admin: 'Master Admin',
  senior_broker: 'Senior Broker',
  it_security: 'IT / Security',
  asistente: 'Asistente',
  agente_campo: 'Agente de Campo',
  admin: 'Admin (Legacy)',
  revisor: 'Revisor (Legacy)',
  auditor: 'Auditor (Legacy)',
  operador: 'Operador (Legacy)',
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role')
        .limit(1)
        .single();
      
      if (error) {
        console.warn('Error loading user role:', error);
        return null;
      }
      
      return data?.role as AppRole || 'asistente';
    } catch (err) {
      console.error('Exception loading role:', err);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setTimeout(() => {
            loadUserRole(newSession.user.id).then(userRole => {
              setRole(userRole);
            });
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        loadUserRole(existingSession.user.id).then(userRole => {
          setRole(userRole);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName || email },
        },
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // NOTE: Client-side checks for UX only.
  // Security is enforced server-side via RLS policies and database function checks.
  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
  };

  const hasRole = (checkRole: AppRole): boolean => {
    return role === checkRole;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!user && !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
