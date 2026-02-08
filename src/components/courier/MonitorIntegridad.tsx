/**
 * MONITOR DE INTEGRIDAD DE LOTE
 * 
 * Status bar showing:
 * - Trámites Completos
 * - Documentos Huérfanos
 * - Documentos Faltantes
 * - Overall completeness
 */

import { CheckCircle2, AlertTriangle, FileQuestion, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { IntegridadLote } from '@/lib/courier/LexisIngressEngine';

interface MonitorIntegridadProps {
  integridad: IntegridadLote;
}

export function MonitorIntegridad({ integridad }: MonitorIntegridadProps) {
  const { totalTramites, tramitesCompletos, documentosHuerfanos, documentosFaltantes, porcentajeCompletitud } = integridad;

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Monitor de Integridad — LEXIS</span>
        </div>
        <span className={cn(
          'text-sm font-bold font-mono',
          porcentajeCompletitud >= 90 ? 'text-success' :
          porcentajeCompletitud >= 60 ? 'text-warning' : 'text-destructive'
        )}>
          {porcentajeCompletitud}%
        </span>
      </div>

      <Progress 
        value={porcentajeCompletitud} 
        className={cn(
          'h-2.5',
          porcentajeCompletitud >= 90 ? '[&>div]:bg-success' :
          porcentajeCompletitud >= 60 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
        )} 
      />

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          icon={<CheckCircle2 className="w-4 h-4 text-success" />}
          label="Trámites Completos"
          value={`${tramitesCompletos}/${totalTramites}`}
          color="text-success"
        />
        <MetricCard
          icon={<FileQuestion className="w-4 h-4 text-warning" />}
          label="Docs Huérfanos"
          value={documentosHuerfanos.toString()}
          color="text-warning"
          subtitle="Sin guía asociada"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          label="Docs Faltantes"
          value={documentosFaltantes.toString()}
          color="text-destructive"
          subtitle="Guías sin factura"
        />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn('text-lg font-bold font-mono', color)}>{value}</p>
      {subtitle && <p className="text-[9px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
