/**
 * DASHBOARD DE CUMPLIMIENTO OEA/BASC — ZENITH Gold Standard
 * Vista de "Salud de la Licencia de Corretaje"
 * Stella y Zod reportan en tiempo real
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Shield, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle,
  Users, FileCheck, Lock, Sparkles, ArrowRight, Eye,
  ClipboardCheck, TrendingUp, BarChart3, Activity, Radar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { MotorCumplimientoOEA, ItemChecklistOEA, MetricasOEA, ResultadoMatrizRiesgo as ResultadoMatrizOEALegacy } from '@/lib/compliance/MotorCumplimientoOEA';
import { GestorAsociadosNegocio, AsociadoNegocio, ResultadoDebidaDiligencia } from '@/lib/compliance/GestorAsociadosNegocio';
import { RadarRiesgoOEA } from '@/components/zenith/RadarRiesgoOEA';
import { ParametrosEvaluacion, ResultadoMatrizRiesgo as ResultadoMatrizNueva } from '@/lib/compliance/MatrizRiesgoOEA';
import { ZodVerdict } from '@/components/zenith/ZodIntegrityModal';
import { Inspeccion17Puntos } from '@/components/zenith/Inspeccion17Puntos';

interface Props {
  totalPaquetes?: number;
  paquetesConErrores?: number;
  paquetesRestringidos?: number;
  valorCIFTotal?: number;
  pesoDeclarado?: number;
  pesoVerificado?: number;
  tipoCarga?: 'general' | 'granel' | 'courier';
  paisOrigen?: string;
  clienteOEA?: boolean;
  transportistaBASC?: boolean;
  mawb?: string;
  onZodBloqueo?: (verdict: ZodVerdict) => void;
}

export function DashboardCumplimiento({
  totalPaquetes = 0,
  paquetesConErrores = 0,
  paquetesRestringidos = 0,
  valorCIFTotal = 0,
  pesoDeclarado = 0,
  pesoVerificado = 0,
  tipoCarga = 'courier',
  paisOrigen = 'US',
  clienteOEA = false,
  transportistaBASC = false,
  mawb,
  onZodBloqueo,
}: Props) {
  const [checklist, setChecklist] = useState<ItemChecklistOEA[]>(() => MotorCumplimientoOEA.inicializarChecklist());
  const [activeTab, setActiveTab] = useState('radar');
  const [inspeccionCompletada, setInspeccionCompletada] = useState(false);
  const [inspeccionModalOpen, setInspeccionModalOpen] = useState(false);

  const metricas = useMemo(() => MotorCumplimientoOEA.obtenerMetricas(), [checklist]);
  const metricasBASC = useMemo(() => GestorAsociadosNegocio.obtenerMetricasBASC(), []);

  const matrizRiesgo = useMemo(() => MotorCumplimientoOEA.calcularMatrizRiesgo({
    totalPaquetes,
    paquetesConErrores,
    paquetesRestringidos,
    valorCIFTotal,
    sellosDiscrepantes: metricas.sellosDiscrepantes,
    incidentesPrevios: 0,
    diasUltimaAuditoria: undefined,
  }), [totalPaquetes, paquetesConErrores, paquetesRestringidos, valorCIFTotal, metricas]);

  // Parámetros para el RadarRiesgoOEA
  const parametrosRadar: ParametrosEvaluacion = useMemo(() => ({
    clienteOEA,
    transportistasBASC: transportistaBASC,
    pesoDeclarado,
    pesoVerificado,
    tipoCarga,
    paisOrigen,
    zonaAltoRiesgo: false,
    productosRestringidosMINSA: paquetesRestringidos,
    productosRestringidosMIDA: 0,
    totalProductos: totalPaquetes,
    mawb,
  }), [clienteOEA, transportistaBASC, pesoDeclarado, pesoVerificado, tipoCarga, paisOrigen, paquetesRestringidos, totalPaquetes, mawb]);

  const handleZodBloqueo = (resultado: ResultadoMatrizNueva) => {
    if (onZodBloqueo) {
      onZodBloqueo({
        bloqueado: true,
        tipo: 'cumplimiento',
        titulo: 'Veredicto de Zod: Integridad Comprometida',
        descripcion: resultado.mensajeZod || 'Operación bloqueada por protocolo de seguridad OEA.',
        detalles: resultado.factores.filter(f => f.puntos > 0).map(f => `${f.nombre}: +${f.puntos} pts — ${f.descripcion}`),
        accionRequerida: 'Se requiere intervención del Oficial de Seguridad BASC antes de proceder.',
        hashVerificacion: resultado.hashAuditoria,
      });
    }
  };

  const handleCheckItem = (itemId: string, checked: boolean) => {
    if (checked) {
      MotorCumplimientoOEA.completarItem(itemId);
    }
    setChecklist(MotorCumplimientoOEA.obtenerChecklist());
  };

  const nivelColor = (nivel: string) => {
    switch (nivel) {
      case 'optimo': return 'text-success';
      case 'aceptable': return 'text-primary';
      case 'mejorable': return 'text-zod';
      case 'deficiente': return 'text-destructive';
      case 'critico': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const riesgoColor = (puntuacion: number) => {
    if (puntuacion <= 20) return 'bg-success/20 text-success';
    if (puntuacion <= 40) return 'bg-primary/20 text-primary';
    if (puntuacion <= 60) return 'bg-zod/20 text-zod';
    return 'bg-destructive/20 text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground tracking-wide">
              Salud de la Licencia de Corretaje
            </h2>
            <p className="text-sm text-muted-foreground">
              Cumplimiento OEA & BASC v6-2022 — ZENITH protege tu licencia
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`border-primary/30 ${nivelColor(matrizRiesgo.nivel)}`}>
          {matrizRiesgo.nivel.toUpperCase()}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cumplimiento OEA</p>
                <p className="text-2xl font-bold text-foreground">{metricas.cumplimientoGeneral}%</p>
              </div>
            </div>
            <Progress value={metricas.cumplimientoGeneral} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zod/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-zod" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sellos Verificados</p>
                <p className="text-2xl font-bold text-foreground">{metricas.sellosVerificados}</p>
              </div>
            </div>
            {metricas.sellosDiscrepantes > 0 && (
              <p className="text-xs text-destructive mt-2">⚠ {metricas.sellosDiscrepantes} discrepantes</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asociados BASC</p>
                <p className="text-2xl font-bold text-foreground">{metricasBASC.totalAsociados}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{metricasBASC.aprobados} aprobados</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alertas Activas</p>
                <p className="text-2xl font-bold text-foreground">{metricas.alertasActivas}</p>
              </div>
            </div>
            {metricas.alertasActivas > 0 && (
              <p className="text-xs text-zod mt-2">Requieren atención inmediata</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="radar" className="gap-2">
            <Radar className="w-4 h-4" />
            Radar OEA
          </TabsTrigger>
          <TabsTrigger value="salud" className="gap-2">
            <Activity className="w-4 h-4" />
            Factores Riesgo
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Checklist Pilar 2
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2">
            <ShieldAlert className="w-4 h-4" />
            Alertas ({metricas.alertasActivas})
          </TabsTrigger>
        </TabsList>

        {/* Radar OEA */}
        <TabsContent value="radar" className="space-y-4 mt-4">
          <RadarRiesgoOEA
            parametros={parametrosRadar}
            onBloqueado={handleZodBloqueo}
            inspeccionCompletada={inspeccionCompletada}
            onAbrirInspeccion={() => setInspeccionModalOpen(true)}
          />
        </TabsContent>

        {/* Matriz de Riesgo */}
        <TabsContent value="salud" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5 text-primary" />
                Matriz de Riesgo Aduanero (Resolución ANA)
              </CardTitle>
              <CardDescription>Evaluación ponderada de factores de riesgo operativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {matrizRiesgo.factores.map((factor, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{factor.factor}</span>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        Peso: {factor.peso}/10
                      </Badge>
                    </div>
                    <span className={`text-sm font-mono font-bold ${riesgoColor(factor.puntuacion)} px-2 py-0.5 rounded`}>
                      {factor.puntuacion.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={factor.puntuacion} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{factor.detalles}</p>
                </div>
              ))}

              {/* Recomendaciones */}
              {matrizRiesgo.recomendaciones.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-primary">Recomendaciones de Stella</p>
                  </div>
                  <ul className="space-y-2">
                    {matrizRiesgo.recomendaciones.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0 text-primary" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Pilar 2 */}
        <TabsContent value="checklist" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Pilar 2: Seguridad del Contenedor y Carga
              </CardTitle>
              <CardDescription>
                {checklist.filter(i => i.completado).length}/{checklist.length} completados
                ({metricas.cumplimientoGeneral}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completado ? 'bg-success/5 border-success/20' : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.completado}
                      onCheckedChange={(checked) => handleCheckItem(item.id, !!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={item.id} className="text-sm text-foreground cursor-pointer">
                        {item.descripcion}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] border-border">
                          {item.categoria}
                        </Badge>
                        {item.obligatorio && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            Obligatorio
                          </Badge>
                        )}
                        {item.fechaCumplimiento && (
                          <span className="text-[10px] text-muted-foreground">
                            ✓ {new Date(item.fechaCumplimiento).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.completado ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : item.obligatorio ? (
                      <AlertTriangle className="w-4 h-4 text-zod flex-shrink-0" />
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alertas" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ShieldAlert className="w-5 h-5 text-zod" />
                Alertas de Ruta Crítica
              </CardTitle>
              <CardDescription>Monitoreo de desviaciones y eventos de seguridad</CardDescription>
            </CardHeader>
            <CardContent>
              {matrizRiesgo.alertasActivas.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Sin alertas activas</p>
                    <p className="text-xs text-muted-foreground">Stella monitorea la cadena de suministro en tiempo real</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {matrizRiesgo.alertasActivas.map(alerta => (
                    <div
                      key={alerta.id}
                      className={`p-4 rounded-lg border ${
                        alerta.severidad === 'critical' ? 'bg-destructive/5 border-destructive/30' :
                        alerta.severidad === 'warning' ? 'bg-zod/5 border-zod/30' :
                        'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`w-4 h-4 ${
                          alerta.severidad === 'critical' ? 'text-destructive' : 'text-zod'
                        }`} />
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {alerta.tipo.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(alerta.fechaDeteccion).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{alerta.descripcion}</p>
                      <div className="flex items-start gap-2 p-2 rounded bg-primary/5">
                        <Sparkles className="w-3 h-3 text-primary mt-0.5" />
                        <p className="text-xs text-foreground/80 italic">{alerta.stellaMensaje}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stella & Zod Footer */}
      <div className="flex items-center justify-center gap-6 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>Monitoreado por Stella Help</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3 text-zod" />
          <span>Verificado por Zod Integrity Engine</span>
        </div>
      </div>

      {/* Modal de Inspección de 17 Puntos */}
      <Dialog open={inspeccionModalOpen} onOpenChange={setInspeccionModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <Inspeccion17Puntos
            mawb={mawb || 'N/A'}
            nivelRiesgo={parametrosRadar.paisOrigen}
            scoreRiesgo={matrizRiesgo.puntuacionGlobal}
            onCertificado={(hash) => {
              setInspeccionCompletada(true);
              setInspeccionModalOpen(false);
            }}
            onCerrar={() => setInspeccionModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
