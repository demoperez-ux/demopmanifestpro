// ============================================
// Panel de Notificaciones de Stella — Acompañamiento
// ============================================

import React from 'react';
import { Sparkles, Bell, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StellaNotificacion } from '@/lib/licenciamiento/MotorLicenciamientoACA';

interface StellaNotificacionesPanelProps {
  notificaciones: StellaNotificacion[];
  onAccion?: (notificacionId: string) => void;
}

const TIPO_CONFIG = {
  acompanamiento: { icon: Sparkles, color: 'text-stella', bg: 'bg-primary/10 border-primary/20' },
  recordatorio: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  alerta: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  felicitacion: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
};

export const StellaNotificacionesPanel: React.FC<StellaNotificacionesPanelProps> = ({
  notificaciones,
  onAccion,
}) => {
  const sorted = [...notificaciones].sort((a, b) => {
    const prioridadMap = { alta: 0, media: 1, baja: 2 };
    return (prioridadMap[a.prioridad] || 2) - (prioridadMap[b.prioridad] || 2);
  });

  return (
    <div className="glass-panel-stella overflow-hidden">
      <div className="px-4 py-3 border-b border-primary/20 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-stella" />
        <h3 className="text-sm font-semibold text-stella-light font-display tracking-wider">
          Stella — Acompañamiento
        </h3>
        <Badge variant="outline" className="text-[10px] ml-auto border-primary/20 text-primary">
          {notificaciones.length}
        </Badge>
      </div>

      <div className="divide-y divide-primary/10 max-h-[400px] overflow-y-auto scrollbar-thin">
        {sorted.map((notif) => {
          const config = TIPO_CONFIG[notif.tipo];
          const Icon = config.icon;

          return (
            <div
              key={notif.id}
              className="px-4 py-3 hover:bg-primary/5 transition-colors duration-200"
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0', config.bg)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5',
                        notif.prioridad === 'alta' && 'border-destructive/30 text-destructive',
                        notif.prioridad === 'media' && 'border-warning/30 text-warning',
                        notif.prioridad === 'baja' && 'border-border text-muted-foreground',
                      )}
                    >
                      {notif.prioridad.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Fase {notif.fase}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {notif.mensaje}
                  </p>
                  {notif.accionSugerida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAccion?.(notif.id)}
                      className="mt-2 h-7 text-xs text-primary hover:text-primary gap-1 px-2"
                    >
                      {notif.accionSugerida}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Sparkles className="w-6 h-6 text-stella/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin notificaciones pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
};
