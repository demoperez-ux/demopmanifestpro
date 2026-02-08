/**
 * ENTERPRISE BILLING DASHBOARD
 * 
 * Módulo de facturación y reconciliación con:
 * 1. Contratos de servicio por cliente
 * 2. Proforma masiva: Impuestos vs. Honorarios
 * 3. Reconciliación Boleta ANA vs. Factura Cliente
 * 4. Exportación Audit-Ready (ZIP)
 * 5. Stella Cash Flow Insights
 */

import { useState, useMemo } from 'react';
import {
  Receipt, FileArchive, Scale, AlertTriangle, Sparkles,
  TrendingUp, DollarSign, Users, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Download, FileSpreadsheet, Settings2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  MotorFacturacionEnterprise,
  generarDemoProforma,
  generarDemoReconciliacion,
  generarContratosDemo,
  type ProformaMasiva,
  type ItemReconciliacion,
  type ContratoServicio,
  type StellaInsightCashFlow,
} from '@/lib/financiero/MotorFacturacionEnterprise';

export default function EnterpriseBillingDashboard() {
  const [proforma] = useState<ProformaMasiva>(() => generarDemoProforma());
  const [reconciliacion] = useState<ItemReconciliacion[]>(() => generarDemoReconciliacion());
  const [contratos] = useState<ContratoServicio[]>(() => generarContratosDemo());
  const [exportando, setExportando] = useState(false);

  const resumenRec = useMemo(() =>
    MotorFacturacionEnterprise.reconciliar(reconciliacion),
    [reconciliacion]
  );

  const stellaInsights = useMemo(() =>
    MotorFacturacionEnterprise.stellaCashFlowInsights({
      totalImpuestos: proforma.totalImpuestos,
      totalGuias: proforma.totalGuias,
      promedioHistorico: 120,
      mawb: proforma.mawb,
      carrier: 'Temu',
    }),
    [proforma]
  );

  const handleExportZIP = async () => {
    setExportando(true);
    try {
      await MotorFacturacionEnterprise.generarPaqueteFacturacionDigital(proforma, reconciliacion);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">
              Enterprise Billing
            </h1>
            <p className="text-sm text-muted-foreground">
              Facturación & Reconciliación — {proforma.mawb} · {proforma.totalGuias} guías
            </p>
          </div>
        </div>
        <Button
          onClick={handleExportZIP}
          disabled={exportando}
          className="gap-1.5"
          size="sm"
        >
          <FileArchive className="w-4 h-4" />
          {exportando ? 'Generando...' : 'Generar Paquete de Facturación Digital'}
        </Button>
      </div>

      {/* Stella Cash Flow Insights */}
      {(stellaInsights.length > 0 || proforma.stellaInsight) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-warning-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Stella — Cash Flow Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proforma.stellaInsight && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-foreground/80 leading-relaxed italic">{proforma.stellaInsight}</p>
              </div>
            )}
            {stellaInsights.map((insight, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                insight.severidad === 'critico'
                  ? 'bg-destructive/5 border-destructive/20'
                  : 'bg-warning/5 border-warning/20'
              }`}>
                <p className="text-xs font-medium text-foreground mb-1">{insight.titulo}</p>
                <p className="text-xs text-foreground/70 leading-relaxed">{insight.mensaje}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KPICard
          label="Total Impuestos (ANA)"
          value={`$${proforma.totalImpuestos.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4 text-destructive" />}
          sub="Pagar a la ANA"
          variant="destructive"
        />
        <KPICard
          label="Total Honorarios"
          value={`$${proforma.totalHonorarios.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4 text-success" />}
          sub="Ingresos Agencia"
          variant="success"
        />
        <KPICard
          label="Gran Total"
          value={`$${proforma.granTotal.toLocaleString()}`}
          icon={<Receipt className="w-4 h-4 text-primary" />}
          sub="Cobrar al cliente"
        />
        <KPICard
          label="Conciliación"
          value={`${resumenRec.porcentajeConciliado}%`}
          icon={<Scale className="w-4 h-4 text-primary" />}
          sub={`${resumenRec.itemsConDiscrepancia} discrepancias`}
          variant={resumenRec.porcentajeConciliado >= 95 ? 'success' : 'warning'}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="proforma" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="proforma" className="text-xs gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Proforma
          </TabsTrigger>
          <TabsTrigger value="reconciliacion" className="text-xs gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Reconciliación
          </TabsTrigger>
          <TabsTrigger value="contratos" className="text-xs gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="exportacion" className="text-xs gap-1.5">
            <FileArchive className="w-3.5 h-3.5" /> Exportación
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Proforma Masiva ── */}
        <TabsContent value="proforma" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Impuestos */}
            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-destructive" />
                  Impuestos a Pagar (ANA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ProformaRow label="DAI — Derechos Arancelarios" value={proforma.totalDAI} />
                <ProformaRow label="ISC — Selectivo al Consumo" value={proforma.totalISC} />
                <ProformaRow label="ITBMS — Transferencia (7%)" value={proforma.totalITBMS} />
                <ProformaRow label={`Tasa Sistema ANA (${proforma.totalGuias} × B/.3.00)`} value={proforma.totalTasaSistema} />
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">TOTAL IMPUESTOS</span>
                  <span className="text-lg font-bold text-destructive">${proforma.totalImpuestos.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Honorarios */}
            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Honorarios de Agencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ProformaRow label="Corretaje Aduanero (Res. 222)" value={proforma.honorariosCorretaje} variant="success" />
                <ProformaRow label={`Handling (${proforma.totalGuias} guías)`} value={proforma.handlingTotal} variant="success" />
                <ProformaRow label="Recargos Permisos Especiales" value={proforma.recargosEspeciales} variant="success" />
                <ProformaRow label="ITBMS sobre Servicios (7%)" value={proforma.itbmsServicios} />
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">TOTAL HONORARIOS</span>
                  <span className="text-lg font-bold text-success">${proforma.totalHonorarios.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle de líneas */}
          <Collapsible>
            <Card className="card-elevated">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    Detalle de Líneas ({proforma.lineas.length})
                    <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Concepto</TableHead>
                        <TableHead className="text-[10px] text-center">Cant.</TableHead>
                        <TableHead className="text-[10px] text-right">P/U</TableHead>
                        <TableHead className="text-[10px] text-right">Subtotal</TableHead>
                        <TableHead className="text-[10px]">Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proforma.lineas.map((l, i) => (
                        <TableRow key={i} className="text-xs">
                          <TableCell className="py-1.5 text-[11px]">{l.concepto}</TableCell>
                          <TableCell className="py-1.5 text-center font-mono text-[11px]">{l.cantidad}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono text-[11px]">${l.precioUnitario.toFixed(2)}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono font-medium text-[11px]">${l.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className={`text-[8px] ${
                              l.tipo === 'impuesto' ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : l.tipo === 'honorario' ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }`}>
                              {l.tipo}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Gran Total */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">GRAN TOTAL A COBRAR</p>
                <p className="text-[10px] text-muted-foreground">Impuestos + Honorarios + ITBMS Servicios</p>
              </div>
              <span className="text-2xl font-bold text-primary">${proforma.granTotal.toLocaleString()}</span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Reconciliación ── */}
        <TabsContent value="reconciliacion" className="space-y-3">
          {/* Resumen conciliación */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KPICard label="Total Boleta ANA" value={`$${resumenRec.totalBoletaANA.toLocaleString()}`} icon={<DollarSign className="w-3.5 h-3.5 text-destructive" />} />
            <KPICard label="Total Factura Cliente" value={`$${resumenRec.totalFacturaCliente.toLocaleString()}`} icon={<Receipt className="w-3.5 h-3.5 text-primary" />} />
            <KPICard
              label="Diferencia Global"
              value={`$${Math.abs(resumenRec.diferenciaGlobal).toLocaleString()}`}
              icon={resumenRec.diferenciaGlobal >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              variant={Math.abs(resumenRec.diferenciaGlobal) < 50 ? 'success' : 'warning'}
            />
            <KPICard
              label="Conciliación"
              value={`${resumenRec.porcentajeConciliado}%`}
              icon={<Scale className="w-3.5 h-3.5 text-primary" />}
              variant={resumenRec.porcentajeConciliado >= 95 ? 'success' : resumenRec.porcentajeConciliado >= 80 ? 'warning' : 'destructive'}
            />
          </div>

          <Progress
            value={resumenRec.porcentajeConciliado}
            className="h-2"
          />

          {/* Tabla de reconciliación */}
          <Card className="card-elevated">
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="text-[10px]">Estado</TableHead>
                      <TableHead className="text-[10px]">Guía</TableHead>
                      <TableHead className="text-[10px]">Consignatario</TableHead>
                      <TableHead className="text-[10px] text-right">Boleta ANA</TableHead>
                      <TableHead className="text-[10px] text-right">Factura Imp.</TableHead>
                      <TableHead className="text-[10px] text-right">Diferencia</TableHead>
                      <TableHead className="text-[10px] text-right">Factura Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliacion.map((item, i) => (
                      <TableRow
                        key={i}
                        className={`text-xs ${
                          item.severidadDiscrepancia === 'mayor' ? 'bg-destructive/5'
                            : item.severidadDiscrepancia === 'menor' ? 'bg-warning/5'
                            : ''
                        }`}
                      >
                        <TableCell className="py-1.5">
                          {item.severidadDiscrepancia === 'mayor' ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : item.severidadDiscrepancia === 'menor' ? (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-[11px]">{item.guia.slice(-10)}</TableCell>
                        <TableCell className="py-1.5 text-[11px]">{item.consignatario}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[11px]">${item.boletaANA_Total.toFixed(2)}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[11px]">${item.facturaCliente_Impuestos.toFixed(2)}</TableCell>
                        <TableCell className={`py-1.5 text-right font-mono font-bold text-[11px] ${
                          item.severidadDiscrepancia === 'mayor' ? 'text-destructive'
                            : item.severidadDiscrepancia === 'menor' ? 'text-warning'
                            : 'text-success'
                        }`}>
                          {item.diferenciaImpuestos >= 0 ? '+' : ''}${item.diferenciaImpuestos.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[11px]">${item.facturaCliente_Total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {resumenRec.itemsDiscrepanciaMayor > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">
                    {resumenRec.itemsDiscrepanciaMayor} discrepancia(s) mayor(es) detectada(s)
                  </p>
                  <p className="text-[10px] text-foreground/60 mt-0.5">
                    Los montos resaltados en rojo presentan una diferencia &gt;15% entre la Boleta ANA y la Factura al Cliente. Requiere revisión del contador antes de cerrar el ciclo de facturación.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Contratos de Servicio ── */}
        <TabsContent value="contratos" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {contratos.map(c => (
              <Card key={c.id} className="card-interactive">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{c.clienteNombre}</CardTitle>
                    <Badge variant="outline" className="text-[8px] bg-success/10 text-success border-success/20">
                      Activo
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{c.clienteRuc}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guía Courier</span>
                      <span className="font-mono font-medium">${c.precioGuiaCourier.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trámite Formal</span>
                      <span className="font-mono font-medium">${c.precioTramiteFormal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permiso Especial</span>
                      <span className="font-mono font-medium">${c.recargoPermisoEspecial.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hon. Mínimo</span>
                      <span className="font-mono font-medium">${c.honorarioMinimo.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      Descuentos: {c.descuentoVolumen10}% / {c.descuentoVolumen50}% / {c.descuentoVolumen100}% (10/50/100+ guías)
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: Exportación Audit-Ready ── */}
        <TabsContent value="exportacion" className="space-y-3">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-primary" />
                Paquete de Facturación Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Genera un archivo .ZIP con toda la documentación de facturación lista para auditoría:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { icon: '📄', name: 'Factura Comercial (XML)', desc: 'Formato estructurado para importación SAP/ERP' },
                  { icon: '📊', name: 'Factura Comercial (JSON)', desc: 'Machine-readable para sistemas automatizados' },
                  { icon: '📋', name: 'Reporte Detallado (Excel)', desc: 'Resumen ejecutivo + líneas + reconciliación' },
                  { icon: '🧾', name: 'Reconciliación ANA (CSV)', desc: 'Comparativo Boleta ANA vs. Factura Cliente' },
                ].map((doc, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-lg">{doc.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleExportZIP}
                disabled={exportando}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                {exportando ? 'Generando Paquete...' : `Descargar Paquete — ${proforma.mawb}`}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                El paquete incluye sello Zod de integridad y está listo para presentación ante la ANA o auditorías externas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────

function ProformaRow({ label, value, variant }: {
  label: string;
  value: number;
  variant?: 'success' | 'destructive';
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono font-medium ${
        variant === 'success' ? 'text-success'
          : variant === 'destructive' ? 'text-destructive'
          : 'text-foreground'
      }`}>
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function KPICard({ label, value, icon, sub, variant }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  variant?: 'success' | 'warning' | 'destructive';
}) {
  return (
    <div className={`p-3 rounded-lg border ${
      variant === 'destructive' ? 'border-destructive/30 bg-destructive/5'
        : variant === 'success' ? 'border-success/30 bg-success/5'
        : variant === 'warning' ? 'border-warning/30 bg-warning/5'
        : 'border-border/50 bg-card'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <p className={`text-lg font-bold ${
        variant === 'destructive' ? 'text-destructive'
          : variant === 'success' ? 'text-success'
          : 'text-foreground'
      }`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[8px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}
