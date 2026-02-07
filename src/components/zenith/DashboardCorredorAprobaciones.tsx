/**
 * DASHBOARD DEL CORREDOR — Aprobaciones Pendientes (Flujo 90/10)
 * Vista simplificada: resultados, riesgos mitigados por Zod, Firma Legal
 * El corredor NO necesita ver el proceso de carga, solo resultados y riesgos.
 */

import { useState } from 'react';
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, FileSignature,
  Eye, ChevronRight, Lock, Sparkles, Clock, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  EstadoExpediente,
  INFO_ESTADOS,
  ResumenAuditoriaZod,
  HallazgoZod,
  generarResumenAuditoriaZod,
} from '@/lib/workflow/MotorPreparacionValidacion';
import {
  generarInformeConfianzaZod,
  InformeConfianzaZod,
  PuntoCriticoZod,
} from '@/lib/workflow/StellaZodContextual';
import { generarFirmaDigital, CLAUSULA_RESPONSABILIDAD } from '@/lib/core/SistemaFirmaDigital';
import { toast } from 'sonner';

// Expediente pendiente para el corredor
interface ExpedientePendiente {
  id: string;
  mawb: string;
  consignatario: string;
  operador: string;
  estado: EstadoExpediente;
  totalItems: number;
  valorCIF: number;
  fechaEnvio: string;
  resumenZod: ResumenAuditoriaZod;
}

// Mock data
const MOCK_EXPEDIENTES: ExpedientePendiente[] = [
  {
    id: 'exp-001',
    mawb: '123-45678901',
    consignatario: 'Distribuidora Pacífica S.A.',
    operador: 'Ana García (Analista)',
    estado: 'listo_para_revision',
    totalItems: 45,
    valorCIF: 28750.00,
    fechaEnvio: '2026-02-07T10:30:00Z',
    resumenZod: generarResumenAuditoriaZod({
      totalItems: 45,
      itemsConErrores: 0,
      itemsConAdvertencias: 2,
      confianzaPromedio: 93,
      hallazgos: [
        {
          id: 'h1', tipo: 'clasificacion', severidad: 'advertencia',
          titulo: 'Partida arancelaria sugerida con 87% confianza',
          descripcion: 'El ítem "Módulo electrónico 3.3V" podría clasificarse en 8542.31 o 8542.39. Requiere criterio del corredor.',
          itemAfectado: 'Guía HWB-1234',
          sugerencia: 'Verificar si el módulo contiene circuito integrado monolítico',
          requiereCriterio: true,
        },
        {
          id: 'h2', tipo: 'permisos', severidad: 'advertencia',
          titulo: 'Registro sanitario próximo a vencer',
          descripcion: 'El registro MINSA RS-2024-1455 vence el 15/03/2026. Considere renovación.',
          itemAfectado: 'Guía HWB-1238',
          requiereCriterio: false,
        },
      ],
    }),
  },
  {
    id: 'exp-002',
    mawb: '789-12345678',
    consignatario: 'FarmaCentral Panamá',
    operador: 'Carlos Mendoza (Analista)',
    estado: 'listo_para_revision',
    totalItems: 12,
    valorCIF: 156320.50,
    fechaEnvio: '2026-02-07T08:15:00Z',
    resumenZod: generarResumenAuditoriaZod({
      totalItems: 12,
      itemsConErrores: 1,
      itemsConAdvertencias: 0,
      confianzaPromedio: 72,
      hallazgos: [
        {
          id: 'h3', tipo: 'valoracion', severidad: 'critico',
          titulo: 'Posible subvaloración detectada',
          descripcion: 'El valor declarado de $13.50/kg para "Principio activo Omeprazol" es un 68% inferior al promedio de mercado ($42.00/kg).',
          itemAfectado: 'Guía HWB-5001',
          sugerencia: 'Solicitar factura comercial original y certificado de análisis',
          requiereCriterio: true,
        },
      ],
    }),
  },
  {
    id: 'exp-003',
    mawb: '456-98765432',
    consignatario: 'TechImport Corp.',
    operador: 'Ana García (Analista)',
    estado: 'en_revision',
    totalItems: 8,
    valorCIF: 5200.00,
    fechaEnvio: '2026-02-06T14:00:00Z',
    resumenZod: generarResumenAuditoriaZod({
      totalItems: 8,
      itemsConErrores: 0,
      itemsConAdvertencias: 0,
      confianzaPromedio: 98,
      hallazgos: [],
    }),
  },
];

export function DashboardCorredorAprobaciones() {
  const [expedientes, setExpedientes] = useState(MOCK_EXPEDIENTES);
  const [expedienteActivo, setExpedienteActivo] = useState<ExpedientePendiente | null>(null);
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  const [showDevolucionDialog, setShowDevolucionDialog] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [clausulaAceptada, setClausulaAceptada] = useState(false);

  const pendientes = expedientes.filter(e => e.estado === 'listo_para_revision');
  const enRevision = expedientes.filter(e => e.estado === 'en_revision');
  const completados = expedientes.filter(e =>
    e.estado === 'aprobado' || e.estado === 'firmado' || e.estado === 'transmitido'
  );

  const handleIniciarRevision = (exp: ExpedientePendiente) => {
    setExpedientes(prev => prev.map(e =>
      e.id === exp.id ? { ...e, estado: 'en_revision' as EstadoExpediente } : e
    ));
    setExpedienteActivo({ ...exp, estado: 'en_revision' });
    toast.success('Revisión iniciada');
  };

  const handleAprobar = (exp: ExpedientePendiente) => {
    setExpedientes(prev => prev.map(e =>
      e.id === exp.id ? { ...e, estado: 'aprobado' as EstadoExpediente } : e
    ));
    setExpedienteActivo(null);
    toast.success('Expediente aprobado — pendiente firma digital');
  };

  const handleDevolver = (exp: ExpedientePendiente) => {
    if (!motivoDevolucion.trim()) {
      toast.error('Debe indicar el motivo de la devolución');
      return;
    }
    setExpedientes(prev => prev.map(e =>
      e.id === exp.id ? { ...e, estado: 'requiere_correccion' as EstadoExpediente } : e
    ));
    setExpedienteActivo(null);
    setShowDevolucionDialog(false);
    setMotivoDevolucion('');
    toast.info('Expediente devuelto al operador con observaciones');
  };

  const handleFirmar = async (exp: ExpedientePendiente) => {
    if (!clausulaAceptada) {
      toast.error('Debe aceptar la cláusula de responsabilidad');
      return;
    }
    try {
      const firma = await generarFirmaDigital(
        JSON.stringify({ mawb: exp.mawb, valorCIF: exp.valorCIF, items: exp.totalItems }),
        'corredor-001',
        'Lic. Roberto Pérez M.',
        exp.id
      );
      setExpedientes(prev => prev.map(e =>
        e.id === exp.id ? { ...e, estado: 'firmado' as EstadoExpediente } : e
      ));
      setShowFirmaDialog(false);
      setClausulaAceptada(false);
      setExpedienteActivo(null);
      toast.success(`Firma digital registrada: ${firma.hash.substring(0, 16)}...`);
    } catch {
      toast.error('Error al generar firma digital');
    }
  };

  const informe = expedienteActivo
    ? generarInformeConfianzaZod(expedienteActivo.resumenZod)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gradient tracking-wider">
            Portal del Corredor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aprobaciones Pendientes — Veredicto Profesional (Fase 10%)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-warning/30 text-zod gap-1">
            <Shield className="w-3 h-3" />
            Zod — Filtro Activo
          </Badge>
          <Badge variant="outline" className="border-primary/30 text-stella gap-1">
            <Sparkles className="w-3 h-3" />
            Stella — Enlace Proactivo
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-400">{pendientes.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En Revisión</p>
                <p className="text-2xl font-bold text-purple-400">{enRevision.length}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completados Hoy</p>
                <p className="text-2xl font-bold text-green-400">{completados.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Pendiente</p>
                <p className="text-2xl font-bold text-primary">
                  ${pendientes.reduce((s, e) => s + e.valorCIF, 0).toLocaleString()}
                </p>
              </div>
              <FileSignature className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      {expedienteActivo && informe ? (
        <DetalleExpediente
          expediente={expedienteActivo}
          informe={informe}
          onAprobar={() => handleAprobar(expedienteActivo)}
          onDevolver={() => setShowDevolucionDialog(true)}
          onFirmar={() => setShowFirmaDialog(true)}
          onVolver={() => setExpedienteActivo(null)}
        />
      ) : (
        <Tabs defaultValue="pendientes">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="pendientes" className="gap-1">
              <Clock className="w-3 h-3" /> Pendientes ({pendientes.length})
            </TabsTrigger>
            <TabsTrigger value="en-revision" className="gap-1">
              <Eye className="w-3 h-3" /> En Revisión ({enRevision.length})
            </TabsTrigger>
            <TabsTrigger value="completados" className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completados ({completados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes" className="mt-4 space-y-3">
            {pendientes.length === 0 ? (
              <Card className="glass-panel">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay expedientes pendientes</p>
                </CardContent>
              </Card>
            ) : (
              pendientes.map(exp => (
                <ExpedienteCard key={exp.id} expediente={exp} onIniciarRevision={() => handleIniciarRevision(exp)} />
              ))
            )}
          </TabsContent>
          <TabsContent value="en-revision" className="mt-4 space-y-3">
            {enRevision.map(exp => (
              <ExpedienteCard key={exp.id} expediente={exp} onVerDetalle={() => setExpedienteActivo(exp)} />
            ))}
          </TabsContent>
          <TabsContent value="completados" className="mt-4 space-y-3">
            {completados.map(exp => (<ExpedienteCard key={exp.id} expediente={exp} />))}
          </TabsContent>
        </Tabs>
      )}

      {/* Devolución Dialog */}
      <Dialog open={showDevolucionDialog} onOpenChange={setShowDevolucionDialog}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <XCircle className="w-5 h-5" /> Devolver al Operador
            </DialogTitle>
            <DialogDescription>Indique las correcciones requeridas</DialogDescription>
          </DialogHeader>
          <Textarea value={motivoDevolucion} onChange={(e) => setMotivoDevolucion(e.target.value)} placeholder="Detalle las correcciones necesarias..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevolucionDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => expedienteActivo && handleDevolver(expedienteActivo)}>
              Devolver con Observaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Firma Dialog */}
      <Dialog open={showFirmaDialog} onOpenChange={setShowFirmaDialog}>
        <DialogContent className="glass-panel sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileSignature className="w-5 h-5" /> Firma Digital Calificada
            </DialogTitle>
            <DialogDescription>Exclusiva del Corredor de Aduana licenciado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {CLAUSULA_RESPONSABILIDAD}
            </div>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer">
              <input type="checkbox" checked={clausulaAceptada} onChange={(e) => setClausulaAceptada(e.target.checked)} className="mt-0.5" />
              <span className="text-sm text-foreground">
                Acepto la Cláusula de Responsabilidad Técnica y certifico la exactitud de los datos.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFirmaDialog(false)}>Cancelar</Button>
            <Button disabled={!clausulaAceptada} onClick={() => expedienteActivo && handleFirmar(expedienteActivo)} className="gap-2">
              <Lock className="w-4 h-4" /> Firmar y Autorizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Sub-componentes ===

function ExpedienteCard({ expediente, onIniciarRevision, onVerDetalle }: {
  expediente: ExpedientePendiente;
  onIniciarRevision?: () => void;
  onVerDetalle?: () => void;
}) {
  const info = INFO_ESTADOS[expediente.estado];
  const confianza = expediente.resumenZod.confianzaGeneral;

  return (
    <Card className="glass-panel hover:border-primary/30 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{info.icono}</span>
              <div>
                <h3 className="font-semibold text-foreground">MAWB {expediente.mawb}</h3>
                <p className="text-sm text-muted-foreground">{expediente.consignatario}</p>
              </div>
              <Badge className={`${info.color} text-xs`}>{info.label}</Badge>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>📦 {expediente.totalItems} ítems</span>
              <span>💰 ${expediente.valorCIF.toLocaleString()}</span>
              <span>👤 {expediente.operador}</span>
              <span>📅 {new Date(expediente.fechaEnvio).toLocaleDateString('es-PA')}</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Shield className="w-3.5 h-3.5 text-zod" />
              <div className="flex-1 max-w-xs">
                <Progress value={confianza} className="h-2" />
              </div>
              <span className={`text-xs font-medium ${confianza >= 90 ? 'text-green-400' : confianza >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                {confianza}% confianza
              </span>
              {expediente.resumenZod.itemsBloqueados > 0 && (
                <Badge variant="destructive" className="text-[10px]">{expediente.resumenZod.itemsBloqueados} bloqueado(s)</Badge>
              )}
              {expediente.resumenZod.itemsConDuda > 0 && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{expediente.resumenZod.itemsConDuda} criterio</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {onIniciarRevision && (
              <Button size="sm" onClick={onIniciarRevision} className="gap-1">
                <Eye className="w-3.5 h-3.5" /> Revisar
              </Button>
            )}
            {onVerDetalle && (
              <Button size="sm" variant="outline" onClick={onVerDetalle} className="gap-1">
                <ChevronRight className="w-3.5 h-3.5" /> Continuar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetalleExpediente({ expediente, informe, onAprobar, onDevolver, onFirmar, onVolver }: {
  expediente: ExpedientePendiente;
  informe: InformeConfianzaZod;
  onAprobar: () => void;
  onDevolver: () => void;
  onFirmar: () => void;
  onVolver: () => void;
}) {
  const info = INFO_ESTADOS[expediente.estado];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onVolver} className="hover:text-foreground transition-colors">← Volver</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">MAWB {expediente.mawb}</span>
      </div>

      <Card className="glass-panel">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">{expediente.consignatario}</h2>
              <p className="text-sm text-muted-foreground">
                MAWB {expediente.mawb} • {expediente.totalItems} ítems • CIF ${expediente.valorCIF.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Preparado por: {expediente.operador}</p>
            </div>
            <Badge className={`${info.color} text-sm px-3 py-1`}>{info.icono} {info.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Informe Zod */}
      <Card className="glass-panel-zod border-warning/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-zod font-display tracking-wide">
            <Shield className="w-5 h-5" /> Informe de Confianza — Zod
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1"><Progress value={informe.porcentajeValidado} className="h-3" /></div>
            <span className={`text-xl font-bold ${informe.porcentajeValidado >= 90 ? 'text-green-400' : informe.porcentajeValidado >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
              {informe.porcentajeValidado}%
            </span>
          </div>
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-sm text-foreground/90 italic">"{informe.resumen}"</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Puntos de Verificación</p>
            {informe.puntosCriticos.map((punto, idx) => (
              <PuntoCriticoRow key={idx} punto={punto} />
            ))}
          </div>
          {expediente.resumenZod.hallazgos.filter(h => h.requiereCriterio).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-warning/20">
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Requiere su Criterio Profesional
              </p>
              {expediente.resumenZod.hallazgos.filter(h => h.requiereCriterio).map(h => (
                <div key={h.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-sm font-medium text-foreground">{h.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{h.descripcion}</p>
                  {h.sugerencia && (
                    <p className="text-xs text-stella mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sugerencia: {h.sugerencia}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="p-2 rounded bg-muted/30 border border-border">
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider text-center">
              Sello de Integridad: {informe.selloHash}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card className="glass-panel border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Veredicto del Corredor</span>
            </div>
            <div className="flex items-center gap-2">
              {expediente.estado === 'en_revision' && (
                <>
                  <Button variant="outline" size="sm" className="gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={onDevolver}>
                    <XCircle className="w-3.5 h-3.5" /> Devolver
                  </Button>
                  <Button size="sm" className="gap-1" onClick={onAprobar}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                  </Button>
                </>
              )}
              {expediente.estado === 'aprobado' && (
                <Button size="sm" className="gap-1" onClick={onFirmar}>
                  <Lock className="w-3.5 h-3.5" /> Firmar Digitalmente
                </Button>
              )}
              {expediente.estado === 'firmado' && (
                <Button size="sm" className="gap-1" onClick={() => toast.success('Transmisión simulada a ANA')}>
                  <Send className="w-3.5 h-3.5" /> Transmitir a ANA
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PuntoCriticoRow({ punto }: { punto: PuntoCriticoZod }) {
  const icono = punto.estado === 'validado'
    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
    : punto.estado === 'duda'
      ? <AlertTriangle className="w-4 h-4 text-amber-400" />
      : <XCircle className="w-4 h-4 text-red-400" />;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
      {icono}
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{punto.area}</p>
        <p className="text-xs text-muted-foreground">{punto.detalle}</p>
      </div>
      {punto.requiereCriterio && (
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">Criterio requerido</Badge>
      )}
    </div>
  );
}
