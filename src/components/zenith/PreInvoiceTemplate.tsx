/**
 * PRE-INVOICE TEMPLATE — Plantilla de Pre-Factura ZENITH
 * Desglose de honorarios, servicios, gastos reembolsables
 * Área de Soportes de Terceros con referencia a PDFs
 * Botón de aprobación del cliente con auditoría Zod
 */

import { useState, useMemo } from 'react';
import {
  FileText, CheckCircle2, XCircle, Shield, Sparkles, Download,
  FileSpreadsheet, Send, Clock, Eye, Lock, AlertTriangle,
  Receipt, ExternalLink, Hash, Stamp, User, Calendar,
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
  BILLING_STATUS_LABELS,
  zodValidarPreFactura,
  generarHashIntegridad,
  generarTokenAprobacion,
  validarTransicion,
  generarPreFacturaDemo,
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
  const { hasPermission, role } = useAuth();
  const [preFactura, setPreFactura] = useState<PreFactura>(generarPreFacturaDemo());
  const [rechazoMotivo, setRechazoMotivo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);
  const [showAprobacion, setShowAprobacion] = useState(false);

  const validacion = useMemo(() => zodValidarPreFactura(preFactura), [preFactura]);

  const esCorredor = role === 'revisor' || role === 'admin';

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
      clienteAprobacionIP: '192.168.1.100', // Demo — en producción se captura del request
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
      ruc: preFactura.ruc || '',
      referencia: preFactura.mawb,
      moneda: preFactura.moneda,
      lineas: preFactura.lineas.map(l => ({
        descripcion: l.descripcion,
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
      sapExportado_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    toast.success('Archivo SAP B1 generado. Estado actualizado a SENT_TO_SAP.');
  };

  const statusInfo = BILLING_STATUS_LABELS[preFactura.billingStatus];

  // ─── Categorías de líneas ───
  const honorarios = preFactura.lineas.filter(l => l.categoria === 'honorarios');
  const handling = preFactura.lineas.filter(l => l.categoria === 'handling');
  const recargos = preFactura.lineas.filter(l => l.categoria === 'recargo');
  const reembolsables = preFactura.lineas.filter(l => l.categoria === 'reembolsable');

  const subtotalServicios = [...honorarios, ...handling, ...recargos].reduce((s, l) => s + l.total, 0);
  const subtotalReembolsables = reembolsables.reduce((s, l) => s + l.total, 0);

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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${statusInfo.color} border-current/30 gap-1`}
          >
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

      {/* Validación Zod */}
      <ZodValidacionPanel validacion={validacion} />

      {/* Datos del Consignatario */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Datos del Consignatario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <InfoField label="Consignatario" value={preFactura.consignatario} />
            <InfoField label="RUC / Cédula" value={preFactura.ruc || '—'} />
            <InfoField label="MAWB / BL" value={preFactura.mawb} />
            <InfoField label="Moneda" value={preFactura.moneda} />
          </div>
        </CardContent>
      </Card>

      {/* Desglose de Servicios */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide">
            Desglose de Honorarios y Servicios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Honorarios */}
          {honorarios.length > 0 && (
            <SeccionLineas titulo="Honorarios de Corretaje" lineas={honorarios} color="text-primary" />
          )}

          {/* Handling */}
          {handling.length > 0 && (
            <SeccionLineas titulo="Manejo de Carga" lineas={handling} color="text-primary" />
          )}

          {/* Recargos */}
          {recargos.length > 0 && (
            <SeccionLineas titulo="Recargos por Servicios Especiales" lineas={recargos} color="text-zod" />
          )}

          <Separator className="bg-border/50" />

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal Servicios</span>
            <span className="font-bold text-foreground">${subtotalServicios.toFixed(2)}</span>
          </div>

          {/* Reembolsables */}
          {reembolsables.length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <SeccionLineas titulo="Gastos Reembolsables (Terceros)" lineas={reembolsables} color="text-amber-400" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal Reembolsables</span>
                <span className="font-bold text-foreground">${subtotalReembolsables.toFixed(2)}</span>
              </div>
            </>
          )}

          <Separator className="bg-primary/20" />

          {/* Totales */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal General</span>
              <span className="font-medium text-foreground">${preFactura.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">ITBMS (7% sobre servicios)</span>
              <span className="font-medium text-foreground">${preFactura.itbms.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-base pt-2 border-t border-primary/20">
              <span className="font-bold text-foreground">TOTAL</span>
              <span className="font-bold text-primary text-lg">${preFactura.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Soportes de Terceros */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
            <Receipt className="w-4 h-4 text-zod" /> Soportes de Terceros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Recibos y comprobantes de pagos realizados a terceros vinculados a este despacho.
          </p>
          <div className="space-y-2">
            {preFactura.soportesTerceros.map((soporte) => (
              <div
                key={soporte.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{soporte.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {soporte.referencia} • {soporte.fecha}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-foreground">${soporte.monto.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </Button>
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
          {/* Enviar a Aprobación (Operador) */}
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

          {/* Aprobar / Rechazar (Cliente/Corredor) */}
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
                      Al aprobar, confirma que ha revisado el desglose de servicios y acepta los montos indicados.
                      Zod registrará el timestamp e IP como método de auditoría.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total a Facturar</span>
                      <span className="font-bold text-primary">${preFactura.total.toFixed(2)} {preFactura.moneda}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Consignatario</span>
                      <span className="text-foreground">{preFactura.consignatario}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">MAWB</span>
                      <span className="text-foreground font-mono">{preFactura.mawb}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAprobacion(false)}>
                      Cancelar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleAprobarCliente}>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Aprobación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showRechazo} onOpenChange={setShowRechazo}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                      <XCircle className="w-5 h-5 text-destructive" />
                      Rechazar Pre-Factura
                    </DialogTitle>
                    <DialogDescription>
                      Indique el motivo del rechazo. Stella notificará al operador para que realice los ajustes.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Ej: El flete debe ser $450 según el BL, no $500. Favor corregir..."
                    value={rechazoMotivo}
                    onChange={(e) => setRechazoMotivo(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRechazo(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" className="gap-1.5" onClick={handleRechazar}>
                      <XCircle className="w-4 h-4" />
                      Confirmar Rechazo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Generar CSV para SAP (Solo si APPROVED + Corredor) */}
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
                  El archivo ha sido generado con mapeo OINV/INV1. El expediente está sellado por Zod.
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
          <Shield className="w-4 h-4" /> Zod Integrity — Validación Pre-Factura
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

function SeccionLineas({ titulo, lineas, color }: {
  titulo: string;
  lineas: { descripcion: string; cantidad: number; precioUnitario: number; total: number }[];
  color: string;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold ${color} mb-2 uppercase tracking-wider`}>{titulo}</p>
      <div className="space-y-1">
        {lineas.map((linea, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/20">
            <div className="flex-1 min-w-0">
              <span className="text-foreground">{linea.descripcion}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-right">
              <span className="text-xs text-muted-foreground w-12 text-center">{linea.cantidad}</span>
              <span className="text-xs text-muted-foreground w-20 text-right">${linea.precioUnitario.toFixed(2)}</span>
              <span className="font-medium text-foreground w-24 text-right">${linea.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-2 rounded bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium text-foreground text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
