/**
 * FLUJO COURIER ALTO VOLUMEN — Dashboard
 * 
 * Panel unificado con 3 pestañas:
 * 1. Manifest Sniffer — Detección MAWB/HAWB
 * 2. Agrupador de Liquidaciones — Consolidación de declaraciones
 * 3. Alerta de Carga Sensible — Priorización Stella
 */

import { useState, useMemo } from 'react';
import {
  Package, Layers, ShieldAlert, Upload, FileSpreadsheet,
  ArrowRightLeft, AlertTriangle, CheckCircle2, Info,
  Sparkles, TrendingDown, Boxes, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { ManifestSnifferCourier, type ResultadoSnifferCourier } from '@/lib/sniffer/ManifestSnifferCourier';
import { AgrupadorLiquidaciones, type ResultadoAgrupacion } from '@/lib/liquidacion/AgrupadorLiquidaciones';
import { AlertaCargaSensible, type ResultadoCargaSensible } from '@/lib/compliance/AlertaCargaSensible';
import type { ManifestRow } from '@/types/manifest';

// ─── Mock data for demo ─────────────────────────────────

function generarDemoManifest(): ManifestRow[] {
  const descripciones = [
    { desc: 'Wireless Headphones', val: 45 },
    { desc: 'Phone Case Silicone', val: 12 },
    { desc: 'Vitamin D3 Supplement 5000IU', val: 28 },
    { desc: 'Amoxicillin Capsules 500mg', val: 85 },
    { desc: 'Organic Dog Food 5kg', val: 55 },
    { desc: 'Fresh Mango Box 10kg', val: 40 },
    { desc: 'Laptop Stand Aluminum', val: 120 },
    { desc: 'USB-C Hub 7 port', val: 35 },
    { desc: 'Rice Cooker 3L', val: 65 },
    { desc: 'Bluetooth Speaker', val: 90 },
    { desc: 'Acetaminophen Tablets', val: 15 },
    { desc: 'Cat Veterinary Medicine', val: 42 },
    { desc: 'Frozen Seafood Shrimp 2kg', val: 75 },
    { desc: 'Baby Formula Powder', val: 48 },
    { desc: 'Smart Watch Band', val: 18 },
  ];
  
  const consignatarios = [
    { name: 'Juan Pérez', id: '8-814-1234' },
    { name: 'María González', id: '4-712-5678' },
    { name: 'Carlos Rodríguez', id: '3-456-7890' },
    { name: 'Ana Martínez', id: '8-900-1111' },
    { name: 'Juan Pérez', id: '8-814-1234' },
  ];

  return Array.from({ length: 30 }, (_, i) => {
    const item = descripciones[i % descripciones.length];
    const consig = consignatarios[i % consignatarios.length];
    return {
      id: crypto.randomUUID(),
      trackingNumber: `TBA${(300000000000 + i).toString()}`,
      mawb: i < 15 ? '618-12345678' : '230-87654321',
      description: item.desc,
      valueUSD: item.val + Math.random() * 20,
      weight: 0.5 + Math.random() * 5,
      recipient: consig.name,
      address: 'Panamá City',
      identification: consig.id,
      originalRowIndex: i,
    };
  });
}

// ─── Component ──────────────────────────────────────────

export default function FlujoCourierDashboard() {
  const [activeTab, setActiveTab] = useState('sniffer');
  const [demoData] = useState<ManifestRow[]>(generarDemoManifest);

  // Run all three engines on demo data
  const snifferResult = useMemo<ResultadoSnifferCourier>(() => {
    const filas = demoData.map(p => ({
      MAWB: p.mawb || '',
      TRACKING: p.trackingNumber,
      DESCRIPTION: p.description,
      VALUE: p.valueUSD.toString(),
    }));
    return ManifestSnifferCourier.analizarManifiesto(filas, {
      mawb: 'MAWB',
      tracking: 'TRACKING',
    });
  }, [demoData]);

  const agrupacionResult = useMemo<ResultadoAgrupacion>(() => {
    return AgrupadorLiquidaciones.agrupar(demoData);
  }, [demoData]);

  const sensibleResult = useMemo<ResultadoCargaSensible>(() => {
    return AlertaCargaSensible.analizar(demoData);
  }, [demoData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-wide text-foreground">
              Flujo Courier Alto Volumen
            </h1>
            <p className="text-sm text-muted-foreground">
              LEXIS Manifest Sniffer · Agrupador · Alerta Sensible
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-xs gap-1.5">
          <FileSpreadsheet className="w-3 h-3" />
          {demoData.length} paquetes demo
        </Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Guías Madre (MAWB)"
          value={snifferResult.totalMAWB}
          icon={<Layers className="w-4 h-4 text-primary" />}
        />
        <KPICard
          label="Guías Hija"
          value={snifferResult.totalHAWB}
          icon={<ArrowRightLeft className="w-4 h-4 text-primary" />}
        />
        <KPICard
          label="Ahorro en Tasas"
          value={`B/. ${agrupacionResult.resumen.ahorroTotal.toFixed(2)}`}
          icon={<TrendingDown className="w-4 h-4 text-success" />}
          highlight
        />
        <KPICard
          label="Carga Sensible"
          value={sensibleResult.resumen.totalSensibles}
          icon={<ShieldAlert className="w-4 h-4 text-destructive" />}
          alert={sensibleResult.resumen.requiereAccionInmediata}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="sniffer" className="gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" /> Manifest Sniffer
          </TabsTrigger>
          <TabsTrigger value="agrupador" className="gap-1.5 text-xs">
            <Boxes className="w-3.5 h-3.5" /> Agrupador
          </TabsTrigger>
          <TabsTrigger value="sensible" className="gap-1.5 text-xs">
            <ShieldAlert className="w-3.5 h-3.5" /> Carga Sensible
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Manifest Sniffer ─────────────────── */}
        <TabsContent value="sniffer" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Detección MAWB / HAWB
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Confianza: {snifferResult.confianza}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-foreground">{snifferResult.totalMAWB}</p>
                  <p className="text-xs text-muted-foreground">MAWB detectados</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-foreground">{snifferResult.totalHAWB}</p>
                  <p className="text-xs text-muted-foreground">Guías Hija</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-foreground">{snifferResult.formatoDetectado}</p>
                  <p className="text-xs text-muted-foreground">Formato</p>
                </div>
              </div>

              {snifferResult.carrierPrincipal && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle className="text-sm">Carrier Principal</AlertTitle>
                  <AlertDescription className="text-xs">
                    {snifferResult.carrierPrincipal} — {snifferResult.totalPaquetes} paquetes procesados
                  </AlertDescription>
                </Alert>
              )}

              <Accordion type="single" collapsible>
                {snifferResult.relaciones.map((rel, idx) => (
                  <AccordionItem key={idx} value={`rel-${idx}`}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {rel.mawb.valor}
                        </Badge>
                        <span className="text-muted-foreground">
                          {rel.carrier} · {rel.totalGuiasHijas} guías hijas
                        </span>
                        {rel.mawb.formatoIATA && (
                          <Badge className="bg-success/15 text-success border-success/30 text-[9px]">
                            IATA ✓
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {rel.hawbs.slice(0, 20).map((h, j) => (
                          <div key={j} className="text-xs font-mono p-1.5 rounded bg-muted/40 border border-border/30">
                            {h.valor}
                            <span className="text-muted-foreground ml-1">({h.carrier || h.tipo})</span>
                          </div>
                        ))}
                        {rel.hawbs.length > 20 && (
                          <div className="text-xs text-muted-foreground p-1.5">
                            +{rel.hawbs.length - 20} más...
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Alertas del sniffer */}
              {snifferResult.alertas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertas</p>
                  {snifferResult.alertas.map((al, i) => (
                    <Alert key={i} variant={al.tipo === 'error' ? 'destructive' : 'default'}>
                      {al.tipo === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      <AlertDescription className="text-xs">{al.mensaje}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Agrupador ────────────────────────── */}
        <TabsContent value="agrupador" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                Consolidación de Declaraciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen de ahorro */}
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Optimización de Tasas</span>
                  <Badge className="bg-success/15 text-success border-success/30 text-xs">
                    -{agrupacionResult.resumen.porcentajeAhorro}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-muted-foreground line-through">
                      B/. {agrupacionResult.resumen.tasasTotalesOriginales.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Individual</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-success">
                      B/. {agrupacionResult.resumen.tasasTotalesOptimizadas.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Agrupado</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">
                      B/. {agrupacionResult.resumen.ahorroTotal.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Ahorro</p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Simplificadas" value={agrupacionResult.resumen.declaracionesSimplificadas} color="text-primary" />
                <StatCard label="Individuales" value={agrupacionResult.resumen.declaracionesIndividuales} color="text-muted-foreground" />
                <StatCard label="Sensibles" value={agrupacionResult.resumen.declaracionesSensibles} color="text-destructive" />
              </div>

              <Separator />

              {/* Grupos */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {agrupacionResult.grupos.map((grupo) => (
                  <div
                    key={grupo.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      grupo.tipo === 'sensible'
                        ? 'border-destructive/30 bg-destructive/5'
                        : grupo.tipo === 'simplificada'
                        ? 'border-success/30 bg-success/5'
                        : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            grupo.tipo === 'sensible' ? 'bg-destructive/10 text-destructive border-destructive/30'
                              : grupo.tipo === 'simplificada' ? 'bg-success/10 text-success border-success/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {grupo.tipo === 'simplificada' ? 'Agrupada' : grupo.tipo === 'sensible' ? 'Sensible' : 'Individual'}
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {grupo.consignatarioNombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{grupo.totalPaquetes} paq.</span>
                        <span className="font-mono">${grupo.totalCIF.toFixed(2)} CIF</span>
                        <Badge variant="outline" className="text-[9px]">Cat {grupo.categoriaResultante}</Badge>
                      </div>
                    </div>
                    {grupo.ahorro > 0 && (
                      <p className="text-[10px] text-success flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Ahorro: B/. {grupo.ahorro.toFixed(2)}
                      </p>
                    )}
                    {grupo.agenciasInvolucradas.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {grupo.agenciasInvolucradas.map(ag => (
                          <Badge key={ag} variant="outline" className="text-[8px] bg-destructive/10 text-destructive border-destructive/20">
                            {ag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Alertas del agrupador */}
              {agrupacionResult.alertas.length > 0 && (
                <div className="space-y-2">
                  {agrupacionResult.alertas.map((al, i) => (
                    <Alert key={i} variant={al.tipo === 'error' ? 'destructive' : 'default'}>
                      {al.tipo === 'info' ? <Info className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <AlertDescription className="text-xs">
                        {al.mensaje}
                        {al.fundamentoLegal && (
                          <span className="block text-muted-foreground mt-0.5 italic">{al.fundamentoLegal}</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Carga Sensible ───────────────────── */}
        <TabsContent value="sensible" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                Priorización de Carga Sensible — Stella
                {sensibleResult.resumen.requiereAccionInmediata && (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] ml-auto animate-pulse">
                    Acción Inmediata
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                  <p className="text-xl font-bold text-destructive">{sensibleResult.resumen.porPrioridad.critica}</p>
                  <p className="text-[10px] text-muted-foreground">Críticos</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-center">
                  <p className="text-xl font-bold text-warning">{sensibleResult.resumen.porPrioridad.alta}</p>
                  <p className="text-[10px] text-muted-foreground">Alta Prioridad</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                  <p className="text-xl font-bold text-muted-foreground">{sensibleResult.resumen.porPrioridad.media}</p>
                  <p className="text-[10px] text-muted-foreground">Media</p>
                </div>
                <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
                  <p className="text-xl font-bold text-success">{sensibleResult.resumen.totalGenerales}</p>
                  <p className="text-[10px] text-muted-foreground">Flujo General</p>
                </div>
              </div>

              {/* Agencias involucradas */}
              {Object.keys(sensibleResult.resumen.porAgencia).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sensibleResult.resumen.porAgencia).map(([ag, count]) => (
                    <Badge key={ag} variant="outline" className="gap-1 text-xs">
                      {ag}: {count}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              {/* Lista de alertas sensibles */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sensibleResult.alertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`p-3 rounded-lg border ${
                      alerta.prioridad === 'critica'
                        ? 'border-destructive/30 bg-destructive/5'
                        : alerta.prioridad === 'alta'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              alerta.prioridad === 'critica' ? 'bg-destructive/10 text-destructive'
                                : alerta.prioridad === 'alta' ? 'bg-warning/10 text-warning'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {alerta.prioridad.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono text-foreground">
                            {alerta.paquete.trackingNumber}
                          </span>
                          {alerta.agencias.map(ag => (
                            <Badge key={ag} variant="outline" className="text-[8px]">{ag}</Badge>
                          ))}
                        </div>
                        <p className="text-sm text-foreground/80">
                          {alerta.paquete.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alerta.paquete.recipient} · ${alerta.paquete.valueUSD.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Stella's note */}
                    <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-medium text-primary">Stella</span>
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        {alerta.stellaNota}
                      </p>
                    </div>

                    {alerta.permisosFaltantes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alerta.permisosFaltantes.map((perm, i) => (
                          <Badge key={i} variant="outline" className="text-[8px] bg-warning/10 text-warning border-warning/20">
                            📋 {perm}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/60 mt-1.5 italic">
                      {alerta.etaAccion} — {alerta.fundamentoLegal.split('|')[0]}
                    </p>
                  </div>
                ))}
              </div>

              {sensibleResult.alertas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground/50">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No se detectó carga sensible en este manifiesto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Small components ───────────────────────────────────

function KPICard({ label, value, icon, highlight, alert: isAlert }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className={`card-elevated ${isAlert ? 'border-destructive/30' : highlight ? 'border-success/30' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          {icon}
          {isAlert && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
        </div>
        <p className={`text-xl font-bold ${highlight ? 'text-success' : isAlert ? 'text-destructive' : 'text-foreground'}`}>
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
