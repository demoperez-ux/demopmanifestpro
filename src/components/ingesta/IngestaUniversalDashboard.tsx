/**
 * INGESTA UNIVERSAL DASHBOARD — ZENITH
 * Enterprise orchestration component for document intake.
 */

import { useState, useCallback } from 'react';
import React from 'react';
import { ArrowLeft, FileText, Radar, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { SmartDropZone, type ArchivoClasificado } from './SmartDropZone';
import { PanelAccionesMaestras } from './PanelAccionesMaestras';
import { FormularioCapturaManual } from './FormularioCapturaManual';
import { MonitorCargaExterna } from './MonitorCargaExterna';
import { StellaChecklist } from './StellaChecklist';
import { GavetaHuerfanos } from './GavetaHuerfanos';
import {
  DocumentSniffer,
  type ResultadoSniffer,
  type ExpedienteExterno,
} from '@/lib/sniffer/DocumentSniffer';
import {
  OrphanMatcher,
  type DocumentoHuerfano,
  type ResultadoAsociacion,
} from '@/lib/sniffer/OrphanMatcher';

type VistaActual = 'inicio' | 'formulario-manual' | 'carga-masiva';

interface DatosOCR {
  mawb?: string;
  consignatario?: string;
  ruc?: string;
  dv?: string;
  direccion?: string;
  provincia?: string;
  modoTransporte?: string;
  numLiquidacion?: string;
  lineas?: {
    descripcion?: string;
    hsCode?: string;
    cantidad?: number;
    valorFOB?: number;
    peso?: number;
    paisOrigen?: string;
  }[];
}

export function IngestaUniversalDashboard() {
  const [vista, setVista] = useState<VistaActual>('inicio');
  const [archivosClasificados, setArchivosClasificados] = useState<ArchivoClasificado[]>([]);
  const [datosOCR, setDatosOCR] = useState<DatosOCR | undefined>();
  const [tabActiva, setTabActiva] = useState<'ingesta' | 'monitor'>('ingesta');

  const [resultadosSniffer, setResultadosSniffer] = useState<ResultadoSniffer[]>([]);
  const [expedientesExternos, setExpedientesExternos] = useState<ExpedienteExterno[]>([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<ExpedienteExterno | null>(null);

  const [huerfanos, setHuerfanos] = useState<DocumentoHuerfano[]>([]);
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleFilesClassified = useCallback((archivos: ArchivoClasificado[]) => {
    setArchivosClasificados(archivos);

    const nuevosResultados: ResultadoSniffer[] = archivos.map((archivo) => {
      const contenidoSimulado = generarContenidoSimulado(archivo);
      return DocumentSniffer.analizar(archivo.file.name, contenidoSimulado);
    });

    setResultadosSniffer(prev => {
      const todosResultados = [...prev, ...nuevosResultados];
      const expedientes = DocumentSniffer.agruparEnExpedientes(todosResultados);
      const expedientesConZod = expedientes.map(exp => {
        if (exp.documentos.some(d => d.tipoDetectado === 'factura_comercial') &&
            exp.documentos.some(d => d.tipoDetectado === 'bill_of_lading')) {
          return { ...exp, consistenciaCruzada: DocumentSniffer.validarConsistenciaCruzada(exp) };
        }
        return exp;
      });

      setExpedientesExternos(expedientesConZod);

      const idsEnExpedientes = new Set(expedientesConZod.flatMap(e => e.documentos.map(d => d.id)));
      const sinExpediente = todosResultados.filter(r => !idsEnExpedientes.has(r.id) && r.origen === 'EXTERNO');

      const nuevosHuerfanos: DocumentoHuerfano[] = sinExpediente.map(r => ({
        id: r.id,
        resultado: r,
        sugerencias: OrphanMatcher.buscarSugerencias(r, expedientesConZod),
        fechaIngreso: new Date().toISOString(),
      }));
      setHuerfanos(prevH => [...prevH, ...nuevosHuerfanos]);

      const externos = nuevosResultados.filter(r => r.origen === 'EXTERNO');
      if (externos.length > 0) {
        toast.info(`${externos.length} documento(s) de origen externo detectado(s)`, { duration: 4000 });
        if (expedientesConZod.length > 0 || nuevosHuerfanos.length > 0) {
          setTimeout(() => setTabActiva('monitor'), 1500);
        }
      }

      if (nuevosHuerfanos.length > 0) {
        toast('Notificación de Cumplimiento', {
          description: `${nuevosHuerfanos.length} documento(s) pendiente(s) de asignación`,
          duration: 5000,
        });
      }

      return todosResultados;
    });

    const facturas = archivos.filter(a => a.tipo === 'factura_comercial' && a.confianza >= 60);
    if (facturas.length > 0) {
      setDatosOCR({
        consignatario: 'Importadora del Pacífico S.A.',
        ruc: '155612345',
        dv: '78',
        modoTransporte: 'aereo',
        lineas: [{
          descripcion: 'Electronic Components - Printed Circuit Boards',
          hsCode: '8534.00.00',
          cantidad: 50,
          valorFOB: 1250.00,
          peso: 12.5,
          paisOrigen: 'CN',
        }],
      });
      toast.success('Datos extraídos automáticamente. Formulario pre-llenado disponible.', { duration: 5000 });
    }
  }, []);

  // Drag & Drop handlers
  const handleDragStartDoc = useCallback((docId: string) => setDraggingDocId(docId), []);
  const handleDragEndDoc = useCallback(() => { setDraggingDocId(null); setDropTargetId(null); }, []);

  const handleDropOnExpediente = useCallback((e: React.DragEvent, expedienteId: string) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData('text/plain');
    if (!docId) return;
    setDropTargetId(null);
    setDraggingDocId(null);

    const huerfano = huerfanos.find(h => h.id === docId);
    const expediente = expedientesExternos.find(exp => exp.id === expedienteId);
    if (!huerfano || !expediente) return;

    const resultado = OrphanMatcher.validarAsociacion(huerfano.resultado, expediente);

    if (resultado.exito) {
      setExpedientesExternos(prev =>
        prev.map(exp => {
          if (exp.id === expedienteId) {
            const updated = { ...exp, documentos: [...exp.documentos, huerfano.resultado] };
            const tiposPresentes = new Set(updated.documentos.map(d => d.tipoDetectado));
            const docsFaltantes: string[] = [];
            if (!tiposPresentes.has('factura_comercial')) docsFaltantes.push('Factura Comercial');
            if (!tiposPresentes.has('bill_of_lading')) docsFaltantes.push('Bill of Lading / AWB');
            updated.documentosFaltantes = docsFaltantes;
            updated.semaforo = docsFaltantes.length > 0 ? 'rojo' : updated.permisosFaltantes.length > 0 ? 'amarillo' : 'verde';
            updated.listoParaZod = updated.semaforo === 'verde';
            if (tiposPresentes.has('factura_comercial') && tiposPresentes.has('bill_of_lading')) {
              updated.consistenciaCruzada = DocumentSniffer.validarConsistenciaCruzada(updated);
            }
            return updated;
          }
          return exp;
        })
      );
      setHuerfanos(prev => prev.filter(h => h.id !== docId));
      toast.success('Verificación de Integridad: Documento vinculado correctamente', { duration: 5000 });
    } else {
      toast.error('Verificación de Integridad: Documento devuelto', { description: resultado.mensaje, duration: 7000 });
    }
  }, [huerfanos, expedientesExternos]);

  const handleAsociarDesdeBoton = useCallback((docId: string, expedienteId: string): ResultadoAsociacion => {
    const huerfano = huerfanos.find(h => h.id === docId);
    const expediente = expedientesExternos.find(exp => exp.id === expedienteId);
    if (!huerfano || !expediente) {
      return { exito: false, mensaje: 'Expediente o documento no encontrado.', tipo: 'rechazado', detalles: [], documentoDevuelto: true };
    }

    const resultado = OrphanMatcher.validarAsociacion(huerfano.resultado, expediente);

    if (resultado.exito) {
      setExpedientesExternos(prev =>
        prev.map(exp => {
          if (exp.id === expedienteId) {
            const updated = { ...exp, documentos: [...exp.documentos, huerfano.resultado] };
            const tiposPresentes = new Set(updated.documentos.map(d => d.tipoDetectado));
            const docsFaltantes: string[] = [];
            if (!tiposPresentes.has('factura_comercial')) docsFaltantes.push('Factura Comercial');
            if (!tiposPresentes.has('bill_of_lading')) docsFaltantes.push('Bill of Lading / AWB');
            updated.documentosFaltantes = docsFaltantes;
            updated.semaforo = docsFaltantes.length > 0 ? 'rojo' : updated.permisosFaltantes.length > 0 ? 'amarillo' : 'verde';
            updated.listoParaZod = updated.semaforo === 'verde';
            if (tiposPresentes.has('factura_comercial') && tiposPresentes.has('bill_of_lading')) {
              updated.consistenciaCruzada = DocumentSniffer.validarConsistenciaCruzada(updated);
            }
            return updated;
          }
          return exp;
        })
      );
      setHuerfanos(prev => prev.filter(h => h.id !== docId));
    }

    return resultado;
  }, [huerfanos, expedientesExternos]);

  const handleNuevaDeclaracion = useCallback(() => setVista('formulario-manual'), []);
  const handleCargaMasiva = useCallback(() => setVista('carga-masiva'), []);

  const handleSubmitDeclaracion = useCallback((encabezado: any, lineas: any) => {
    toast.success(`Declaración registrada: ${lineas.length} línea(s)`, {
      description: `MAWB: ${encabezado.mawb || 'Sin MAWB'} — ${encabezado.consignatario}`,
      duration: 5000,
    });
    setVista('inicio');
    setDatosOCR(undefined);
    setArchivosClasificados([]);
  }, []);

  const handleCancelDeclaracion = useCallback(() => { setVista('inicio'); setDatosOCR(undefined); }, []);

  const handleValidarZod = useCallback((expedienteId: string) => {
    const exp = expedientesExternos.find(e => e.id === expedienteId);
    if (!exp) return;
    const resultado = DocumentSniffer.validarConsistenciaCruzada(exp);
    setExpedientesExternos(prev => prev.map(e => e.id === expedienteId ? { ...e, consistenciaCruzada: resultado } : e));
    setExpedienteSeleccionado({ ...exp, consistenciaCruzada: resultado });
    if (resultado.consistente) {
      toast.success('Verificación de Integridad completada', { description: resultado.dictamen, duration: 6000 });
    } else {
      toast.warning('Discrepancias detectadas en verificación', { description: resultado.dictamen, duration: 8000 });
    }
  }, [expedientesExternos]);

  const handleSolicitarCliente = useCallback((_expedienteId: string, faltantes: string[]) => {
    toast.success(`Solicitud generada para ${faltantes.length} documento(s)`, {
      description: 'Contenido copiado al portapapeles.',
      duration: 5000,
    });
  }, []);

  const totalExternos = resultadosSniffer.filter(r => r.origen === 'EXTERNO').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {vista !== 'inicio' && (
            <Button variant="ghost" size="icon" onClick={() => setVista('inicio')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {vista === 'inicio' && 'Ingesta Universal'}
              {vista === 'formulario-manual' && 'Nueva Declaración Manual'}
              {vista === 'carga-masiva' && 'Carga Masiva'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vista === 'inicio' && 'Clasificación automática, asociación y validación de documentos'}
              {vista === 'formulario-manual' && 'Captura de datos con validación en tiempo real'}
              {vista === 'carga-masiva' && 'Importación de manifiestos Excel'}
            </p>
          </div>
        </div>
        {archivosClasificados.length > 0 && vista === 'inicio' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="w-3 h-3" />
              {archivosClasificados.length} archivo(s)
            </Badge>
            {totalExternos > 0 && (
              <Badge variant="outline" className="gap-1">
                <Radar className="w-3 h-3" />
                {totalExternos} externo(s)
              </Badge>
            )}
            {huerfanos.length > 0 && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                {huerfanos.length} pendiente(s)
              </Badge>
            )}
            {datosOCR && (
              <Button size="sm" onClick={handleNuevaDeclaracion}>
                Abrir con datos extraídos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main view */}
      {vista === 'inicio' && (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as 'ingesta' | 'monitor')}>
              <TabsList>
                <TabsTrigger value="ingesta" className="gap-2">
                  <Inbox className="w-3.5 h-3.5" />
                  Zona de Carga
                </TabsTrigger>
                <TabsTrigger value="monitor" className="gap-2">
                  <Radar className="w-3.5 h-3.5" />
                  Monitor Externo
                  {expedientesExternos.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">{expedientesExternos.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingesta" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <SmartDropZone onFilesClassified={handleFilesClassified} />
                  </div>
                  <PanelAccionesMaestras
                    onNuevaDeclaracion={handleNuevaDeclaracion}
                    onCargaMasiva={handleCargaMasiva}
                    className="lg:col-span-1"
                  />
                </div>
              </TabsContent>

              <TabsContent value="monitor" className="mt-4">
                <div className={cn('grid gap-6', expedienteSeleccionado ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
                  <div className={expedienteSeleccionado ? 'lg:col-span-2' : ''}>
                    <MonitorCargaExternaConDrop
                      expedientes={expedientesExternos}
                      onSeleccionarExpediente={setExpedienteSeleccionado}
                      onValidarZod={handleValidarZod}
                      draggingDocId={draggingDocId}
                      dropTargetId={dropTargetId}
                      onDragOverExpediente={setDropTargetId}
                      onDropOnExpediente={handleDropOnExpediente}
                    />
                  </div>
                  {expedienteSeleccionado && (
                    <div className="lg:col-span-1">
                      <StellaChecklist
                        expediente={expedienteSeleccionado}
                        onClose={() => setExpedienteSeleccionado(null)}
                        onSolicitarCliente={handleSolicitarCliente}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {(huerfanos.length > 0 || resultadosSniffer.length > 0) && (
            <GavetaHuerfanos
              huerfanos={huerfanos}
              onAsociar={handleAsociarDesdeBoton}
              onDragStart={handleDragStartDoc}
              onDragEnd={handleDragEndDoc}
            />
          )}
        </div>
      )}

      {vista === 'formulario-manual' && (
        <FormularioCapturaManual
          datosOCR={datosOCR}
          onSubmit={handleSubmitDeclaracion}
          onCancel={handleCancelDeclaracion}
        />
      )}

      {vista === 'carga-masiva' && (
        <div className="text-center py-12 border border-border rounded-lg bg-card p-8">
          <p className="text-sm text-foreground mb-4">
            Utilice el <strong>Flujo Unificado</strong> del selector superior para la carga masiva de manifiestos Excel.
          </p>
          <Button variant="outline" onClick={() => setVista('inicio')}>
            Volver a Ingesta Universal
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Monitor with Drop Target support ───────────────────────────

import {
  CircleAlert, CircleCheck, CircleMinus, ExternalLink,
  ShieldAlert, Tag, FileSearch
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type SemaforoEstado } from '@/lib/sniffer/DocumentSniffer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SEMAFORO_CONFIG: Record<SemaforoEstado, {
  label: string;
  icon: typeof CircleAlert;
  colorClass: string;
  bgClass: string;
}> = {
  rojo: { label: 'Incompleto', icon: CircleAlert, colorClass: 'text-destructive', bgClass: 'bg-destructive-light' },
  amarillo: { label: 'En Proceso', icon: CircleMinus, colorClass: 'text-warning', bgClass: 'bg-warning-light' },
  verde: { label: 'Validado', icon: CircleCheck, colorClass: 'text-success', bgClass: 'bg-success-light' },
};

function MonitorCargaExternaConDrop({
  expedientes,
  onSeleccionarExpediente,
  onValidarZod,
  draggingDocId,
  dropTargetId,
  onDragOverExpediente,
  onDropOnExpediente,
}: {
  expedientes: ExpedienteExterno[];
  onSeleccionarExpediente: (exp: ExpedienteExterno) => void;
  onValidarZod: (id: string) => void;
  draggingDocId: string | null;
  dropTargetId: string | null;
  onDragOverExpediente: (id: string | null) => void;
  onDropOnExpediente: (e: React.DragEvent, expedienteId: string) => void;
}) {
  if (expedientes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CardContent className="p-0">
          <FileSearch className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">Sin trámites externos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Los documentos cargados que no provengan del sistema principal aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          Monitor de Carga Externa
          <Badge variant="outline" className="text-[10px]">Origen Externo</Badge>
        </CardTitle>
        {draggingDocId && (
          <Badge variant="secondary" className="text-[10px] animate-pulse">
            Suelte sobre un expediente
          </Badge>
        )}
      </CardHeader>

      <ScrollArea className="max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Estado</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Importador</TableHead>
              <TableHead className="text-center">Docs</TableHead>
              <TableHead>Faltantes</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expedientes.map((exp) => {
              const semConfig = SEMAFORO_CONFIG[exp.semaforo];
              const SemIcon = semConfig.icon;
              const isDropTarget = dropTargetId === exp.id && draggingDocId;

              return (
                <TableRow
                  key={exp.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    isDropTarget && 'ring-1 ring-primary bg-primary/5',
                    draggingDocId && !isDropTarget && 'hover:bg-primary/5'
                  )}
                  onClick={() => onSeleccionarExpediente(exp)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOverExpediente(exp.id); }}
                  onDragLeave={() => onDragOverExpediente(null)}
                  onDrop={(e) => onDropOnExpediente(e, exp.id)}
                >
                  <TableCell>
                    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium', semConfig.bgClass, semConfig.colorClass)}>
                      <SemIcon className="w-3 h-3" />
                      {semConfig.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium text-foreground">{exp.referencia}</span>
                    </div>
                    {isDropTarget && (
                      <p className="text-[10px] text-primary mt-0.5 animate-pulse">Soltar aquí para asociar</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[140px] truncate">{exp.importador}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[10px]">{exp.documentos.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exp.documentosFaltantes.slice(0, 2).map((doc, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">{doc}</Badge>
                      ))}
                      {exp.permisosFaltantes.slice(0, 1).map((perm, i) => (
                        <Badge key={`p-${i}`} variant="outline" className="text-[10px] text-warning border-warning/30">{perm}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {exp.listoParaZod ? (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onValidarZod(exp.id); }}>
                        <ShieldAlert className="w-3 h-3" />
                        Validar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onSeleccionarExpediente(exp); }}>
                        Ver detalles
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

// ─── Utilities ──────────────────────────────────────────────────

function generarContenidoSimulado(archivo: ArchivoClasificado): string {
  const nombre = archivo.file.name.toLowerCase();

  if (archivo.tipo === 'factura_comercial' || nombre.includes('invoice')) {
    return `COMMERCIAL INVOICE\nInvoice No.: INV-2026-${Math.floor(Math.random() * 9000) + 1000}\nDate: ${new Date().toLocaleDateString('en-US')}\nSeller/Exporter: Shanghai Electronics Co. Ltd\nConsignee/Importer: Importadora del Pacífico S.A.\nCountry of Origin: China\nHS Code: 8534.00.00\nDescription: Electronic Components - Printed Circuit Boards\nQuantity: 50 units\nUnit Price: $25.00\nTotal Amount: USD 1,250.00\nFOB: USD 1,250.00\nGross Weight: 15.5 kg\nNet Weight: 12.5 kg`;
  }

  if (archivo.tipo === 'documento_transporte' || nombre.includes('bl') || nombre.includes('bol')) {
    return `BILL OF LADING\nB/L No.: COSU${Math.floor(Math.random() * 9000000) + 1000000}\nDate: ${new Date().toLocaleDateString('en-US')}\nShipper: Shanghai Electronics Co. Ltd\nConsignee: Importadora del Pacífico S.A.\nPort of Loading: Shanghai, China\nPort of Discharge: Balboa, Panama\nVessel: MSC GÜLSÜN\nGross Weight: 15.8 kg\nDescription: Electronic Components`;
  }

  if (nombre.includes('packing')) {
    return `PACKING LIST\nPacking List No.: PL-2026-001\nDate: ${new Date().toLocaleDateString('en-US')}\nShipper: Shanghai Electronics Co. Ltd\nConsignee: Importadora del Pacífico S.A.\nNumber of Packages: 2 cartons\nGross Weight: 15.5 kg\nNet Weight: 12.5 kg`;
  }

  return `Document: ${archivo.file.name}\nDate: ${new Date().toLocaleDateString('en-US')}\nReference: ${Math.random().toString(36).substring(2, 10).toUpperCase()}\nNo system reference found.`;
}
