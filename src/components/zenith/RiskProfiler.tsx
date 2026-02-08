import { useState, useMemo, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, Zap, Lock, AlertTriangle,
  Activity, BarChart3, Eye, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  MatrizRiesgoOEA,
  type ParametrosEvaluacion,
  type ResultadoMatrizRiesgo,
  type NivelRiesgo,
} from '@/lib/compliance/MatrizRiesgoOEA';

// ── Types ──

export interface TramiteMetadata {
  // Identity
  mawb?: string;
  operador?: string;
  consignatario?: string;

  // Pilar 1 — Asociados
  clienteOEA: boolean;
  transportistasBASC: boolean;

  // Pilar 2 — Carga
  pesoDeclarado: number;
  pesoVerificado: number;
  tipoCarga: 'general' | 'granel' | 'courier';

  // Pilar 3 — Ruta
  paisOrigen: string;

  // Pilar 4 — Mercancía
  productosRestringidosMINSA: number;
  productosRestringidosMIDA: number;
  totalProductos: number;

  // Optional overrides
  zonaAltoRiesgo?: boolean;
}

interface RiskProfilerProps {
  metadata: TramiteMetadata;
  /** Called when Zod blocks or allows the operation */
  onVerdict?: (result: ResultadoMatrizRiesgo) => void;
  /** Compact mode for embedding in other panels */
  compact?: boolean;
}

// ── Helpers ──

const NIVEL_CONFIG: Record<NivelRiesgo, {
  label: string;
  badgeClass: string;
  barClass: string;
  icon: typeof ShieldCheck;
}> = {
  BAJO: {
    label: 'Riesgo Bajo',
    badgeClass: 'bg-success/15 text-success border-success/20',
    barClass: 'bg-success',
    icon: ShieldCheck,
  },
  MEDIO: {
    label: 'Riesgo Medio',
    badgeClass: 'bg-warning/15 text-warning border-warning/20',
    barClass: 'bg-warning',
    icon: AlertTriangle,
  },
  ALTO: {
    label: 'Riesgo Alto',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/20',
    barClass: 'bg-destructive',
    icon: ShieldAlert,
  },
  CRITICO: {
    label: 'Riesgo Crítico',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
    barClass: 'bg-destructive',
    icon: Lock,
  },
};

const CANAL_CONFIG: Record<string, { label: string; className: string }> = {
  verde: { label: 'Canal Verde — Despacho Acelerado', className: 'text-success' },
  amarillo: { label: 'Canal Amarillo — Verificación Documental', className: 'text-warning' },
  rojo: { label: 'Canal Rojo — Inspección Obligatoria', className: 'text-destructive' },
  bloqueado: { label: 'BLOQUEADO — Alerta SAFE', className: 'text-destructive font-bold' },
};

// ── Component ──

export function RiskProfiler({ metadata, onVerdict, compact = false }: RiskProfilerProps) {
  const [showFactores, setShowFactores] = useState(false);

  // Run the OEA risk evaluation
  const resultado = useMemo<ResultadoMatrizRiesgo>(() => {
    const params: ParametrosEvaluacion = {
      clienteOEA: metadata.clienteOEA,
      transportistasBASC: metadata.transportistasBASC,
      pesoDeclarado: metadata.pesoDeclarado,
      pesoVerificado: metadata.pesoVerificado,
      tipoCarga: metadata.tipoCarga,
      paisOrigen: metadata.paisOrigen,
      zonaAltoRiesgo: metadata.zonaAltoRiesgo ?? MatrizRiesgoOEA.esZonaAltoRiesgo(metadata.paisOrigen),
      productosRestringidosMINSA: metadata.productosRestringidosMINSA,
      productosRestringidosMIDA: metadata.productosRestringidosMIDA,
      totalProductos: metadata.totalProductos,
      mawb: metadata.mawb,
      operador: metadata.operador,
    };

    return MatrizRiesgoOEA.evaluar(params);
  }, [metadata]);

  // Derived state
  const config = NIVEL_CONFIG[resultado.nivelRiesgo];
  const canal = CANAL_CONFIG[resultado.canalSugerido];
  const Icon = config.icon;
  const isBlocked = resultado.bloqueado;
  const isAccelerated = resultado.scoreTotal < 30 && resultado.nivelRiesgo === 'BAJO';

  const handleEmitVerdict = useCallback(() => {
    onVerdict?.(resultado);
  }, [resultado, onVerdict]);

  // ── Compact mode ──
  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        isBlocked ? 'bg-destructive/5 border-destructive/20' :
        isAccelerated ? 'bg-success/5 border-success/20' :
        'bg-muted/50 border-border'
      )}>
        <Icon className={cn('w-5 h-5 flex-shrink-0', isBlocked ? 'text-destructive' : isAccelerated ? 'text-success' : 'text-warning')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">OEA Score: {resultado.scoreTotal}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.badgeClass)}>
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{canal.label}</p>
        </div>
        {isBlocked && <Lock className="w-4 h-4 text-destructive flex-shrink-0" />}
        {isAccelerated && <Zap className="w-4 h-4 text-success flex-shrink-0" />}
      </div>
    );
  }

  // ── Full mode ──
  return (
    <div className="space-y-4">
      {/* Score Header */}
      <Card className={cn(
        'border-l-4 overflow-hidden',
        isBlocked ? 'border-l-destructive' :
        isAccelerated ? 'border-l-success' :
        resultado.nivelRiesgo === 'ALTO' ? 'border-l-destructive' :
        resultado.nivelRiesgo === 'MEDIO' ? 'border-l-warning' :
        'border-l-success'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Risk Profiler — Análisis OEA
            </div>
            <Badge variant="outline" className={cn('text-xs', config.badgeClass)}>
              {config.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Gauge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Score de Riesgo</span>
              <span className="font-mono font-bold text-foreground text-lg">{resultado.scoreTotal}</span>
            </div>
            <Progress
              value={Math.min(100, resultado.scoreTotal)}
              className="h-2.5"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 — Bajo</span>
              <span>30</span>
              <span>70</span>
              <span>100 — Crítico</span>
            </div>
          </div>

          {/* Canal Assignment */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">Canal Asignado</span>
            <span className={cn('text-sm font-semibold', canal.className)}>{canal.label}</span>
          </div>

          {/* Pillar Breakdown */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFactores(!showFactores)}
              className="w-full justify-between text-xs text-muted-foreground h-8"
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Desglose por Pilar ({resultado.factores.length} factores)
              </span>
              {showFactores ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>

            {showFactores && (
              <div className="mt-2 space-y-2">
                {resultado.factores.map((factor, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 p-2.5 rounded-md text-xs border',
                      factor.puntos > 0
                        ? 'bg-destructive/5 border-destructive/10'
                        : factor.puntos < 0
                        ? 'bg-success/5 border-success/10'
                        : 'bg-muted/30 border-border'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                      factor.puntos > 0 ? 'bg-destructive/15 text-destructive' :
                      factor.puntos < 0 ? 'bg-success/15 text-success' :
                      'bg-muted text-muted-foreground'
                    )}>
                      P{factor.pilar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{factor.nombre}</span>
                        <span className={cn(
                          'font-mono text-xs font-bold',
                          factor.puntos > 0 ? 'text-destructive' :
                          factor.puntos < 0 ? 'text-success' :
                          'text-muted-foreground'
                        )}>
                          {factor.puntos > 0 ? '+' : ''}{factor.puntos}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{factor.descripcion}</p>
                      {factor.detalles && (
                        <p className="text-muted-foreground/70 mt-1 font-mono text-[10px]">{factor.detalles}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zod Alert — Score > 70 → Block */}
      {(resultado.scoreTotal > 70 || resultado.bloqueado) && resultado.mensajeZod && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Alerta de Seguridad SAFE — Operación Bloqueada
                </p>
                <p className="text-sm text-foreground mt-2 leading-relaxed">
                  {resultado.mensajeZod}
                </p>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Hash: {resultado.hashAuditoria.substring(0, 24)}…
                  </p>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                    ENVÍO BLOQUEADO
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stella — Score < 30 → Accelerated Dispatch */}
      {isAccelerated && (
        <Card className="border-l-4 border-l-success bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-success flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Candidato a Despacho Acelerado — Estándar OEA
                </p>
                <p className="text-sm text-foreground mt-2 leading-relaxed">
                  {resultado.mensajeStella}
                </p>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Protocolo AFC-OMC Art. 7.1 — Despacho Anticipado Autorizado
                  </p>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                    DESPACHO ACELERADO
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stella Insight — Medium/High (non-blocked, non-accelerated) */}
      {!isBlocked && !isAccelerated && resultado.scoreTotal <= 70 && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Stella — Análisis de Riesgo
                </p>
                <p className="text-sm text-foreground mt-2 leading-relaxed">
                  {resultado.mensajeStella}
                </p>
                {resultado.requiereInspeccion17Puntos && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Inspección de 17 Puntos requerida antes de liquidación SIGA
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Footer */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>Evaluación: {new Date(resultado.timestamp).toLocaleString('es-PA')}</span>
        <span className="font-mono">SHA-256: {resultado.hashAuditoria.substring(0, 16)}…</span>
      </div>
    </div>
  );
}
