// ============================================
// useSystemAudit - Hook para auditoría forense del sistema
// Enterprise Security Layer: Insert-only forensic logging
// ============================================

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'security';

export interface AuditEntry {
  action_type: string;
  resource_type: string;
  resource_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
}

export function useSystemAudit() {
  const { user, role } = useAuth();

  const logAction = useCallback(async (entry: AuditEntry) => {
    if (!user) return;

    try {
      // Use type assertion since sys_audit_logs may not be in generated types yet
      const { error } = await (supabase as any).from('sys_audit_logs').insert({
        user_id: user.id,
        user_role: role,
        action_type: entry.action_type,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id || null,
        description: entry.description || null,
        ip_address: null, // Server-side only for real IP
        user_agent: navigator.userAgent,
        session_id: (await supabase.auth.getSession()).data.session?.access_token?.slice(-12) || null,
        metadata: entry.metadata || {},
        severity: entry.severity || 'info',
      });

      if (error) {
        console.warn('[SysAudit] Error logging action:', error.message);
      }
    } catch (err) {
      console.warn('[SysAudit] Exception:', err);
    }
  }, [user, role]);

  // Convenience methods
  const logLogin = useCallback(() => {
    return logAction({
      action_type: 'AUTH_LOGIN',
      resource_type: 'session',
      description: 'Usuario inició sesión',
      severity: 'info',
    });
  }, [logAction]);

  const logLogout = useCallback(() => {
    return logAction({
      action_type: 'AUTH_LOGOUT',
      resource_type: 'session',
      description: 'Usuario cerró sesión',
      severity: 'info',
    });
  }, [logAction]);

  const logDataAccess = useCallback((resourceType: string, resourceId?: string) => {
    return logAction({
      action_type: 'DATA_ACCESS',
      resource_type: resourceType,
      resource_id: resourceId,
      severity: 'info',
    });
  }, [logAction]);

  const logDataExport = useCallback((resourceType: string, format: string) => {
    return logAction({
      action_type: 'DATA_EXPORT',
      resource_type: resourceType,
      description: `Exportación en formato ${format}`,
      severity: 'warning',
      metadata: { format },
    });
  }, [logAction]);

  const logSecurityEvent = useCallback((description: string, metadata?: Record<string, unknown>) => {
    return logAction({
      action_type: 'SECURITY_EVENT',
      resource_type: 'security',
      description,
      severity: 'security',
      metadata,
    });
  }, [logAction]);

  const logCriticalAction = useCallback((actionType: string, resourceType: string, description: string) => {
    return logAction({
      action_type: actionType,
      resource_type: resourceType,
      description,
      severity: 'critical',
    });
  }, [logAction]);

  return {
    logAction,
    logLogin,
    logLogout,
    logDataAccess,
    logDataExport,
    logSecurityEvent,
    logCriticalAction,
  };
}
