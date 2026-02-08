// ============================================
// DLPProtectedView - Data Loss Prevention wrapper
// Enterprise Security: Copy protection, watermarks, download restrictions
// ============================================

import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemAudit } from '@/hooks/useSystemAudit';
import { cn } from '@/lib/utils';

interface DLPProtectedViewProps {
  children: React.ReactNode;
  /** Enable copy/paste protection */
  disableCopy?: boolean;
  /** Enable right-click protection */
  disableContextMenu?: boolean;
  /** Show dynamic watermark with user identity */
  showWatermark?: boolean;
  /** Restrict screenshot attempts (visual deterrent) */
  antiScreenshot?: boolean;
  /** Label for audit trail */
  resourceLabel?: string;
  className?: string;
}

export const DLPProtectedView: React.FC<DLPProtectedViewProps> = ({
  children,
  disableCopy = true,
  disableContextMenu = true,
  showWatermark = true,
  antiScreenshot = false,
  resourceLabel = 'documento_protegido',
  className,
}) => {
  const { user, role, hasPermission } = useAuth();
  const { logSecurityEvent } = useSystemAudit();
  const containerRef = useRef<HTMLDivElement>(null);

  // Admin bypasses DLP restrictions
  const isPrivileged = role === 'admin';

  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (isPrivileged) return;
    e.preventDefault();
    logSecurityEvent('Intento de copia bloqueado por DLP', {
      resource: resourceLabel,
      action: 'copy_blocked',
    });
  }, [isPrivileged, logSecurityEvent, resourceLabel]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (isPrivileged) return;
    e.preventDefault();
    logSecurityEvent('Menú contextual bloqueado por DLP', {
      resource: resourceLabel,
      action: 'context_menu_blocked',
    });
  }, [isPrivileged, logSecurityEvent, resourceLabel]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isPrivileged) return;
    // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+S, PrintScreen
    if (
      (e.ctrlKey && ['c', 'v', 'a', 's', 'p'].includes(e.key.toLowerCase())) ||
      e.key === 'PrintScreen'
    ) {
      e.preventDefault();
      logSecurityEvent(`Tecla bloqueada por DLP: ${e.key}`, {
        resource: resourceLabel,
        action: 'keystroke_blocked',
        key: e.key,
      });
    }
  }, [isPrivileged, logSecurityEvent, resourceLabel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (disableCopy) {
      container.addEventListener('copy', handleCopy);
      container.addEventListener('cut', handleCopy as EventListener);
    }
    if (disableContextMenu) {
      container.addEventListener('contextmenu', handleContextMenu);
    }
    if (disableCopy) {
      container.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      container.removeEventListener('copy', handleCopy);
      container.removeEventListener('cut', handleCopy as EventListener);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [disableCopy, disableContextMenu, handleCopy, handleContextMenu, handleKeyDown]);

  const watermarkText = user?.email || 'ZENITH USER';
  const watermarkTimestamp = new Date().toISOString().split('T')[0];

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={disableCopy && !isPrivileged ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
    >
      {children}

      {/* Dynamic Watermark Overlay */}
      {showWatermark && !isPrivileged && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-10"
          aria-hidden="true"
        >
          <div className="w-full h-full relative">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute whitespace-nowrap text-foreground/[0.04] text-sm font-mono"
                style={{
                  top: `${12 + i * 12}%`,
                  left: `${(i % 2) * 10 - 5}%`,
                  transform: 'rotate(-35deg)',
                  letterSpacing: '0.15em',
                }}
              >
                {watermarkText} • {watermarkTimestamp} • CONFIDENCIAL • {role?.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anti-screenshot visual deterrent */}
      {antiScreenshot && !isPrivileged && (
        <div
          className="absolute top-2 right-2 z-20 px-2 py-1 rounded text-[9px] font-mono bg-destructive/10 text-destructive border border-destructive/20"
          aria-hidden="true"
        >
          🔒 DLP PROTEGIDO
        </div>
      )}
    </div>
  );
};

export default DLPProtectedView;
