/**
 * RADAR DE RIESGO OEA — ZENITH Core
 * Visualización tipo radar de los 4 pilares OEA
 * Colores dinámicos según nivel de riesgo:
 *   Verde (BAJO), Amarillo (MEDIO), Rojo (ALTO), Negro/Rojo intermitente (CRÍTICO)
 */

import { useMemo, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle,
  Lock, Sparkles, CheckCircle2, Camera, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MatrizRiesgoOEA,
  ResultadoMatrizRiesgo,
  ParametrosEvaluacion,
  NivelRiesgo,
} from '@/lib/compliance/MatrizRiesgoOEA';

interface Props {
  /** Parámetros para evaluar la matriz de riesgo */
  parametros: ParametrosEvaluacion;
  /** Callback cuando Zod bloquea la operación */
  onBloqueado?: (resultado: ResultadoMatrizRiesgo) => void;
  /** Callback cuando se permite continuar */
  onCanalVerde?: () => void;
  /** Si la inspección de 17 puntos ya fue completada */
  inspeccionCompletada?: boolean;
  /** Callback para abrir la inspección de 17 puntos */
  onAbrirInspeccion?: () => void;
}

// Colores según nivel
const NIVEL_CONFIG: Record<NivelRiesgo, {
  color: string;
  fillColor: string;
  strokeColor: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  icon: typeof Shield;
  label: string;
}> = {
  BAJO: {
    color: 'hsl(142, 71%, 45%)',
    fillColor: 'hsla(142, 71%, 45%, 0.25)',
    strokeColor: 'hsl(142, 71%, 45%)',
    bgClass: 'bg-success/5',
    borderClass: 'border-success/30',
    textClass: 'text-success',
    badgeClass: 'bg-success/20 text-success border-success/30',
    icon: ShieldCheck,
    label: 'Canal Verde — Bajo Riesgo',
  },
  MEDIO: {
    color: 'hsl(45, 93%, 47%)',
    fillColor: 'hsla(45, 93%, 47%, 0.25)',
    strokeColor: 'hsl(45, 93%, 47%)',
    bgClass: 'bg-zod/5',
    borderClass: 'border-zod/30',
    textClass: 'text-zod',
    badgeClass: 'bg-zod/20 text-zod border-zod/30',
    icon: ShieldAlert,
    label: 'Canal Amarillo — Riesgo Moderado',
  },
  ALTO: {
    color: 'hsl(0, 84%, 60%)',
    fillColor: 'hsla(0, 84%, 60%, 0.25)',
    strokeColor: 'hsl(0, 84%, 60%)',
    bgClass: 'bg-destructive/5',
    borderClass: 'border-destructive/30',
    textClass: 'text-destructive',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: AlertTriangle,
    label: 'Canal Rojo — Alto Riesgo',
  },
  CRITICO: {
    color: 'hsl(0, 84%, 40%)',
    fillColor: 'hsla(0, 0%, 10%, 0.4)',
    strokeColor: 'hsl(0, 84%, 50%)',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/50',
    textClass: 'text-destructive',
    badgeClass: 'bg-destructive/30 text-destructive border-destructive/50',
    icon: Lock,
    label: '⛔ BLOQUEADO — Riesgo Crítico',
  },
};

export function RadarRiesgoOEA({
  parametros,
  onBloqueado,
  onCanalVerde,
  inspeccionCompletada = false,
  onAbrirInspeccion,
}: Props) {
  const resultado = useMemo(() => MatrizRiesgoOEA.evaluar(parametros), [parametros]);
  const datosRadar = useMemo(() => MatrizRiesgoOEA.obtenerDatosRadar(resultado), [resultado]);
  const config = NIVEL_CONFIG[resultado.nivelRiesgo];
  const IconNivel = config.icon;

  // Notify parent if blocked
  useMemo(() => {
    if (resultado.bloqueado && onBloqueado) {
      onBloqueado(resultado);
    }
  }, [resultado.bloqueado]);

  return (
    <div className="space-y-4">
      {/* Header con nivel de riesgo */}
      <Card className={`${config.bgClass} border ${config.borderClass} ${
        resultado.nivelRiesgo === 'CRITICO' ? 'animate-pulse' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgClass} border ${config.borderClass}`}>
                <IconNivel className={`w-5 h-5 ${config.textClass}`} />
              </div>
              <div>
                <span className={`font-display tracking-wide ${config.textClass}`}>
                  Matriz de Riesgo OEA
                </span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Evaluación de 4 pilares — Autoridad Nacional de Aduanas
                </p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config.badgeClass}>
                Score: {resultado.scoreTotal}
              </Badge>
              <Badge variant="outline" className={config.badgeClass}>
                {resultado.nivelRiesgo}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className={`text-sm font-medium ${config.textClass}`}>{config.label}</p>
        </CardContent>
      </Card>

      {/* Radar Chart + Factores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico Radar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Perfil de Riesgo por Pilar
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={datosRadar}>
                <PolarGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="pilar"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar
                  name="Riesgo"
                  dataKey="valor"
                  stroke={config.strokeColor}
                  fill={config.fillColor}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} pts`, 'Riesgo']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Desglose de Factores */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zod" />
              Factores Evaluados
            </CardTitle>
            <CardDescription>{resultado.factores.length} factores analizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-y-auto">
            {resultado.factores.map((factor, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-colors ${
                  factor.puntos > 0
                    ? 'bg-destructive/5 border-destructive/20'
                    : factor.puntos < 0
                      ? 'bg-success/5 border-success/20'
                      : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-border">
                      Pilar {factor.pilar}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{factor.nombre}</span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${
                    factor.puntos > 0 ? 'text-destructive' :
                    factor.puntos < 0 ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {factor.puntos > 0 ? '+' : ''}{factor.puntos}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{factor.descripcion}</p>
                {factor.detalles && (
                  <p className="text-xs text-foreground/60 mt-1 font-mono">{factor.detalles}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mensaje de Stella */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stella mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-primary font-medium mb-1">Stella Help — Análisis OEA</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {resultado.mensajeStella}
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de Zod (si hay) */}
      {resultado.mensajeZod && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
          <Lock className="h-4 w-4" />
          <AlertTitle className="font-display tracking-wide">Zod Integrity Engine</AlertTitle>
          <AlertDescription className="text-sm">
            {resultado.mensajeZod}
          </AlertDescription>
        </Alert>
      )}

      {/* Inspección de 17 Puntos requerida */}
      {resultado.requiereInspeccion17Puntos && !resultado.bloqueado && (
        <Card className={`border ${inspeccionCompletada ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className={`w-5 h-5 ${inspeccionCompletada ? 'text-success' : 'text-destructive'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Inspección de 17 Puntos {inspeccionCompletada ? '— Certificada ✓' : '— Requerida'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inspeccionCompletada
                      ? 'La inspección ha sido certificada por Zod Integrity Engine. Puede proceder.'
                      : 'Complete la inspección de 17 puntos con evidencia fotográfica antes de continuar.'
                    }
                  </p>
                </div>
              </div>
              {!inspeccionCompletada && onAbrirInspeccion && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={onAbrirInspeccion}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Iniciar Inspección
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acción Canal Verde */}
      {resultado.nivelRiesgo === 'BAJO' && onCanalVerde && (
        <div className="flex justify-end">
          <Button
            className="bg-success/10 text-success border border-success/30 hover:bg-success/20"
            variant="ghost"
            onClick={onCanalVerde}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Proceder Canal Verde
          </Button>
        </div>
      )}

      {/* Hash de auditoría */}
      <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
        <p className="text-[10px] text-muted-foreground font-mono">
          Sello OEA: SHA-256 {resultado.hashAuditoria.substring(0, 24)}...
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(resultado.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
