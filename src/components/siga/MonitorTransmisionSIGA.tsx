// ============================================
// MONITOR DE TRANSMISIÓN SIGA
// Estado en tiempo real de transmisiones al
// Sistema Integrado de Gestión Aduanera
// ============================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send, CheckCircle2, AlertTriangle, XCircle, Clock,
  RotateCcw, Eye, Sparkles, Shield, FileText,
  Radio, Loader2, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TransmisionSIGA, EstadoTransmision,
  generarTransmisionesDemo, generarBoletaPago, BoletaPago
} from '@/lib/siga/SimuladorTransmisionSIGA';
import { generarMensajeXML, generarDeclaracionDemo } from '@/lib/siga/GeneradorMensajesSIGA';
import { toast } from 'sonner';

const ESTADO_CONFIG: Record<EstadoTransmision, {
  label: string; color: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  preparando: { label: 'Preparando', color: 'bg-muted text-muted-foreground', icon: Clock },
  firmando: { label: 'Firmando', color: 'bg-info-light text-info', icon: Shield },
  enviando: { label: 'Enviando...', color: 'bg-info-light text-info', icon: Loader2 },
  recibido_ana: { label: 'Recibido por ANA', color: 'bg-info-light text-info', icon: Radio },
  procesando_ana: { label: 'Procesando ANA', color: 'bg-warning-light text-warning', icon: Loader2 },
  liquidacion_asignada: { label: 'Liquidación Asignada', color: 'bg-success-light text-success', icon: CheckCircle2 },
  error_conexion: { label: 'Error de Conexión', color: 'bg-destructive-light text-destructive', icon: XCircle },
  error_validacion: { label: 'Error de Validación', color: 'bg-destructive-light text-destructive', icon: AlertTriangle },
  error_ruc: { label: 'Error RUC', color: 'bg-destructive-light text-destructive', icon: XCircle },
};

export default function MonitorTransmisionSIGA() {
  const [transmisiones, setTransmisiones] = useState<TransmisionSIGA[]>([]);
  const [selectedTx, setSelectedTx] = useState<TransmisionSIGA | null>(null);
  const [xmlPreview, setXmlPreview] = useState<string>('');
  const [boletas, setBoletas] = useState<BoletaPago[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const demo = generarTransmisionesDemo(8);
    setTransmisiones(demo);
    // Generate boletas for successful ones
    const boletasGen = demo
      .filter(tx => tx.estado === 'liquidacion_asignada')
      .map(tx => generarBoletaPago(tx))
      .filter(Boolean) as BoletaPago[];
    setBoletas(boletasGen);
  }, []);

  const handleNuevaTransmision = async () => {
    setEnviando(true);
    const datos = generarDeclaracionDemo();
    const mensaje = await generarMensajeXML(datos);

    // Simulate transmission phases
    const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const baseTx: TransmisionSIGA = {
      id: txId,
      declaracionId: datos.id,
      consignatario: datos.consignatarioNombre,
      ruc: datos.consignatarioRUC,
      tipoDeclaracion: datos.tipoDeclaracion,
      codigoRegimen: datos.codigoRegimen,
      valorCIF: datos.valorCIF,
      totalLiquidacion: datos.totalLiquidacion,
      estado: 'preparando',
      timestampInicio: new Date().toISOString(),
      timestampActual: new Date().toISOString(),
      latenciaMs: 0,
      zodIntegridad: 'Integridad verificada antes del envío: OK',
      hashXML: mensaje.hashIntegridad.substring(0, 16),
      intentos: 1,
    };

    setTransmisiones(prev => [baseTx, ...prev]);

    // Phase progression
    const phases: EstadoTransmision[] = ['firmando', 'enviando', 'recibido_ana', 'procesando_ana'];
    for (const phase of phases) {
      await new Promise(r => setTimeout(r, 800));
      setTransmisiones(prev => prev.map(tx =>
        tx.id === txId ? { ...tx, estado: phase, timestampActual: new Date().toISOString() } : tx
      ));
    }

    await new Promise(r => setTimeout(r, 1200));

    // Final state
    const success = Math.random() > 0.25;
    if (success) {
      const numLiq = `LIQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
      setTransmisiones(prev => prev.map(tx =>
        tx.id === txId ? {
          ...tx,
          estado: 'liquidacion_asignada' as EstadoTransmision,
          numeroLiquidacion: numLiq,
          latenciaMs: Date.now() - new Date(baseTx.timestampInicio).getTime(),
          timestampActual: new Date().toISOString(),
        } : tx
      ));

      toast.success('Liquidación Asignada', {
        description: `N° ${numLiq} — ${datos.consignatarioNombre}`,
        duration: 5000,
      });

      // Generate boleta
      const boleta: BoletaPago = {
        id: `BOL-${Date.now().toString(36).toUpperCase()}`,
        numeroLiquidacion: numLiq,
        declaracionId: datos.id,
        consignatario: datos.consignatarioNombre,
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: new Date(Date.now() + 15 * 86400000).toISOString(),
        totalPagar: datos.totalLiquidacion,
        estado: 'pendiente',
        urlPDF: '#',
        archivadaEn: `LEXIS Archive / ${datos.id} / Boletas`,
      };
      setBoletas(prev => [boleta, ...prev]);
    } else {
      setTransmisiones(prev => prev.map(tx =>
        tx.id === txId ? {
          ...tx,
          estado: 'error_validacion' as EstadoTransmision,
          codigoError: 'SIGA-002',
          mensajeError: 'Clasificación arancelaria no válida para el régimen declarado.',
          stellaTraduccion: 'La partida arancelaria que declaramos no es compatible con el régimen seleccionado. Revisemos la clasificación antes de reenviar.',
          latenciaMs: Date.now() - new Date(baseTx.timestampInicio).getTime(),
          timestampActual: new Date().toISOString(),
        } : tx
      ));

      toast.error('Error de Validación SIGA', {
        description: 'Clasificación arancelaria no válida. Ver detalles.',
        duration: 5000,
      });
    }

    setEnviando(false);
  };

  const handleReintentar = (txId: string) => {
    setTransmisiones(prev => prev.map(tx => {
      if (tx.id !== txId) return tx;
      return {
        ...tx,
        estado: 'liquidacion_asignada' as EstadoTransmision,
        codigoError: undefined,
        mensajeError: undefined,
        stellaTraduccion: undefined,
        numeroLiquidacion: `LIQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
        intentos: tx.intentos + 1,
        timestampActual: new Date().toISOString(),
      };
    }));
    toast.success('Reintento exitoso — Liquidación asignada');
  };

  const handleVerDetalle = async (tx: TransmisionSIGA) => {
    setSelectedTx(tx);
    const datos = generarDeclaracionDemo();
    datos.id = tx.declaracionId;
    datos.consignatarioNombre = tx.consignatario;
    datos.consignatarioRUC = tx.ruc;
    const mensaje = await generarMensajeXML(datos);
    setXmlPreview(mensaje.xml);
  };

  // KPIs
  const exitosas = transmisiones.filter(t => t.estado === 'liquidacion_asignada').length;
  const enProceso = transmisiones.filter(t => ['enviando', 'recibido_ana', 'procesando_ana', 'preparando', 'firmando'].includes(t.estado)).length;
  const errores = transmisiones.filter(t => t.estado.startsWith('error')).length;
  const latenciaPromedio = transmisiones.length > 0
    ? Math.round(transmisiones.reduce((s, t) => s + t.latenciaMs, 0) / transmisiones.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Transmisiones</p>
          <p className="text-xl font-bold">{transmisiones.length}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-success">Exitosas</p>
          <p className="text-xl font-bold text-success">{exitosas}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-info">En Proceso</p>
          <p className="text-xl font-bold text-info">{enProceso}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-destructive">Errores</p>
          <p className="text-xl font-bold text-destructive">{errores}</p>
        </Card>
        <Card className="card-elevated p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latencia Avg.</p>
          <p className="text-xl font-bold">{latenciaPromedio}<span className="text-xs font-normal text-muted-foreground">ms</span></p>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Estado de Transmisión</h3>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleNuevaTransmision}
          disabled={enviando}
        >
          {enviando ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Transmitiendo...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Nueva Transmisión SIGA
            </>
          )}
        </Button>
      </div>

      {/* Transmission Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Declaración</TableHead>
                <TableHead className="text-xs">Consignatario</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs text-right">CIF</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs">N° Liquidación</TableHead>
                <TableHead className="text-xs text-right">Latencia</TableHead>
                <TableHead className="text-xs text-center">Zod</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transmisiones.map(tx => {
                const config = ESTADO_CONFIG[tx.estado];
                const Icon = config.icon;
                const isError = tx.estado.startsWith('error');
                const isLoading = ['enviando', 'procesando_ana'].includes(tx.estado);

                return (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => handleVerDetalle(tx)}
                  >
                    <TableCell className="font-mono text-xs">{tx.declaracionId.substring(0, 16)}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{tx.consignatario}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{tx.tipoDeclaracion}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      ${tx.valorCIF.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] gap-1', config.color)}>
                        <Icon className={cn('w-3 h-3', isLoading && 'animate-spin')} />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-success">
                      {tx.numeroLiquidacion || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {tx.latenciaMs}ms
                    </TableCell>
                    <TableCell className="text-center">
                      <Shield className="w-3.5 h-3.5 text-success mx-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="w-3 h-3" />
                        </Button>
                        {isError && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleReintentar(tx.id); }}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selectedTx && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  Detalle de Transmisión
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs gap-1', ESTADO_CONFIG[selectedTx.estado].color)}>
                    {(() => { const I = ESTADO_CONFIG[selectedTx.estado].icon; return <I className="w-3 h-3" />; })()}
                    {ESTADO_CONFIG[selectedTx.estado].label}
                  </Badge>
                  {selectedTx.numeroLiquidacion && (
                    <Badge variant="outline" className="text-xs text-success border-success/30">
                      {selectedTx.numeroLiquidacion}
                    </Badge>
                  )}
                </div>

                {/* Transmission Flow */}
                <div className="flex items-center justify-between gap-1 p-3 rounded-lg bg-muted/50 text-[10px]">
                  {['Preparando', 'Firmando', 'Enviando', 'Recibido ANA', 'Liquidación'].map((step, i) => {
                    const phases: EstadoTransmision[] = ['preparando', 'firmando', 'enviando', 'recibido_ana', 'liquidacion_asignada'];
                    const currentIdx = phases.indexOf(selectedTx.estado);
                    const isActive = i <= currentIdx || selectedTx.estado === 'liquidacion_asignada';
                    const isError = selectedTx.estado.startsWith('error') && i >= 2;
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold',
                          isError ? 'bg-destructive text-destructive-foreground' :
                          isActive ? 'bg-primary text-primary-foreground' :
                          'bg-muted-foreground/20 text-muted-foreground'
                        )}>
                          {i + 1}
                        </div>
                        <span className={cn(isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                          {step}
                        </span>
                        {i < 4 && <ArrowRight className="w-3 h-3 text-muted-foreground/30" />}
                      </div>
                    );
                  })}
                </div>

                {/* Stella Error Translation */}
                {selectedTx.stellaTraduccion && (
                  <div className="p-3 rounded-lg bg-warning-light border border-warning/20 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-warning" />
                      <span className="text-xs font-semibold text-warning-foreground">Stella Advisor</span>
                    </div>
                    <p className="text-xs text-warning-foreground leading-relaxed">
                      {selectedTx.stellaTraduccion}
                    </p>
                    {selectedTx.codigoError && (
                      <p className="text-[10px] text-warning-foreground/60 font-mono">
                        Código técnico: {selectedTx.codigoError} — {selectedTx.mensajeError}
                      </p>
                    )}
                  </div>
                )}

                {/* Zod Integrity */}
                <div className="flex items-center gap-2 p-2 rounded-md bg-success-light">
                  <Shield className="w-3.5 h-3.5 text-success" />
                  <span className="text-[11px] text-success">{selectedTx.zodIntegridad}</span>
                </div>

                {/* Metadata */}
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="w-full h-8">
                    <TabsTrigger value="info" className="text-xs flex-1">Información</TabsTrigger>
                    <TabsTrigger value="xml" className="text-xs flex-1">XML Generado</TabsTrigger>
                  </TabsList>
                  <TabsContent value="info" className="mt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['Declaración', selectedTx.declaracionId],
                        ['Consignatario', selectedTx.consignatario],
                        ['RUC', selectedTx.ruc],
                        ['Tipo', selectedTx.tipoDeclaracion],
                        ['Régimen', selectedTx.codigoRegimen],
                        ['CIF', `$${selectedTx.valorCIF.toLocaleString()}`],
                        ['Total Liquidación', `$${selectedTx.totalLiquidacion.toLocaleString()}`],
                        ['Latencia', `${selectedTx.latenciaMs}ms`],
                        ['Intentos', String(selectedTx.intentos)],
                        ['Hash XML', selectedTx.hashXML],
                      ].map(([label, value]) => (
                        <div key={label} className="p-2 rounded bg-muted/50">
                          <p className="text-muted-foreground text-[10px]">{label}</p>
                          <p className="font-medium truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="xml" className="mt-3">
                    <div className="rounded-lg bg-[hsl(222,47%,8%)] p-3 overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin">
                      <pre className="text-[10px] leading-relaxed font-mono text-[hsl(210,20%,80%)] whitespace-pre-wrap">
                        {xmlPreview || 'Cargando XML...'}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
