/**
 * PRE-INVOICE TEMPLATE — Plantilla de Pre-Factura ZENITH
 * Reglas Fiscales DGI/ANA: ITBMS 7% solo servicios, Res. 222
 * Campos: RUC + DV, Número Liquidación, Soportes con PDF
 */

import { useState, useMemo } from 'react';
import {
  FileText, CheckCircle2, XCircle, Shield, Sparkles,
  FileSpreadsheet, Send, Lock, AlertTriangle,
  Receipt, ExternalLink, Hash, Stamp, User,
  ShieldAlert, FileCheck2, FileMinus2, Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type PreFactura,
  type BillingStatus,
  type ValidacionPreFactura,
  type BloqueoZod,
  BILLING_STATUS_LABELS,
  zodValidarPreFactura,
  generarHashIntegridad,
  generarTokenAprobacion,
  validarTransicion,
  generarPreFacturaDemo,
  calcularITBMSPorCategoria,
  calcularHonorarioMinimoRes222,
} from '@/lib/financiero/MotorPreFactura';
import {
  generarArchivoSAPB1,
  zodValidarDatosFacturacion,
  type FacturaSAPB1,
} from '@/lib/financiero/MotorFinanciero';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Componente Principal ───

export function PreInvoiceTemplate() {
  const { role } = useAuth();
  const [preFactura, setPreFactura] = useState<PreFactura>(generarPreFacturaDemo());
  const [rechazoMotivo, setRechazoMotivo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);
  const [showAprobacion, setShowAprobacion] = useState(false);

  const validacion = useMemo(() => zodValidarPreFactura(preFactura), [preFactura]);
  const itbmsDetalle = useMemo(() => calcularITBMSPorCategoria(preFactura.lineas), [preFactura.lineas]);
  const res222 = useMemo(
    () => preFactura.valorCIF ? calcularHonorarioMinimoRes222(preFactura.valorCIF) : null,
    [preFactura.valorCIF]
  );

  // ─── Handlers ───

  const handleEnviarAprobacion = () => {
    if (!validacion.valida) {
      toast.error('Zod: La pre-factura tiene errores. Corrija antes de enviar.');
      return;
    }

    const transicion = validarTransicion(preFactura.billingStatus, 'PENDING_APPROVAL');
    if (!transicion.permitida) {
      toast.error(`Zod: Transición no permitida. ${transicion.razon}`);
      return;
    }

    const { token, expiracion } = generarTokenAprobacion();
    const hash = generarHashIntegridad(preFactura);

    setPreFactura(prev => ({
      ...prev,
      billingStatus: 'PENDING_APPROVAL' as BillingStatus,
      tokenAprobacion: token,
      tokenExpiracion: expiracion,
      zodHashIntegridad: hash,
      zodValidado: true,
      updatedAt: new Date().toISOString(),
    }));

    toast.success('Stella: Pre-factura enviada al cliente para aprobación. Token de acceso generado.');
  };

  const handleAprobarCliente = () => {
    const transicion = validarTransicion(preFactura.billingStatus, 'APPROVED');
    if (!transicion.permitida) {
      toast.error(`Transición no permitida: ${transicion.razon}`);
      return;
    }

    setPreFactura(prev => ({
      ...prev,
      billingStatus: 'APPROVED' as BillingStatus,
      aprobadoPorCliente: true,
      clienteAprobacionTimestamp: new Date().toISOString(),
      clienteAprobacionIP: '192.168.1.100',
      clienteAprobacionNombre: prev.consignatario,
      updatedAt: new Date().toISOString(),
    }));

    setShowAprobacion(false);
    toast.success('✅ Pre-factura aprobada por el cliente. Zod ha registrado el timestamp e IP de aprobación.');
  };

  const handleRechazar = () => {
    if (!rechazoMotivo.trim()) {
      toast.error('Debe ingresar un motivo de rechazo.');
      return;
    }

    setPreFactura(prev => ({
      ...prev,
      billingStatus: 'DRAFT' as BillingStatus,
      rechazado: true,
      rechazoMotivo,
      rechazoTimestamp: new Date().toISOString(),
      rechazoPor: prev.consignatario,
      updatedAt: new Date().toISOString(),
    }));

    setShowRechazo(false);
    setRechazoMotivo('');
    toast.info('Stella al Operador: "Jefe, el cliente ha rechazado la pre-factura. Motivo: ' + rechazoMotivo + '. Por favor, ajusta y reenvía."');
  };

  const handleExportarSAP = () => {
    if (preFactura.billingStatus !== 'APPROVED') {
      toast.error('Zod: Solo se puede exportar a SAP cuando el estado es APPROVED.');
      return;
    }

    const validacionSAP = zodValidarDatosFacturacion({
      ruc: preFactura.ruc,
      razonSocial: preFactura.razonSocial,
      mawb: preFactura.mawb,
      valorCIF: preFactura.total,
    });

    if (!validacionSAP.valido) {
      validacionSAP.errores.forEach(e => toast.error(`Zod: ${e}`));
      return;
    }

    const facturaSAP: FacturaSAPB1 = {
      docNum: preFactura.docNum,
      docDate: new Date().toISOString().split('T')[0],
      cardCode: `C-PA-${preFactura.ruc?.slice(0, 6) || '000'}`,
      cardName: preFactura.razonSocial || preFactura.consignatario,
      ruc: `${preFactura.ruc || ''} DV${preFactura.dv || ''}`,
      referencia: preFactura.mawb,
      moneda: preFactura.moneda,
      lineas: preFactura.lineas.map(l => ({
        descripcion: preFactura.numLiquidacion
          ? `${l.descripcion} — Liq. ${preFactura.numLiquidacion}`
          : l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        total: l.total,
        codigoSAP: l.codigoSAP,
        cuentaContable: l.cuentaContable,
      })),
      subtotal: preFactura.subtotal,
      itbms: preFactura.itbms,
      total: preFactura.total,
      expedienteId: preFactura.embarqueId,
      corredorNombre: 'Lic. Roberto Pérez M.',
      timestamp: new Date().toISOString(),
    };

    generarArchivoSAPB1(facturaSAP, 'excel');

    setPreFactura(prev => ({
      ...prev,
      billingStatus: 'SENT_TO_SAP' as BillingStatus,
      sapExportado: true,
      updatedAt: new Date().toISOString(),
    }));

    toast.success('Archivo SAP B1 generado con Liquidación ANA en descripción. Estado: SENT_TO_SAP.');
  };

  const statusInfo = BILLING_STATUS_LABELS[preFactura.billingStatus];

  // ─── Categorías de líneas ───
  const lineasGravables = preFactura.lineas.filter(l => l.itbmsAplicable);
  const lineasExentas = preFactura.lineas.filter(l => !l.itbmsAplicable);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-gradient-zenith tracking-wider flex items-center gap-2">
            <FileText className="w-5 h-5" /> Pre-Factura
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {preFactura.docNum} — MAWB {preFactura.mawb}
            {preFactura.numLiquidacion && (
              <span className="ml-2 text-primary">• Liq. {preFactura.numLiquidacion}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${statusInfo.color} border-current/30 gap-1`}>
            <span>{statusInfo.icon}</span>
            {statusInfo.label}
          </Badge>
          {preFactura.zodValidado && (
            <Badge variant="outline" className="border-zod/30 text-zod gap-1 text-xs">
              <Shield className="w-3 h-3" /> Zod Sealed
            </Badge>
          )}
        </div>
      </div>

      {/* Rechazo Alert */}
      {preFactura.rechazado && preFactura.rechazoMotivo && (
        <Card className="glass-panel-stella border-destructive/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-stella mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-stella">Stella — Feedback del Cliente</p>
                <p className="text-xs text-muted-foreground mt-1">
                  "Jefe, el cliente ha solicitado revisar la factura. Motivo: <strong className="text-foreground">{preFactura.rechazoMotivo}</strong>. Por favor, ajusta según la observación y reenvía."
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Rechazado: {preFactura.rechazoTimestamp ? new Date(preFactura.rechazoTimestamp).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validación Zod + Bloqueos Res. 222 */}
      <ZodValidacionPanel validacion={validacion} />

      {/* Bloqueos Res. 222 */}
      {validacion.bloqueos.length > 0 && (
        <Card className="glass-panel-zod border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-destructive tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Bloqueo Normativo — Zod
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {validacion.bloqueos.map((bloqueo, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm font-semibold text-destructive">{bloqueo.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{bloqueo.descripcion}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic flex items-center gap-1">
                  <Scale className="w-3 h-3" /> {bloqueo.fundamento}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Datos del Consignatario + Fiscales DGI */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Datos Fiscales del Consignatario (DGI/ANA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <InfoField label="Consignatario" value={preFactura.consignatario} />
            <InfoField label="RUC" value={preFactura.ruc || '—'} />
            <InfoField label="DV" value={preFactura.dv || '—'} highlight />
            <InfoField label="MAWB / BL" value={preFactura.mawb} mono />
            <InfoField label="Liquidación ANA" value={preFactura.numLiquidacion || '—'} mono highlight />
            <InfoField label="Moneda" value={preFactura.moneda} />
          </div>
          {res222 && (
            <div className="mt-3 p-2 rounded bg-muted/20 border border-border/30">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Scale className="w-3 h-3 text-zod" />
                <span className="font-semibold text-zod">Res. 222:</span>
                {res222.rango} — Mínimo legal: <span className="font-bold text-foreground">${res222.minimo.toFixed(2)}</span>
                <span className="ml-1">({res222.formula})</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desglose — Servicios Gravables (ITBMS 7%) */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
            Servicios de Corretaje
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] ml-auto">
              ITBMS 7%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Table Header */}
          <div className="flex items-center text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1 border-b border-border/30">
            <span className="flex-1">Descripción</span>
            <span className="w-10 text-center">Cant.</span>
            <span className="w-20 text-right">P. Unit.</span>
            <span className="w-20 text-right">Subtotal</span>
            <span className="w-16 text-right">ITBMS</span>
          </div>
          {lineasGravables.map((linea, idx) => (
            <div key={idx} className="flex items-center text-sm py-1.5 px-2 rounded hover:bg-muted/20">
              <div className="flex-1 min-w-0">
                <span className="text-foreground">{linea.descripcion}</span>
              </div>
              <span className="text-xs text-muted-foreground w-10 text-center">{linea.cantidad}</span>
              <span className="text-xs text-muted-foreground w-20 text-right">${linea.precioUnitario.toFixed(2)}</span>
              <span className="font-medium text-foreground w-20 text-right">${linea.total.toFixed(2)}</span>
              <span className="text-xs text-primary w-16 text-right">${linea.itbmsLinea.toFixed(2)}</span>
            </div>
          ))}
          <Separator className="bg-border/30" />
          <div className="flex justify-between items-center text-sm px-2">
            <span className="text-muted-foreground">Subtotal Servicios Gravables</span>
            <span className="font-bold text-foreground">${itbmsDetalle.subtotalGravable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm px-2">
            <span className="text-primary text-xs">ITBMS (7%)</span>
            <span className="font-medium text-primary">${itbmsDetalle.itbms.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Gastos Exentos / Reembolsables (0% ITBMS) */}
      {lineasExentas.length > 0 && (
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
              Gastos Reembolsables — Exentos ITBMS
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px] ml-auto">
                ITBMS 0%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[10px] text-muted-foreground">
              Tasas ANA, Aranceles, Almacenaje de terceros y otros gastos no sujetos a ITBMS (Art. 1057-V Código Fiscal).
            </p>
            <div className="flex items-center text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1 border-b border-border/30">
              <span className="flex-1">Descripción</span>
              <span className="w-20 text-right">Monto</span>
              <span className="w-16 text-right">ITBMS</span>
            </div>
            {lineasExentas.map((linea, idx) => (
              <div key={idx} className="flex items-center text-sm py-1.5 px-2 rounded hover:bg-muted/20">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{linea.descripcion}</span>
                </div>
                <span className="font-medium text-foreground w-20 text-right">${linea.total.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-16 text-right">$0.00</span>
              </div>
            ))}
            <Separator className="bg-border/30" />
            <div className="flex justify-between items-center text-sm px-2">
              <span className="text-muted-foreground">Subtotal Exento</span>
              <span className="font-bold text-foreground">${itbmsDetalle.subtotalExento.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totales Consolidados */}
      <Card className="glass-panel border-primary/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal Servicios (Gravable)</span>
            <span className="text-foreground">${itbmsDetalle.subtotalGravable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal Reembolsables (Exento)</span>
            <span className="text-foreground">${itbmsDetalle.subtotalExento.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary">ITBMS (7% sobre servicios)</span>
            <span className="text-primary">${itbmsDetalle.itbms.toFixed(2)}</span>
          </div>
          <Separator className="bg-primary/20" />
          <div className="flex justify-between items-center text-base pt-1">
            <span className="font-bold text-foreground">TOTAL</span>
            <span className="font-bold text-primary text-lg">${preFactura.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Soportes de Terceros con indicador PDF */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
            <Receipt className="w-4 h-4 text-zod" /> Soportes de Terceros
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">
              Stella verifica PDFs antes de enviar
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {preFactura.soportesTerceros.map((soporte) => (
              <div
                key={soporte.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {soporte.tienePDF ? (
                    <FileCheck2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <FileMinus2 className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{soporte.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {soporte.referencia} • {soporte.fecha}
                      {!soporte.tienePDF && (
                        <span className="ml-2 text-destructive font-medium">⚠ Sin PDF</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-[10px]">
                    Exento
                  </Badge>
                  <span className="text-sm font-bold text-foreground">${soporte.monto.toFixed(2)}</span>
                  {soporte.tienePDF && (
                    <Button variant="ghost" size="icon" className="w-7 h-7">
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auditoría de Aprobación */}
      {preFactura.aprobadoPorCliente && (
        <Card className="glass-panel-zod">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-zod tracking-wide flex items-center gap-2">
              <Stamp className="w-4 h-4" /> Registro de Aprobación — Zod Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <InfoField label="Aprobado por" value={preFactura.clienteAprobacionNombre || '—'} />
              <InfoField label="Timestamp" value={preFactura.clienteAprobacionTimestamp ? new Date(preFactura.clienteAprobacionTimestamp).toLocaleString() : '—'} />
              <InfoField label="IP de Origen" value={preFactura.clienteAprobacionIP || '—'} />
              <InfoField label="Hash de Integridad" value={preFactura.zodHashIntegridad?.slice(0, 16) + '...' || '—'} mono />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {preFactura.zodHashIntegridad && (
            <span className="flex items-center gap-1 font-mono">
              <Hash className="w-3 h-3" />
              {preFactura.zodHashIntegridad.slice(0, 12)}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {preFactura.billingStatus === 'DRAFT' && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleEnviarAprobacion}
              disabled={!validacion.valida}
            >
              <Send className="w-4 h-4" />
              Enviar a Aprobación
            </Button>
          )}

          {preFactura.billingStatus === 'PENDING_APPROVAL' && (
            <>
              <Dialog open={showAprobacion} onOpenChange={setShowAprobacion}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar Facturación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Confirmar Aprobación
                    </DialogTitle>
                    <DialogDescription>
                      Al aprobar, confirma que ha revisado el desglose. Zod registrará timestamp e IP como auditoría.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Servicios (7% ITBMS)</span>
                      <span className="text-foreground">${itbmsDetalle.subtotalGravable.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reembolsables (Exento)</span>
                      <span className="text-foreground">${itbmsDetalle.subtotalExento.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ITBMS</span>
                      <span className="text-primary">${itbmsDetalle.itbms.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-border/30" />
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-primary">${preFactura.total.toFixed(2)} {preFactura.moneda}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">RUC</span>
                      <span className="text-foreground font-mono">{preFactura.ruc} DV{preFactura.dv}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAprobacion(false)}>Cancelar</Button>
                    <Button className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleAprobarCliente}>
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Aprobación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showRechazo} onOpenChange={setShowRechazo}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <XCircle className="w-4 h-4" /> Rechazar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                      <XCircle className="w-5 h-5 text-destructive" /> Rechazar Pre-Factura
                    </DialogTitle>
                    <DialogDescription>
                      Indique el motivo. Stella notificará al operador para que realice los ajustes.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Ej: El flete debe ser $450 según el BL, no $500. Favor corregir..."
                    value={rechazoMotivo}
                    onChange={(e) => setRechazoMotivo(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRechazo(false)}>Cancelar</Button>
                    <Button variant="destructive" className="gap-1.5" onClick={handleRechazar}>
                      <XCircle className="w-4 h-4" /> Confirmar Rechazo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportarSAP}
            disabled={preFactura.billingStatus !== 'APPROVED'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generar CSV para SAP
            {preFactura.billingStatus !== 'APPROVED' && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Estado Final SAP */}
      {preFactura.billingStatus === 'SENT_TO_SAP' && (
        <Card className="glass-panel border-primary/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-foreground">Pre-Factura exportada a SAP B1</p>
                <p className="text-xs text-muted-foreground">
                  Archivo generado con mapeo OINV/INV1. Liquidación ANA incluida en descripción. Sellado por Zod.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-componentes ───

function ZodValidacionPanel({ validacion }: { validacion: ValidacionPreFactura }) {
  if (validacion.valida && validacion.advertencias.length === 0) return null;

  return (
    <Card className={`glass-panel-zod ${!validacion.valida ? 'border-destructive/20' : 'border-zod/20'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display text-zod tracking-wide flex items-center gap-2">
          <Shield className="w-4 h-4" /> Zod Integrity — Reglas Fiscales DGI/ANA
          <Badge variant="outline" className={`text-xs ml-auto ${
            validacion.valida ? 'border-green-500/30 text-green-400' : 'border-destructive/30 text-destructive'
          }`}>
            {validacion.puntaje}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {validacion.errores.map((error, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
            <span className="text-destructive/80">{error}</span>
          </div>
        ))}
        {validacion.advertencias.map((adv, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <span className="text-amber-400/80">{adv}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InfoField({ label, value, mono = false, highlight = false }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className={`p-2 rounded ${highlight ? 'bg-primary/5 border border-primary/10' : 'bg-muted/30'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium text-foreground text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
