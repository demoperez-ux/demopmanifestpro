// ============================================
// Control Center Dashboard - Onboarding
// Estética "Control Center" con widgets de riesgo
// ============================================

import React from 'react';
import { Shield, AlertTriangle, Clock, FileCheck, TrendingUp, Users, Banknote, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ETAPAS_SOP, type ProcesoOnboarding } from '@/types/onboarding';

interface ControlCenterDashboardProps {
  proceso: ProcesoOnboarding;
  documentCount: number;
  pendingReviews: number;
}

export const ControlCenterDashboard: React.FC<ControlCenterDashboardProps> = ({
  proceso,
  documentCount,
  pendingReviews,
}) => {
  const riskLevel = proceso.riskScore > 70 ? 'alto' : proceso.riskScore > 40 ? 'medio' : 'bajo';
  const riskColor = riskLevel === 'alto' ? 'text-destructive' : riskLevel === 'medio' ? 'text-warning' : 'text-success';
  const progressPercent = ((proceso.etapaActual) / 8) * 100;

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            {proceso.corredorNombre}
          </h2>
          <p className="text-xs text-muted-foreground">
            Cédula: {proceso.corredorCedula} · {proceso.empresaNombre || 'Persona Natural'}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            proceso.estado === 'aprobado' && 'border-success/30 text-success',
            proceso.estado === 'en_progreso' && 'border-primary/30 text-primary',
            proceso.estado === 'rechazado' && 'border-destructive/30 text-destructive',
            proceso.estado === 'pausado' && 'border-warning/30 text-warning'
          )}
        >
          {proceso.estado.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progreso General</span>
          <span className="text-sm font-bold text-primary font-display">{progressPercent.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2.5 mb-2" />
        <p className="text-xs text-muted-foreground">
          Etapa {proceso.etapaActual} de 8 · {ETAPAS_SOP[proceso.etapaActual]?.nombre}
        </p>
      </div>

      {/* Stat Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Risk Score */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn('w-4 h-4', riskColor)} />
            <span className="stat-label">Riesgo</span>
          </div>
          <span className={cn('stat-value', riskColor)}>
            {proceso.riskScore}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">Nivel {riskLevel}</span>
        </div>

        {/* Document Score */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-primary" />
            <span className="stat-label">Completitud</span>
          </div>
          <span className={cn(
            'stat-value',
            proceso.documentCompletenessScore === 100 ? 'text-success' : 'text-foreground'
          )}>
            {proceso.documentCompletenessScore.toFixed(0)}%
          </span>
          <span className="text-[10px] text-muted-foreground">{documentCount} docs</span>
        </div>

        {/* Fianza */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-warning" />
            <span className="stat-label">Fianza</span>
          </div>
          <span className="stat-value">
            {proceso.montoFianza
              ? `$${proceso.montoFianza.toLocaleString()}`
              : '—'
            }
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] w-fit',
              proceso.estadoFianza === 'aprobada' && 'border-success/30 text-success',
              proceso.estadoFianza === 'pendiente' && 'border-warning/30 text-warning',
              proceso.estadoFianza === 'vencida' && 'border-destructive/30 text-destructive'
            )}
          >
            {proceso.estadoFianza}
          </Badge>
        </div>

        {/* Pending Reviews */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-stella" />
            <span className="stat-label">Revisiones</span>
          </div>
          <span className={cn('stat-value', pendingReviews > 0 ? 'text-warning' : 'text-success')}>
            {pendingReviews}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {pendingReviews > 0 ? 'pendientes' : 'al día'}
          </span>
        </div>
      </div>

      {/* Risk Radar Widget */}
      <div className="glass-panel-zod p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-zod" />
          <span className="text-sm font-semibold text-zod-light">Radar de Riesgos Principales</span>
        </div>
        <div className="space-y-2">
          <RiskItem label="Documentación incompleta" value={100 - proceso.documentCompletenessScore} />
          <RiskItem label="Baja confianza IA" value={pendingReviews * 15} />
          <RiskItem label="SLA vencidos" value={proceso.riskScore > 40 ? 35 : 0} />
          <RiskItem label="Fianza no constituida" value={proceso.estadoFianza !== 'aprobada' ? 50 : 0} />
        </div>
      </div>
    </div>
  );
};

const RiskItem: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-40 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            clampedValue > 60 ? 'bg-destructive' : clampedValue > 30 ? 'bg-warning' : 'bg-success'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-mono w-8 text-right',
        clampedValue > 60 ? 'text-destructive' : clampedValue > 30 ? 'text-warning' : 'text-success'
      )}>
        {clampedValue}
      </span>
    </div>
  );
};
