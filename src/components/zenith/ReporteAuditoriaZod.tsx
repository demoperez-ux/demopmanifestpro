/**
 * REPORTE DE AUDITORÍA DE ZOD
 * Dashboard de Veredicto con 5 puntos clave:
 * Clasificación, Valoración, Permisos, Trazabilidad, Integridad
 * Firma 90/10: Operador ve, Corredor firma
 */

import { useState } from 'react';
import {
  Shield, ShieldAlert, CheckCircle2, XCircle, AlertTriangle,
  FileSignature, Lock, Sparkles, Send, MessageSquare,
  PackageSearch, DollarSign, KeyRound, Route, Fingerprint,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { generarFirmaDigital, CLAUSULA_RESPONSABILIDAD, FirmaDigital } from '@/lib/core/SistemaFirmaDigital';
import { puedeCorredorFirmar, generarCorredorDemo, type CorredorAcreditado } from '@/lib/corredores/RegistroCorredores';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Tipos ───
export type EstadoPuntoAuditoria = 'validado' | 'advertencia' | 'bloqueado';

export interface PuntoAuditoria {
  id: string;
  area: 'clasificacion' | 'valoracion' | 'permisos' | 'trazabilidad' | 'integridad';
  label: string;
  estado: EstadoPuntoAuditoria;
  detalle: string;
  fundamentoLegal?: string;
  confianza: number;
}

export interface ReporteZodCompleto {
  expedienteId: string;
  mawb: string;
  consignatario: string;
  operador: string;
  valorCIF: number;
  totalItems: number;
  puntos: PuntoAuditoria[];
  confianzaGeneral: number;
  selloHash: string;
  timestamp: string;
  firma?: FirmaDigital;
  rechazo?: { motivo: string; timestamp: string; corredorNombre: string };
}

// ─── Iconos por área ───
const ICONO_AREA: Record<PuntoAuditoria['area'], React.ReactNode> = {
  clasificacion: <PackageSearch className="w-5 h-5" />,
  valoracion: <DollarSign className="w-5 h-5" />,
  permisos: <KeyRound className="w-5 h-5" />,
  trazabilidad: <Route className="w-5 h-5" />,
  integridad: <Fingerprint className="w-5 h-5" />,
};

const LABEL_AREA: Record<PuntoAuditoria['area'], string> = {
  clasificacion: 'Clasificación Arancelaria',
  valoracion: 'Valoración Aduanera',
  permisos: 'Permisos y Anuentes',
  trazabilidad: 'Trazabilidad GS1/BASC',
  integridad: 'Integridad Documental',
};

// ─── Mock reporte ───
function generarReporteDemo(): ReporteZodCompleto {
  const hashBase = `ZOD:AUDIT:${Date.now()}`;
  const encoder = new TextEncoder();
  const hashArr = Array.from(encoder.encode(hashBase));
  const mockHash = hashArr.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);

  return {
    expedienteId: 'exp-001',
    mawb: '123-45678901',
    consignatario: 'Distribuidora Pacífica S.A.',
    operador: 'Ana García (Analista)',
    valorCIF: 28750.00,
    totalItems: 45,
    confianzaGeneral: 94,
    selloHash: mockHash,
    timestamp: new Date().toISOString(),
    puntos: [
      {
        id: 'p1', area: 'clasificacion', label: LABEL_AREA.clasificacion,
        estado: 'validado', detalle: '44 de 45 ítems clasificados con confianza ≥90%. 1 ítem requiere criterio profesional (8542.31 vs 8542.39).',
        fundamentoLegal: 'Art. 79 RECAUCA — Clasificación conforme al SAC',
        confianza: 97,
      },
      {
        id: 'p2', area: 'valoracion', label: LABEL_AREA.valoracion,
        estado: 'validado', detalle: 'Valor CIF $28,750.00 validado. Triangulación factura-packing list-AWB consistente. Sin alertas de subvaloración.',
        fundamentoLegal: 'Art. 1-8 Acuerdo Valoración OMC',
        confianza: 98,
      },
      {
        id: 'p3', area: 'permisos', label: LABEL_AREA.permisos,
        estado: 'advertencia', detalle: 'Registro sanitario MINSA RS-2024-1455 vigente pero vence en 36 días. Renovación recomendada.',
        fundamentoLegal: 'Decreto 115/2014 — Registro Sanitario',
        confianza: 85,
      },
      {
        id: 'p4', area: 'trazabilidad', label: LABEL_AREA.trazabilidad,
        estado: 'validado', detalle: 'GTIN validados contra base GS1 Panamá. GLN shipper verificado. Cadena de custodia BASC íntegra.',
        fundamentoLegal: 'Protocolo BASC v6-2022 — Gestión de la Cadena Logística',
        confianza: 96,
      },
      {
        id: 'p5', area: 'integridad', label: LABEL_AREA.integridad,
        estado: 'validado', detalle: 'Sello SHA-256 verificado. 0 modificaciones post-validación detectadas. Audit trail inmutable completo.',
        fundamentoLegal: 'Resolución 049-2025 ANA — Declaración Electrónica',
        confianza: 100,
      },
    ],
  };
}

// ─── Componente Principal ───
export function ReporteAuditoriaZod() {
  const { role, hasPermission } = useAuth();
  const [reporte, setReporte] = useState<ReporteZodCompleto>(generarReporteDemo);
  const [corredor] = useState<CorredorAcreditado>(generarCorredorDemo);
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  const [showRechazoDialog, setShowRechazoDialog] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [clausulaAceptada, setClausulaAceptada] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const esCorredor = role === 'revisor' || role === 'admin';
  const todosValidados = reporte.puntos.every(p => p.estado === 'validado');
  const hayBloqueados = reporte.puntos.some(p => p.estado === 'bloqueado');
  const puedeIntentarFirma = esCorredor && !hayBloqueados && !firmado;

  const validacionFirma = puedeCorredorFirmar(corredor);

  const handleFirmar = async () => {
    if (!clausulaAceptada) {
      toast.error('Debe aceptar la cláusula de responsabilidad');
      return;
    }

    if (!validacionFirma.puede) {
      toast.error(validacionFirma.motivo || 'No puede firmar');
      return;
    }

    try {
      const firma = await generarFirmaDigital(
        JSON.stringify(reporte),
        corredor.id,
        corredor.nombre_completo,
        reporte.expedienteId
      );

      setReporte(prev => ({ ...prev, firma }));
      setFirmado(true);
      setShowFirmaDialog(false);
      setClausulaAceptada(false);
      toast.success(`✅ Expediente sellado con firma SHA-256: ${firma.hash.substring(0, 16)}...`);
    } catch {
      toast.error('Error al generar firma digital');
    }
  };

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }

    setReporte(prev => ({
      ...prev,
      rechazo: {
        motivo: motivoRechazo,
        timestamp: new Date().toISOString(),
        corredorNombre: corredor.nombre_completo,
      },
    }));

    setShowRechazoDialog(false);
    setMotivoRechazo('');

    toast.info(
      `💬 Stella notifica al Operador: "Jefe, el Corredor ${corredor.nombre_completo} ha solicitado revisar el expediente. Motivo: ${motivoRechazo.substring(0, 60)}..."`,
      { duration: 8000 }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-gradient-zenith tracking-wider">
            Reporte de Auditoría — Zod
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            MAWB {reporte.mawb} • {reporte.consignatario} • CIF ${reporte.valorCIF.toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className="border-warning/30 text-zod gap-1 text-sm px-3 py-1">
          <Shield className="w-4 h-4" />
          {reporte.confianzaGeneral}% Confianza
        </Badge>
      </div>

      {/* Rechazo banner */}
      {reporte.rechazo && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Expediente Devuelto por {reporte.rechazo.corredorNombre}</p>
              <p className="text-sm text-muted-foreground mt-1">"{reporte.rechazo.motivo}"</p>
              <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                <p className="text-xs text-stella flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Stella al Operador: "Jefe, el Corredor ha solicitado revisar este expediente. Por favor, ajusta según la observación."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5 Puntos de Auditoría */}
      <div className="grid grid-cols-1 gap-3">
        {reporte.puntos.map(punto => (
          <PuntoAuditoriaCard key={punto.id} punto={punto} />
        ))}
      </div>

      {/* Barra de Confianza General */}
      <Card className="glass-panel-zod">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 mb-3">
            <Shield className="w-6 h-6 text-zod" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">Confianza General del Expediente</span>
                <span className={`text-lg font-bold ${
                  reporte.confianzaGeneral >= 90 ? 'text-green-400' :
                  reporte.confianzaGeneral >= 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {reporte.confianzaGeneral}%
                </span>
              </div>
              <Progress value={reporte.confianzaGeneral} className="h-2.5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{reporte.totalItems} ítems analizados</span>
            <span>{reporte.puntos.filter(p => p.estado === 'validado').length}/5 puntos validados</span>
            <span>Preparado por: {reporte.operador}</span>
          </div>
        </CardContent>
      </Card>

      {/* Sello de Integridad */}
      <div className="p-2 rounded bg-muted/30 border border-border">
        <p className="text-[10px] text-muted-foreground font-mono tracking-wider text-center">
          Sello de Inexpugnabilidad Zod: SHA-256 {reporte.selloHash}
        </p>
      </div>

      {/* Firma registrada */}
      {firmado && reporte.firma && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">Expediente Sellado — Edición Bloqueada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Firmado por: {reporte.firma.corredorNombre} • {new Date(reporte.firma.timestamp).toLocaleString('es-PA')}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">
                  Hash SHA-256: {reporte.firma.hash}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card className="glass-panel border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              <div>
                <span className="text-sm font-medium text-foreground">Veredicto Final</span>
                {!esCorredor && (
                  <p className="text-xs text-muted-foreground">
                    Solo el Corredor de Aduana con licencia vigente puede firmar
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {firmado ? (
                <Button size="sm" className="gap-1" onClick={() => toast.success('Transmisión simulada a ANA/SIGA')}>
                  <Send className="w-3.5 h-3.5" /> Transmitir al SIGA
                </Button>
              ) : (
                <>
                  {esCorredor && !reporte.rechazo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowRechazoDialog(true)}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rechazar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={!puedeIntentarFirma || !!reporte.rechazo}
                    onClick={() => setShowFirmaDialog(true)}
                    title={!esCorredor ? 'Solo el Corredor puede firmar' : !todosValidados ? 'Los 5 puntos deben estar validados' : ''}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {todosValidados ? 'Firmar y Transmitir al SIGA' : 'Firmar (Requiere 5/5 validados)'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {!todosValidados && !hayBloqueados && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Hay puntos con advertencias. El corredor puede firmar bajo su responsabilidad profesional.
            </p>
          )}
          {hayBloqueados && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Hay puntos bloqueados por Zod. Resuelva todas las incidencias antes de firmar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog Firma */}
      <Dialog open={showFirmaDialog} onOpenChange={setShowFirmaDialog}>
        <DialogContent className="glass-panel sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileSignature className="w-5 h-5" /> Firma Digital Calificada
            </DialogTitle>
            <DialogDescription>
              Solo para {corredor.nombre_completo} — Licencia {corredor.licencia_ana}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Corredor</p>
                <p className="font-medium text-foreground">{corredor.nombre_completo}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Licencia ANA</p>
                <p className="font-medium text-foreground">{corredor.licencia_ana}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Fianza</p>
                <p className="font-medium text-foreground">${corredor.monto_fianza.toLocaleString()} ({corredor.tipo_fianza})</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">Vencimiento</p>
                <p className="font-medium text-foreground">{new Date(corredor.licencia_vencimiento).toLocaleDateString('es-PA')}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
              {CLAUSULA_RESPONSABILIDAD}
            </div>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer">
              <input
                type="checkbox"
                checked={clausulaAceptada}
                onChange={(e) => setClausulaAceptada(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                Acepto la Cláusula de Responsabilidad Técnica. Certifico la exactitud de los datos y autorizo la transmisión al SIGA.
              </span>
            </label>
            {!validacionFirma.puede && (
              <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                <p className="text-xs text-destructive flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> {validacionFirma.motivo}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFirmaDialog(false); setClausulaAceptada(false); }}>
              Cancelar
            </Button>
            <Button
              disabled={!clausulaAceptada || !validacionFirma.puede}
              onClick={handleFirmar}
              className="gap-2"
            >
              <Lock className="w-4 h-4" /> Firmar y Sellar Expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rechazo */}
      <Dialog open={showRechazoDialog} onOpenChange={setShowRechazoDialog}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Rechazar Expediente
            </DialogTitle>
            <DialogDescription>
              Stella notificará al Operador con sus observaciones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej: Verificar el valor del flete declarado contra la factura del transportista. La partida 8542.31 no corresponde a módulos de potencia..."
              rows={4}
            />
            <div className="p-2 rounded bg-primary/5 border border-primary/20">
              <p className="text-xs text-stella flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Stella transmitirá: "Jefe, el Corredor ha solicitado revisar [área]. Por favor, ajusta según la observación."
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechazoDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRechazar}>
              Devolver con Observaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-componente: Punto de Auditoría ───
function PuntoAuditoriaCard({ punto }: { punto: PuntoAuditoria }) {
  const estilos: Record<EstadoPuntoAuditoria, { icon: React.ReactNode; border: string; bg: string }> = {
    validado: {
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      border: 'border-green-500/20',
      bg: 'bg-green-500/5',
    },
    advertencia: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
    },
    bloqueado: {
      icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
      border: 'border-red-500/20',
      bg: 'bg-red-500/5',
    },
  };

  const estilo = estilos[punto.estado];

  return (
    <Card className={`${estilo.border} ${estilo.bg}`}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{estilo.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground">{ICONO_AREA[punto.area]}</span>
              <h4 className="text-sm font-semibold text-foreground">{punto.label}</h4>
              <Badge
                variant="outline"
                className={`text-[10px] ml-auto ${
                  punto.estado === 'validado' ? 'border-green-500/30 text-green-400' :
                  punto.estado === 'advertencia' ? 'border-amber-500/30 text-amber-400' :
                  'border-red-500/30 text-red-400'
                }`}
              >
                {punto.estado === 'validado' ? '✓ Validado' :
                 punto.estado === 'advertencia' ? '⚠ Advertencia' : '✕ Bloqueado'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{punto.detalle}</p>
            {punto.fundamentoLegal && (
              <p className="text-[10px] text-stella mt-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> {punto.fundamentoLegal}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className={`text-sm font-bold ${
              punto.confianza >= 90 ? 'text-green-400' :
              punto.confianza >= 70 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {punto.confianza}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
