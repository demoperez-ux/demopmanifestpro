// ============================================
// Stepper Vertical - SOP-ACA-001 Etapas 0-8
// ============================================

import React from 'react';
import { Check, Lock, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { ETAPAS_SOP, type SlaEstado } from '@/types/onboarding';
import { calcularSlaEstado, getTiempoRestante } from '@/lib/onboarding/MotorOnboardingCorredor';
import { cn } from '@/lib/utils';

interface OnboardingStepperProps {
  etapaActual: number;
  slaTimestamps: Record<number, string>;
  controlPointsStatus: Record<string, 'pendiente' | 'aprobado' | 'bloqueado'>;
  onSelectEtapa: (etapa: number) => void;
  selectedEtapa: number;
}

const SLA_COLORS: Record<SlaEstado, string> = {
  verde: 'bg-success text-success-foreground',
  amarillo: 'bg-warning text-warning-foreground',
  rojo: 'bg-destructive text-destructive-foreground',
};

const SLA_DOT: Record<SlaEstado, string> = {
  verde: 'bg-success',
  amarillo: 'bg-warning',
  rojo: 'bg-destructive animate-pulse',
};

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  etapaActual,
  slaTimestamps,
  controlPointsStatus,
  onSelectEtapa,
  selectedEtapa,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground font-display tracking-wider">
          SOP-ACA-001
        </h3>
        <p className="text-xs text-muted-foreground">Onboarding de Corredor</p>
      </div>

      <div className="py-2">
        {ETAPAS_SOP.map((etapa) => {
          const isComplete = etapa.id < etapaActual;
          const isCurrent = etapa.id === etapaActual;
          const isFuture = etapa.id > etapaActual;
          const isSelected = etapa.id === selectedEtapa;
          const cpId = `CP-${etapa.id}`;
          const cpStatus = controlPointsStatus[cpId] || 'pendiente';

          const slaTimestamp = slaTimestamps[etapa.id];
          const slaEstado = slaTimestamp
            ? calcularSlaEstado(etapa, slaTimestamp)
            : null;
          const tiempoRestante = slaTimestamp
            ? getTiempoRestante(etapa, slaTimestamp)
            : null;

          return (
            <button
              key={etapa.id}
              onClick={() => !isFuture && onSelectEtapa(etapa.id)}
              disabled={isFuture}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-200 relative group',
                isSelected && 'bg-accent/50 border-l-2 border-primary',
                !isSelected && !isFuture && 'hover:bg-muted/30 border-l-2 border-transparent',
                isFuture && 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
              )}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                    isComplete && 'bg-success/20 text-success border border-success/30',
                    isCurrent && 'bg-primary/20 text-primary border border-primary/30 zenith-glow',
                    isFuture && 'bg-muted text-muted-foreground border border-border',
                    cpStatus === 'bloqueado' && isCurrent && 'bg-destructive/20 text-destructive border border-destructive/30'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isFuture ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    etapa.id
                  )}
                </div>
                {/* Connecting line */}
                {etapa.id < 8 && (
                  <div
                    className={cn(
                      'w-0.5 h-6 mt-1',
                      isComplete ? 'bg-success/40' : 'bg-border'
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium truncate',
                      isComplete && 'text-success',
                      isCurrent && 'text-foreground',
                      isFuture && 'text-muted-foreground'
                    )}
                  >
                    {etapa.nombre}
                  </span>
                  {isSelected && <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />}
                </div>

                {/* SLA Badge */}
                {isCurrent && slaEstado && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', SLA_COLORS[slaEstado])}>
                      <div className={cn('w-1.5 h-1.5 rounded-full', SLA_DOT[slaEstado])} />
                      SLA {etapa.slaHoras}h
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {tiempoRestante}
                    </span>
                  </div>
                )}

                {/* CP Status */}
                {isCurrent && cpStatus === 'bloqueado' && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    CP bloqueado
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-success">
                    <Check className="w-3 h-3" />
                    Completado
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
