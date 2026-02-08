/**
 * useSecurityEvents — Hook para registro y consulta de eventos de seguridad
 * Registra: login failures, document downloads, financial changes, DLP violations
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DataIntegrityEngine } from '@/lib/security/DataIntegrityEngine';

export type SecurityEventType =
  | 'LOGIN_FAILED'
  | 'LOGIN_SUCCESS'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_VIEW'
  | 'FINANCIAL_CHANGE'
  | 'DLP_VIOLATION'
  | 'INJECTION_ATTEMPT'
  | 'INTEGRITY_BREACH'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_EXPORT'
  | 'MASS_DOWNLOAD_BLOCKED'
  | 'CRITICAL_ALERT';

export type SecurityEventCategory =
  | 'authentication'
  | 'data_access'
  | 'financial'
  | 'compliance'
  | 'dlp'
  | 'injection'
  | 'general';

export type SecuritySeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface SecurityEvent {
  event_type: SecurityEventType;
  event_category: SecurityEventCategory;
  severity: SecuritySeverity;
  description?: string;
  resource_type?: string;
  resource_id?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
}

export function useSecurityEvents() {
  const { user, role } = useAuth();

  const logEvent = useCallback(async (event: SecurityEvent) => {
    try {
      const fingerprint = DataIntegrityEngine.generateDeviceFingerprint();
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token?.slice(-12) || null;

      const { error } = await (supabase as any).from('security_events').insert({
        user_id: user?.id || null,
        event_type: event.event_type,
        event_category: event.event_category,
        severity: event.severity,
        description: event.description || null,
        resource_type: event.resource_type || null,
        resource_id: event.resource_id || null,
        old_value: event.old_value || null,
        new_value: event.new_value || null,
        user_agent: navigator.userAgent,
        device_fingerprint: fingerprint,
        session_id: sessionToken,
        metadata: {
          ...event.metadata,
          user_role: role,
          timestamp_local: new Date().toISOString(),
          screen_resolution: `${screen.width}x${screen.height}`,
        },
      });

      if (error) {
        console.warn('[SecurityEvents] Error logging event:', error.message);
      }
    } catch (err) {
      console.warn('[SecurityEvents] Exception:', err);
    }
  }, [user, role]);

  // Convenience methods
  const logLoginFailed = useCallback((email: string, reason?: string) => {
    return logEvent({
      event_type: 'LOGIN_FAILED',
      event_category: 'authentication',
      severity: 'warning',
      description: `Intento de login fallido: ${reason || 'credenciales inválidas'}`,
      metadata: { email_attempted: email },
    });
  }, [logEvent]);

  const logDocumentDownload = useCallback((docType: string, docId: string, docName: string) => {
    return logEvent({
      event_type: 'DOCUMENT_DOWNLOAD',
      event_category: 'data_access',
      severity: 'info',
      description: `Descarga de documento: ${docName}`,
      resource_type: docType,
      resource_id: docId,
    });
  }, [logEvent]);

  const logFinancialChange = useCallback((
    field: string,
    oldValue: string,
    newValue: string,
    resourceId: string,
    reason?: string,
  ) => {
    return logEvent({
      event_type: 'FINANCIAL_CHANGE',
      event_category: 'financial',
      severity: 'critical',
      description: `Cambio en campo financiero: ${field}. ${reason || ''}`,
      resource_type: 'liquidacion',
      resource_id: resourceId,
      old_value: oldValue,
      new_value: newValue,
    });
  }, [logEvent]);

  const logInjectionAttempt = useCallback((threats: string[], input: string) => {
    return logEvent({
      event_type: 'INJECTION_ATTEMPT',
      event_category: 'injection',
      severity: 'emergency',
      description: `Intento de inyección detectado y bloqueado`,
      metadata: {
        threats,
        input_preview: input.substring(0, 100),
      },
    });
  }, [logEvent]);

  const logIntegrityBreach = useCallback((description: string, metadata?: Record<string, unknown>) => {
    return logEvent({
      event_type: 'INTEGRITY_BREACH',
      event_category: 'compliance',
      severity: 'emergency',
      description,
      metadata,
    });
  }, [logEvent]);

  const logDLPViolation = useCallback((action: string, resource?: string) => {
    return logEvent({
      event_type: 'DLP_VIOLATION',
      event_category: 'dlp',
      severity: 'warning',
      description: `Acción DLP bloqueada: ${action}`,
      resource_type: resource,
    });
  }, [logEvent]);

  return {
    logEvent,
    logLoginFailed,
    logDocumentDownload,
    logFinancialChange,
    logInjectionAttempt,
    logIntegrityBreach,
    logDLPViolation,
  };
}
