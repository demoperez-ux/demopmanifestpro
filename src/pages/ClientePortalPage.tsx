/**
 * PORTAL CLIENTE — Vista pública de Pre-Factura
 * Permite al cliente ver el desglose y aprobar/rechazar facturación
 * Registra timestamp, IP y user agent como auditoría Zod
 */

import { useState } from 'react';
import {
  CheckCircle2, XCircle, Shield, FileText, Sparkles,
  Receipt, Lock, ExternalLink, AlertTriangle,
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
  BILLING_STATUS_LABELS,
  generarPreFacturaDemo,
} from '@/lib/financiero/MotorPreFactura';
import { toast } from 'sonner';

export default function ClientePortalPage() {
  // En producción: buscar por token de URL params
  const [preFactura, setPreFactura] = useState<PreFactura>({
    ...generarPreFacturaDemo(),
    billingStatus: 'PENDING_APPROVAL',
    zodValidado: true,
    zodHashIntegridad: 'a3f8c2d1e5b7a9c4f6d8e0b2a4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0',
  });
  const [rechazoMotivo, setRechazoMotivo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);
  const [showAprobacion, setShowAprobacion] = useState(false);
  const [aprobado, setAprobado] = useState(false);

  const statusInfo = BILLING_STATUS_LABELS[preFactura.billingStatus];

  const handleAprobar = () => {
    setPreFactura(prev => ({
      ...prev,
      billingStatus: 'APPROVED' as BillingStatus,
      aprobadoPorCliente: true,
      clienteAprobacionTimestamp: new Date().toISOString(),
      clienteAprobacionIP: '203.0.113.42',
      clienteAprobacionNombre: prev.consignatario,
    }));
    setAprobado(true);
    setShowAprobacion(false);
    toast.success('✅ Pre-factura aprobada. Zod ha registrado su autorización.');
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
    }));
    setShowRechazo(false);
    toast.info('Rechazo registrado. El corredor será notificado.');
  };

  const honorarios = preFactura.lineas.filter(l => l.categoria === 'honorarios' || l.categoria === 'handling' || l.categoria === 'recargo');
  const reembolsables = preFactura.lineas.filter(l => l.categoria === 'reembolsable');

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-warning/20 border border-primary/30 flex items-center justify-center">
                <span className="text-lg font-bold font-display text-gradient">Z</span>
              </div>
              <div>
                <span className="text-sm font-bold font-display text-gradient tracking-wider">ZENITH</span>
                <p className="text-[10px] text-muted-foreground">Portal de Aprobación — Cliente</p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs gap-1">
              <Lock className="w-3 h-3" /> Enlace Seguro
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Pre-Factura Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              Pre-Factura de Servicios Aduaneros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preFactura.docNum} — MAWB {preFactura.mawb}
            </p>
          </div>
          <Badge variant="outline" className={`${statusInfo.color} border-current/30 gap-1`}>
            <span>{statusInfo.icon}</span>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Aprobado Success */}
        {aprobado && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Pre-Factura Aprobada</p>
                  <p className="text-xs text-muted-foreground">
                    Su aprobación ha sido registrada. El corredor procederá con la facturación formal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Datos del Despacho */}
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-foreground tracking-wide">
              Datos del Despacho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Consignatario</p>
                <p className="font-medium text-foreground">{preFactura.consignatario}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">RUC</p>
                <p className="font-medium text-foreground">{preFactura.ruc}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">MAWB / BL</p>
                <p className="font-medium text-foreground font-mono">{preFactura.mawb}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Moneda</p>
                <p className="font-medium text-foreground">{preFactura.moneda}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desglose */}
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-foreground tracking-wide">
              Desglose de Servicios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {honorarios.map((linea, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1.5">
                <span className="text-foreground flex-1">{linea.descripcion}</span>
                <span className="font-medium text-foreground">${linea.total.toFixed(2)}</span>
              </div>
            ))}

            {reembolsables.length > 0 && (
              <>
                <Separator className="bg-border/50" />
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Gastos Reembolsables
                </p>
                {reembolsables.map((linea, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1.5">
                    <span className="text-foreground flex-1">{linea.descripcion}</span>
                    <span className="font-medium text-foreground">${linea.total.toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}

            <Separator className="bg-primary/20" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${preFactura.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ITBMS (7%)</span>
              <span className="text-foreground">${preFactura.itbms.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-primary/20">
              <span className="font-bold text-foreground">TOTAL</span>
              <span className="font-bold text-primary text-lg">${preFactura.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Soportes de Terceros */}
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-zod" /> Comprobantes de Terceros
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
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{soporte.descripcion}</p>
                      <p className="text-xs text-muted-foreground">Ref: {soporte.referencia}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-foreground">${soporte.monto.toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="w-7 h-7">
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acciones del Cliente */}
        {preFactura.billingStatus === 'PENDING_APPROVAL' && !aprobado && (
          <Card className="glass-panel border-primary/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-stella mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stella">Acción Requerida</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revise el desglose de servicios y gastos reembolsables. Si todo está conforme,
                    apruebe la facturación. De lo contrario, puede rechazar e indicar las correcciones necesarias.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Dialog open={showAprobacion} onOpenChange={setShowAprobacion}>
                  <DialogTrigger asChild>
                    <Button className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1">
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
                        Al aprobar, confirma que ha revisado y acepta los montos. Se registrará la fecha, hora e IP de aprobación como método de auditoría.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold text-primary">${preFactura.total.toFixed(2)} {preFactura.moneda}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-zod mt-0.5 shrink-0" />
                      <span>Esta acción será registrada por Zod Integrity Engine con sello de tiempo e identificación de red.</span>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAprobacion(false)}>
                        Cancelar
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleAprobar}>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showRechazo} onOpenChange={setShowRechazo}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 flex-1">
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
                        Indique qué debe corregirse. El equipo operativo será notificado.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Describa las correcciones necesarias..."
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
                        Enviar Rechazo
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zod Integrity Footer */}
        <div className="text-center text-xs text-muted-foreground/50 space-y-1 py-4">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-zod/50" />
            <span>Protegido por Zod Integrity Engine</span>
          </div>
          {preFactura.zodHashIntegridad && (
            <p className="font-mono text-[10px]">
              Hash: {preFactura.zodHashIntegridad.slice(0, 24)}...
            </p>
          )}
          <p>ZENITH — Copiloto de Inteligencia Aduanera</p>
        </div>
      </main>
    </div>
  );
}
