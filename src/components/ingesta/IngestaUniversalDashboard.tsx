/**
 * INGESTA UNIVERSAL DASHBOARD — ZENITH
 * 
 * Componente principal que orquesta:
 * 1. Smart Drop Zone (clasificación automática)
 * 2. Panel de Acciones Maestras (sidebar)
 * 3. Formulario de Captura Manual (con Zod)
 * 4. Document Sniffer + Monitor de Carga Externa
 * 5. Stella Checklist (Missing Docs)
 * 6. Zod Cross-Check (Consistencia Cruzada)
 * 7. Gaveta de Huérfanos (Document Limbo) con Drag & Drop
 */

import { useState, useCallback } from 'react';
import { Sparkles, ArrowLeft, FileText, Radar } from 'lucide-react';
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

  // Document Sniffer state
  const [resultadosSniffer, setResultadosSniffer] = useState<ResultadoSniffer[]>([]);
  const [expedientesExternos, setExpedientesExternos] = useState<ExpedienteExterno[]>([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<ExpedienteExterno | null>(null);

  // Gaveta de Huérfanos state
  const [huerfanos, setHuerfanos] = useState<DocumentoHuerfano[]>([]);
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Cuando Stella clasifica archivos, ejecutar Document Sniffer
  const handleFilesClassified = useCallback((archivos: ArchivoClasificado[]) => {
    setArchivosClasificados(archivos);

    // Ejecutar Document Sniffer
    const nuevosResultados: ResultadoSniffer[] = archivos.map((archivo) => {
      const contenidoSimulado = generarContenidoSimulado(archivo);
      return DocumentSniffer.analizar(archivo.file.name, contenidoSimulado);
    });

    setResultadosSniffer(prev => {
      const todosResultados = [...prev, ...nuevosResultados];

      // Agrupar en expedientes externos
      const expedientes = DocumentSniffer.agruparEnExpedientes(todosResultados);

      // Ejecutar Zod Cross-Check
      const expedientesConZod = expedientes.map(exp => {
        if (exp.documentos.some(d => d.tipoDetectado === 'factura_comercial') &&
            exp.documentos.some(d => d.tipoDetectado === 'bill_of_lading')) {
          return { ...exp, consistenciaCruzada: DocumentSniffer.validarConsistenciaCruzada(exp) };
        }
        return exp;
      });

      setExpedientesExternos(expedientesConZod);

      // Identificar documentos huérfanos (no agrupados en ningún expediente)
      const idsEnExpedientes = new Set(
        expedientesConZod.flatMap(e => e.documentos.map(d => d.id))
      );
      const sinExpediente = todosResultados.filter(r =>
        !idsEnExpedientes.has(r.id) && r.origen === 'EXTERNO'
      );

      // Generar sugerencias de Stella para cada huérfano
      const nuevosHuerfanos: DocumentoHuerfano[] = sinExpediente.map(r => ({
        id: r.id,
        resultado: r,
        sugerencias: OrphanMatcher.buscarSugerencias(r, expedientesConZod),
        fechaIngreso: new Date().toISOString(),
      }));
      setHuerfanos(prevH => [...prevH, ...nuevosHuerfanos]);

      // Notificaciones
      const externos = nuevosResultados.filter(r => r.origen === 'EXTERNO');
      if (externos.length > 0) {
        toast.info(`Sniffer: ${externos.length} documento(s) [ORIGEN: EXTERNO]`, {
          duration: 4000,
          icon: '🔍',
        });
        if (expedientesConZod.length > 0 || nuevosHuerfanos.length > 0) {
          setTimeout(() => setTabActiva('monitor'), 1500);
        }
      }

      if (nuevosHuerfanos.length > 0) {
        toast.warning(
          `Gaveta: ${nuevosHuerfanos.length} documento(s) huérfano(s) detectado(s)`,
          {
            description: 'Revise la Gaveta de Stella para asociarlos a un trámite.',
            duration: 5000,
            icon: '📂',
          }
        );
      }

      return todosResultados;
    });

    // OCR para facturas
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
      toast.success('Stella OCR: Datos extraídos. Formulario pre-llenado.', { duration: 5000, icon: '🤖' });
    }

    const manifiestos = archivos.filter(a => a.tipo === 'manifiesto');
    if (manifiestos.length > 0) {
      toast.info('Manifiesto Excel detectado. Usa el Flujo Unificado.', { duration: 4000 });
    }
  }, []);

  // ─── Drag & Drop handlers ──────────────────────────────────────

  const handleDragStartDoc = useCallback((docId: string) => {
    setDraggingDocId(docId);
  }, []);

  const handleDragEndDoc = useCallback(() => {
    setDraggingDocId(null);
    setDropTargetId(null);
  }, []);

  const handleDropOnExpediente = useCallback((e: React.DragEvent, expedienteId: string) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData('text/plain');
    if (!docId) return;

    setDropTargetId(null);
    setDraggingDocId(null);

    // Ejecutar Zod Veto
    const huerfano = huerfanos.find(h => h.id === docId);
    const expediente = expedientesExternos.find(exp => exp.id === expedienteId);
    if (!huerfano || !expediente) return;

    const resultado = OrphanMatcher.validarAsociacion(huerfano.resultado, expediente);

    if (resultado.exito) {
      // Asociar: mover documento al expediente
      setExpedientesExternos(prev =>
        prev.map(exp => {
          if (exp.id === expedienteId) {
            const updated = {
              ...exp,
              documentos: [...exp.documentos, huerfano.resultado],
            };
            // Recalcular semáforo y faltantes
            const tiposPresentes = new Set(updated.documentos.map(d => d.tipoDetectado));
            const docsFaltantes: string[] = [];
            if (!tiposPresentes.has('factura_comercial')) docsFaltantes.push('Factura Comercial');
            if (!tiposPresentes.has('bill_of_lading')) docsFaltantes.push('Bill of Lading / AWB');
            updated.documentosFaltantes = docsFaltantes;
            updated.semaforo = docsFaltantes.length > 0 ? 'rojo' :
              updated.permisosFaltantes.length > 0 ? 'amarillo' : 'verde';
            updated.listoParaZod = updated.semaforo === 'verde';

            // Re-run cross-check if we now have both factura + BL
            if (tiposPresentes.has('factura_comercial') && tiposPresentes.has('bill_of_lading')) {
              updated.consistenciaCruzada = DocumentSniffer.validarConsistenciaCruzada(updated);
            }

            return updated;
          }
          return exp;
        })
      );
      // Remove from gaveta
      setHuerfanos(prev => prev.filter(h => h.id !== docId));
      toast.success('Zod: Documento vinculado — Integridad confirmada ✓', {
        description: resultado.detalles.filter(d => d.startsWith('✅')).join(' '),
        duration: 5000,
      });
    } else {
      // Devolver a la gaveta
      toast.error('Zod: Documento devuelto a la Gaveta ✗', {
        description: resultado.mensaje,
        duration: 7000,
      });
    }
  }, [huerfanos, expedientesExternos]);

  const handleAsociarDesdeBoton = useCallback((docId: string, expedienteId: string): ResultadoAsociacion => {
    const huerfano = huerfanos.find(h => h.id === docId);
    const expediente = expedientesExternos.find(exp => exp.id === expedienteId);
    if (!huerfano || !expediente) {
      return {
        exito: false,
        mensaje: 'Expediente o documento no encontrado.',
        tipo: 'rechazado',
        detalles: [],
        documentoDevuelto: true,
      };
    }

    const resultado = OrphanMatcher.validarAsociacion(huerfano.resultado, expediente);

    if (resultado.exito) {
      setExpedientesExternos(prev =>
        prev.map(exp => {
          if (exp.id === expedienteId) {
            const updated = {
              ...exp,
              documentos: [...exp.documentos, huerfano.resultado],
            };
            const tiposPresentes = new Set(updated.documentos.map(d => d.tipoDetectado));
            const docsFaltantes: string[] = [];
            if (!tiposPresentes.has('factura_comercial')) docsFaltantes.push('Factura Comercial');
            if (!tiposPresentes.has('bill_of_lading')) docsFaltantes.push('Bill of Lading / AWB');
            updated.documentosFaltantes = docsFaltantes;
            updated.semaforo = docsFaltantes.length > 0 ? 'rojo' :
              updated.permisosFaltantes.length > 0 ? 'amarillo' : 'verde';
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

  // ─── Other handlers ────────────────────────────────────────────

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

  const handleCancelDeclaracion = useCallback(() => {
    setVista('inicio');
    setDatosOCR(undefined);
  }, []);

  const handleValidarZod = useCallback((expedienteId: string) => {
    const exp = expedientesExternos.find(e => e.id === expedienteId);
    if (!exp) return;
    const resultado = DocumentSniffer.validarConsistenciaCruzada(exp);
    setExpedientesExternos(prev =>
      prev.map(e => e.id === expedienteId ? { ...e, consistenciaCruzada: resultado } : e)
    );
    setExpedienteSeleccionado({ ...exp, consistenciaCruzada: resultado });
    if (resultado.consistente) {
      toast.success('Zod Cross-Check: Consistencia verificada ✓', { description: resultado.dictamen, duration: 6000 });
    } else {
      toast.warning('Zod Cross-Check: Discrepancias detectadas', { description: resultado.dictamen, duration: 8000 });
    }
  }, [expedientesExternos]);

  const handleSolicitarCliente = useCallback((_expedienteId: string, faltantes: string[]) => {
    toast.success(`Stella: Solicitud generada para ${faltantes.length} documento(s)`, {
      description: 'Correo copiado al portapapeles.',
      duration: 5000,
      icon: '✉️',
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
            <h2 className="text-xl font-bold font-display text-foreground">
              {vista === 'inicio' && 'Ingesta Universal'}
              {vista === 'formulario-manual' && 'Nueva Declaración Manual'}
              {vista === 'carga-masiva' && 'Carga Masiva'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vista === 'inicio' && 'Sniffer clasifica · Stella asocia · Zod valida'}
              {vista === 'formulario-manual' && 'Captura de datos con validación Zod en tiempo real'}
              {vista === 'carga-masiva' && 'Sube manifiestos Excel para procesamiento masivo'}
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
              <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                <Radar className="w-3 h-3" />
                {totalExternos} externo(s)
              </Badge>
            )}
            {huerfanos.length > 0 && (
              <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                {huerfanos.length} huérfano(s)
              </Badge>
            )}
            {datosOCR && (
              <Button size="sm" className="gap-1.5 btn-primary" onClick={handleNuevaDeclaracion}>
                <Sparkles className="w-3.5 h-3.5" />
                Abrir con datos OCR
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Vista Inicio */}
      {vista === 'inicio' && (
        <div className="flex gap-4">
          {/* Main content area */}
          <div className="flex-1 min-w-0">
            <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as 'ingesta' | 'monitor')}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="ingesta" className="gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Zona de Carga
                </TabsTrigger>
                <TabsTrigger value="monitor" className="gap-2">
                  <Radar className="w-3.5 h-3.5" />
                  Monitor Externo
                  {expedientesExternos.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {expedientesExternos.length}
                    </Badge>
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
                <div className={cn(
                  'grid gap-6',
                  expedienteSeleccionado ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
                )}>
                  <div className={expedienteSeleccionado ? 'lg:col-span-2' : ''}>
                    {/* Drop target overlay for Monitor rows */}
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

          {/* Gaveta de Huérfanos — Right sidebar */}
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

      {/* Vista Formulario Manual */}
      {vista === 'formulario-manual' && (
        <FormularioCapturaManual
          datosOCR={datosOCR}
          onSubmit={handleSubmitDeclaracion}
          onCancel={handleCancelDeclaracion}
        />
      )}

      {/* Vista Carga Masiva */}
      {vista === 'carga-masiva' && (
        <div className="text-center py-12 card-elevated p-8">
          <p className="text-lg text-foreground mb-4">
            Usa el <strong>Flujo Unificado</strong> del selector superior para carga masiva de manifiestos Excel.
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
  Filter, ShieldAlert, Tag, FileSearch
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type SemaforoEstado } from '@/lib/sniffer/DocumentSniffer';

const SEMAFORO_CONFIG: Record<SemaforoEstado, {
  label: string;
  icon: typeof CircleAlert;
  colorClass: string;
  bgClass: string;
}> = {
  rojo: { label: 'Incompleto', icon: CircleAlert, colorClass: 'text-destructive', bgClass: 'bg-destructive/10' },
  amarillo: { label: 'Parcial', icon: CircleMinus, colorClass: 'text-warning', bgClass: 'bg-warning/10' },
  verde: { label: 'Completo', icon: CircleCheck, colorClass: 'text-success', bgClass: 'bg-success/10' },
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
      <div className="card-elevated p-8 text-center">
        <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-foreground font-medium">Sin trámites externos</p>
        <p className="text-sm text-muted-foreground mt-1">
          Cargue documentos para que el Sniffer los clasifique.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Monitor de Carga Externa</span>
          <Badge variant="outline" className="text-[10px]">[ORIGEN: EXTERNO]</Badge>
        </div>
        {draggingDocId && (
          <Badge variant="secondary" className="text-[10px] animate-pulse gap-1">
            <Sparkles className="w-3 h-3" />
            Suelte sobre un expediente
          </Badge>
        )}
      </div>

      <ScrollArea className="max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Semáforo</TableHead>
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
                    'cursor-pointer transition-all duration-200',
                    isDropTarget && 'ring-2 ring-primary bg-primary/5 border-primary/40',
                    draggingDocId && !isDropTarget && 'hover:bg-primary/5'
                  )}
                  onClick={() => onSeleccionarExpediente(exp)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    onDragOverExpediente(exp.id);
                  }}
                  onDragLeave={() => onDragOverExpediente(null)}
                  onDrop={(e) => onDropOnExpediente(e, exp.id)}
                >
                  <TableCell>
                    <div className={cn('flex items-center gap-2 px-2 py-1 rounded-lg', semConfig.bgClass)}>
                      <SemIcon className={cn('w-4 h-4', semConfig.colorClass)} />
                      <span className={cn('text-xs font-semibold', semConfig.colorClass)}>
                        {semConfig.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium text-foreground">{exp.referencia}</span>
                    </div>
                    {isDropTarget && (
                      <p className="text-[10px] text-primary mt-0.5 animate-pulse">
                        ← Stella: Suelte aquí para asociar
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[140px] truncate">
                    {exp.importador}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[10px]">{exp.documentos.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exp.documentosFaltantes.slice(0, 2).map((doc, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">{doc}</Badge>
                      ))}
                      {exp.permisosFaltantes.slice(0, 1).map((perm, i) => (
                        <Badge key={`p-${i}`} variant="outline" className="text-[10px] text-warning border-warning/30">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {exp.listoParaZod ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); onValidarZod(exp.id); }}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Validar Zod
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); onSeleccionarExpediente(exp); }}
                      >
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
    </div>
  );
}

// ─── Utilidades ─────────────────────────────────────────────────

function generarContenidoSimulado(archivo: ArchivoClasificado): string {
  const nombre = archivo.file.name.toLowerCase();

  if (archivo.tipo === 'factura_comercial' || nombre.includes('invoice')) {
    return `COMMERCIAL INVOICE
Invoice No.: INV-2026-${Math.floor(Math.random() * 9000) + 1000}
Date: ${new Date().toLocaleDateString('en-US')}
Seller/Exporter: Shanghai Electronics Co. Ltd
Consignee/Importer: Importadora del Pacífico S.A.
Country of Origin: China
HS Code: 8534.00.00
Description: Electronic Components - Printed Circuit Boards
Quantity: 50 units
Unit Price: $25.00
Total Amount: USD 1,250.00
FOB: USD 1,250.00
Gross Weight: 15.5 kg
Net Weight: 12.5 kg
Incoterms: FOB Shanghai
Payment Terms: T/T 30 days`;
  }

  if (archivo.tipo === 'documento_transporte' || nombre.includes('bl') || nombre.includes('bol')) {
    return `BILL OF LADING
B/L No.: COSU${Math.floor(Math.random() * 9000000) + 1000000}
Date: ${new Date().toLocaleDateString('en-US')}
Shipper: Shanghai Electronics Co. Ltd
Consignee: Importadora del Pacífico S.A.
Notify Party: Agencia Aduanera ZENITH
Port of Loading: Shanghai, China
Port of Discharge: Balboa, Panama
Vessel: MSC GÜLSÜN
Voyage: 023E
Container: MSCU1234567
Seal: CN789456
Gross Weight: 15.8 kg
Description: Electronic Components
Freight Prepaid`;
  }

  if (nombre.includes('packing')) {
    return `PACKING LIST
Packing List No.: PL-2026-001
Date: ${new Date().toLocaleDateString('en-US')}
Shipper: Shanghai Electronics Co. Ltd
Consignee: Importadora del Pacífico S.A.
Number of Packages: 2 cartons
Gross Weight: 15.5 kg
Net Weight: 12.5 kg
Dimensions: 60x40x30 cm
Marks and Numbers: N/M`;
  }

  return `Document: ${archivo.file.name}
Date: ${new Date().toLocaleDateString('en-US')}
Reference: ${Math.random().toString(36).substring(2, 10).toUpperCase()}
Content type: General document
No Orion reference found.`;
}
