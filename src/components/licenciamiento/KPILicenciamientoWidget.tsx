// ============================================
// Widget de KPIs de Licenciamiento (Punto 12 SOP)
// ============================================

import React, { useMemo } from 'react';
import { BarChart3, Clock, CheckCircle2, XCircle, TrendingUp, Users, Shield, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calcularKPIs, type KPILicenciamiento } from '@/lib/licenciamiento/MotorLicenciamientoACA';
import type { ProcesoOnboarding } from '@/types/onboarding';

interface KPILicenciamientoWidgetProps {
  procesos: ProcesoOnboarding[];
  auditLogs: { procesoId: string; accion: string; fecha: string; etapa?: number }[];
}

export const KPILicenciamientoWidget: React.FC<KPILicenciamientoWidgetProps> = ({
  procesos,
  auditLogs,
}) => {
  const kpis = useMemo(() => calcularKPIs(procesos, auditLogs), [procesos, auditLogs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold font-display tracking-wider text-foreground">
          KPIs de Licenciamiento
        </h3>
        <Badge variant="outline" className="text-[10px] ml-auto">
          SOP-ACA-001 § 12
        </Badge>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Timer className="w-4 h-4 text-primary" />}
          label="Tiempo Promedio Subsanación"
          value={`${kpis.tiempoPromedioSubsanacionHoras}h`}
          detail="Horas promedio entre rechazo y resubida"
          color={kpis.tiempoPromedioSubsanacionHoras < 24 ? 'text-success' : 'text-warning'}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-success" />}
          label="Aceptados Sin Prevención"
          value={`${kpis.porcentajeAceptadosSinPrevencion}%`}
          detail="Expedientes aprobados a la primera"
          color={kpis.porcentajeAceptadosSinPrevencion > 80 ? 'text-success' : 'text-warning'}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          label="Tasa de Aprobación"
          value={`${kpis.tasaAprobacion}%`}
          detail={`${kpis.procesosCompletados} de ${kpis.totalProcesos} procesos`}
          color={kpis.tasaAprobacion > 70 ? 'text-success' : 'text-warning'}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-warning" />}
          label="Duración Promedio"
          value={`${kpis.tiempoPromedioTotalDias}d`}
          detail="Días promedio creación → aprobación"
          color={kpis.tiempoPromedioTotalDias < 30 ? 'text-success' : 'text-destructive'}
        />
      </div>

      {/* Pipeline */}
      <div className="card-elevated p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Pipeline de Procesos</h4>
        <div className="grid grid-cols-4 gap-2">
          <PipelineItem label="Total" value={kpis.totalProcesos} icon={<Users className="w-3.5 h-3.5" />} />
          <PipelineItem label="Activos" value={kpis.procesosActivos} icon={<Clock className="w-3.5 h-3.5 text-primary" />} color="text-primary" />
          <PipelineItem label="Completados" value={kpis.procesosCompletados} icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} color="text-success" />
          <PipelineItem label="Rechazados" value={kpis.procesosRechazados} icon={<XCircle className="w-3.5 h-3.5 text-destructive" />} color="text-destructive" />
        </div>
      </div>

      {/* SLA Compliance */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zod" />
            <span className="text-sm font-semibold text-foreground">Cumplimiento SLA</span>
          </div>
          <span className={cn(
            'text-lg font-bold font-display',
            kpis.slaCumplimientoPorcentaje >= 90 ? 'text-success' : kpis.slaCumplimientoPorcentaje >= 70 ? 'text-warning' : 'text-destructive'
          )}>
            {kpis.slaCumplimientoPorcentaje}%
          </span>
        </div>
        <Progress
          value={kpis.slaCumplimientoPorcentaje}
          className="h-2"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Porcentaje de etapas completadas dentro del SLA establecido
        </p>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color?: string;
}> = ({ icon, label, value, detail, color = 'text-foreground' }) => (
  <div className="stat-card">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="stat-label text-xs">{label}</span>
    </div>
    <span className={cn('stat-value text-xl', color)}>{value}</span>
    <span className="text-[10px] text-muted-foreground">{detail}</span>
  </div>
);

const PipelineItem: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}> = ({ label, value, icon, color = 'text-foreground' }) => (
  <div className="text-center p-2 rounded-lg bg-muted/30 border border-border">
    <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
    <p className={cn('text-xl font-bold font-display', color)}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);
