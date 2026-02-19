/**
 * STELLA CLIENT PORTAL — Interfaz Agnóstica para Clientes Finales
 * Permite consultar ahorros fiscales (calculados por ZOD) y estado de trámites.
 *
 * @maintained-by Core Development Team
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Shield, Package, Clock,
  CheckCircle2, AlertTriangle, DollarSign, BarChart3,
  Sparkles, FileText, ArrowRight, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ShipmentStatus {
  id: string;
  reference: string;
  description: string;
  status: 'pending' | 'processing' | 'customs_review' | 'cleared' | 'delivered';
  cifValue: number;
  totalTaxes: number;
  savingsApplied: number;
  savingsType: string;
  region: 'PA' | 'CR' | 'GT';
  createdAt: string;
  estimatedClearance: string;
  zodScore: number;
}

interface FiscalSaving {
  concept: string;
  originalAmount: number;
  optimizedAmount: number;
  savings: number;
  legalBasis: string;
  appliedBy: string;
}

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

const DEMO_SHIPMENTS: ShipmentStatus[] = [
  {
    id: 'EXP-2026-001',
    reference: 'MAWB 180-12345678',
    description: 'Equipos médicos — Insumos de diagnóstico',
    status: 'cleared',
    cifValue: 28500,
    totalTaxes: 4275,
    savingsApplied: 1995,
    savingsType: 'TLC PA-USA Art. 3.3',
    region: 'PA',
    createdAt: '2026-02-15T10:00:00Z',
    estimatedClearance: '2026-02-17T16:00:00Z',
    zodScore: 98,
  },
  {
    id: 'EXP-2026-002',
    reference: 'MAWB 180-87654321',
    description: 'Repuestos industriales — Maquinaria textil',
    status: 'processing',
    cifValue: 15200,
    totalTaxes: 2736,
    savingsApplied: 760,
    savingsType: 'Exoneración Zona Franca',
    region: 'PA',
    createdAt: '2026-02-18T08:30:00Z',
    estimatedClearance: '2026-02-20T14:00:00Z',
    zodScore: 92,
  },
  {
    id: 'EXP-2026-003',
    reference: 'BL MSCUGT-445566',
    description: 'Materias primas — Resinas plásticas',
    status: 'customs_review',
    cifValue: 42000,
    totalTaxes: 7140,
    savingsApplied: 0,
    savingsType: 'Pendiente análisis',
    region: 'GT',
    createdAt: '2026-02-19T06:00:00Z',
    estimatedClearance: '2026-02-22T12:00:00Z',
    zodScore: 85,
  },
  {
    id: 'EXP-2026-004',
    reference: 'AWB 235-99887766',
    description: 'Productos farmacéuticos — Genéricos OTC',
    status: 'pending',
    cifValue: 8900,
    totalTaxes: 1157,
    savingsApplied: 445,
    savingsType: 'Reducción DAI — Partida 3004',
    region: 'CR',
    createdAt: '2026-02-19T09:00:00Z',
    estimatedClearance: '2026-02-21T10:00:00Z',
    zodScore: 95,
  },
];

const DEMO_SAVINGS: FiscalSaving[] = [
  { concept: 'Preferencia arancelaria TLC PA-USA', originalAmount: 2850, optimizedAmount: 855, savings: 1995, legalBasis: 'TLC PA-USA Cap. 3, Art. 3.3', appliedBy: 'Motor de Optimización Fiscal' },
  { concept: 'Exoneración parcial Zona Franca', originalAmount: 1520, optimizedAmount: 760, savings: 760, legalBasis: 'Ley 32 de 2011 — Zonas Francas', appliedBy: 'Motor de Regímenes Especiales' },
  { concept: 'Reducción DAI farmacéuticos', originalAmount: 890, optimizedAmount: 445, savings: 445, legalBasis: 'Arancel Nacional — Partida 3004', appliedBy: 'Motor de Clasificación Arancelaria' },
];

const STATUS_CONFIG: Record<ShipmentStatus['status'], { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendiente', color: 'text-muted-foreground', icon: Clock },
  processing: { label: 'En Proceso', color: 'text-blue-400', icon: Package },
  customs_review: { label: 'Revisión Aduanera', color: 'text-amber-400', icon: AlertTriangle },
  cleared: { label: 'Despachado', color: 'text-green-400', icon: CheckCircle2 },
  delivered: { label: 'Entregado', color: 'text-primary', icon: CheckCircle2 },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function StellaClientPortal() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentStatus | null>(null);

  const filteredShipments = useMemo(() => {
    if (!searchTerm) return DEMO_SHIPMENTS;
    const term = searchTerm.toLowerCase();
    return DEMO_SHIPMENTS.filter(s =>
      s.id.toLowerCase().includes(term) ||
      s.reference.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const totalSavings = DEMO_SAVINGS.reduce((s, item) => s + item.savings, 0);
  const totalOriginal = DEMO_SAVINGS.reduce((s, item) => s + item.originalAmount, 0);
  const savingsPercent = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0;

  const activeShipments = DEMO_SHIPMENTS.filter(s => s.status !== 'cleared' && s.status !== 'delivered').length;
  const avgZodScore = Math.round(DEMO_SHIPMENTS.reduce((s, sh) => s + sh.zodScore, 0) / DEMO_SHIPMENTS.length);

  return (
    <div className="space-y-6">
      {/* Header con IA */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground tracking-wide">
            Portal de Cliente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte el estado de sus trámites y los ahorros fiscales aplicados a sus operaciones.
          </p>
        </div>
        <Badge variant="outline" className="border-stella/30 text-stella gap-1.5 px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Asistente Activo
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Ahorro Total</p>
                <p className="text-2xl font-bold text-green-400 font-mono">${totalSavings.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-green-400/70 mt-1">{savingsPercent.toFixed(1)}% optimizado</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Trámites Activos</p>
                <p className="text-2xl font-bold text-foreground font-mono">{activeShipments}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">de {DEMO_SHIPMENTS.length} totales</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Integridad</p>
                <p className="text-2xl font-bold text-primary font-mono">{avgZodScore}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score promedio</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">CIF Total</p>
                <p className="text-2xl font-bold text-foreground font-mono">
                  ${DEMO_SHIPMENTS.reduce((s, sh) => s + sh.cifValue, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor acumulado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="shipments" className="gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" /> Trámites
          </TabsTrigger>
          <TabsTrigger value="savings" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Ahorros Fiscales
          </TabsTrigger>
        </TabsList>

        {/* Shipments Tab */}
        <TabsContent value="shipments" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por expediente, MAWB o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-border/50"
            />
          </div>

          <div className="space-y-3">
            {filteredShipments.map((shipment) => {
              const statusCfg = STATUS_CONFIG[shipment.status];
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedShipment?.id === shipment.id;

              return (
                <Card
                  key={shipment.id}
                  className={`glass-panel cursor-pointer transition-all hover:border-primary/30 ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}
                  onClick={() => setSelectedShipment(isSelected ? null : shipment)}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold font-mono text-foreground">{shipment.id}</span>
                          <Badge variant="outline" className={`text-[10px] ${statusCfg.color} border-current/30 gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {shipment.region}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{shipment.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{shipment.reference}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">${shipment.cifValue.toLocaleString()}</p>
                        {shipment.savingsApplied > 0 && (
                          <p className="text-xs text-green-400 flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            -${shipment.savingsApplied.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="p-2 rounded bg-muted/30">
                            <p className="text-muted-foreground">Impuestos</p>
                            <p className="font-mono font-medium text-foreground">${shipment.totalTaxes.toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/30">
                            <p className="text-muted-foreground">Integridad</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Progress value={shipment.zodScore} className="h-1.5 flex-1" />
                              <span className="font-mono font-medium text-foreground">{shipment.zodScore}%</span>
                            </div>
                          </div>
                          <div className="p-2 rounded bg-muted/30">
                            <p className="text-muted-foreground">Optimización</p>
                            <p className="font-medium text-green-400">{shipment.savingsType}</p>
                          </div>
                        </div>

                        {/* Stella Insight */}
                        <div className="p-3 rounded-lg bg-stella/5 border border-stella/20">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-stella mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-stella">Análisis del Asistente</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {shipment.savingsApplied > 0
                                  ? `Se aplicó una optimización de $${shipment.savingsApplied.toLocaleString()} mediante ${shipment.savingsType}. El expediente cumple con todos los requisitos documentales y fiscales.`
                                  : 'Expediente en revisión. Una vez completada la clasificación arancelaria, se evaluarán las opciones de optimización fiscal disponibles.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {filteredShipments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron trámites con ese criterio.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Savings Tab */}
        <TabsContent value="savings" className="space-y-4">
          <Card className="glass-panel border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Resumen de Optimización Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-green-400 font-mono">${totalSavings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Ahorro acumulado este período</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{savingsPercent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Tasa de optimización</p>
                </div>
              </div>
              <Progress value={savingsPercent} className="h-2" />
            </CardContent>
          </Card>

          <div className="space-y-3">
            {DEMO_SAVINGS.map((saving, idx) => (
              <Card key={idx} className="glass-panel">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{saving.concept}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{saving.legalBasis}</p>
                      <Badge variant="outline" className="text-[10px] mt-1.5 text-muted-foreground">
                        <FileText className="w-3 h-3 mr-1" />
                        {saving.appliedBy}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="line-through">${saving.originalAmount.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-foreground font-medium">${saving.optimizedAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-bold text-green-400 mt-0.5">
                        -${saving.savings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stella Note */}
          <Card className="glass-panel border-stella/20 bg-stella/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-stella mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stella">Recomendación del Asistente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basado en su perfil de importación, existen oportunidades adicionales de optimización
                    mediante acuerdos comerciales vigentes. Solicite un análisis detallado de sus partidas
                    arancelarias más frecuentes para maximizar los beneficios disponibles.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 text-xs border-stella/30 text-stella hover:bg-stella/10 gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Solicitar Análisis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-center text-xs text-muted-foreground/50 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-primary/50" />
              <span>Verificado por Motor de Integridad</span>
            </div>
            <p>ZENITH — Copiloto de Inteligencia Aduanera</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
