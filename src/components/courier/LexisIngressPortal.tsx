/**
 * LEXIS INGRESS PORTAL — Courier
 * 
 * Main orchestrator component with:
 * 1. Three hierarchical drop zones (Manifest, Master Guide, Bulk Docs)
 * 2. Background linking engine
 * 3. Batch integrity monitor
 * 4. Manifest table with row-click file viewer
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Inbox, Search, Filter, CheckCircle2,
  AlertTriangle, FileQuestion, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { DropZoneManifiesto } from './DropZoneManifiesto';
import { DropZoneGuiaMaster } from './DropZoneGuiaMaster';
import { DropZoneCargaMasiva } from './DropZoneCargaMasiva';
import { MonitorIntegridad } from './MonitorIntegridad';
import { ExpedienteViewer } from './ExpedienteViewer';
import {
  LexisIngressEngine,
  type TramiteRow,
  type GuiaMasterData,
  type IntegridadLote,
  type ResultadoVinculacion,
} from '@/lib/courier/LexisIngressEngine';

type EstadoFiltro = 'todos' | 'completo' | 'sin_factura';

export default function LexisIngressPortal() {
  // State
  const [manifiestoFile, setManifiestoFile] = useState<File | null>(null);
  const [tramites, setTramites] = useState<TramiteRow[]>([]);
  const [guiaMaster, setGuiaMaster] = useState<GuiaMasterData | null>(null);
  const [archivosCount, setArchivosCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [resultadosVinculacion, setResultadosVinculacion] = useState<ResultadoVinculacion[]>([]);
  const [selectedTramite, setSelectedTramite] = useState<TramiteRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');

  // Handlers
  const handleManifiestoLoaded = useCallback((file: File) => {
    setManifiestoFile(file);
    // Simulate manifest parsing — generate demo data
    const demo = LexisIngressEngine.generarManifiestoDemo(689);
    setTramites(demo);
  }, []);

  const handleGuiaMasterLoaded = useCallback((file: File) => {
    const data = LexisIngressEngine.extraerGuiaMaster(file);
    setGuiaMaster(data);
  }, []);

  const handleBulkDocsLoaded = useCallback(async (files: File[]) => {
    if (tramites.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setArchivosCount(files.length);

    const { tramitesActualizados, resultados } = await LexisIngressEngine.vincularDocumentos(
      files,
      tramites,
      (processed, total) => {
        setProcessingProgress(Math.round((processed / total) * 100));
      }
    );

    setTramites(tramitesActualizados);
    setResultadosVinculacion(resultados);
    setIsProcessing(false);
    setProcessingProgress(100);
  }, [tramites]);

  // Computed
  const huerfanos = useMemo(
    () => resultadosVinculacion.filter(r => r.tramiteId === null).length,
    [resultadosVinculacion]
  );

  const integridad = useMemo<IntegridadLote>(
    () => LexisIngressEngine.calcularIntegridad(tramites, huerfanos),
    [tramites, huerfanos]
  );

  const tramitesFiltrados = useMemo(() => {
    let filtered = tramites;
    if (estadoFiltro !== 'todos') {
      filtered = filtered.filter(t => t.estado === estadoFiltro);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.trackingNumber.toLowerCase().includes(q) ||
        t.consignatario.toLowerCase().includes(q) ||
        t.descripcion.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [tramites, estadoFiltro, searchQuery]);

  const showViewer = selectedTramite !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">
              LEXIS Ingress Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Zona de Carga Jerárquica · Vinculación Automática · Monitor de Integridad
            </p>
          </div>
        </div>
        {tramites.length > 0 && (
          <Badge variant="outline" className="border-primary/30 text-xs gap-1.5">
            {tramites.length} trámites
          </Badge>
        )}
      </div>

      {/* Drop Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DropZoneManifiesto
          onFileLoaded={handleManifiestoLoaded}
          archivo={manifiestoFile}
          totalTramites={tramites.length}
        />
        <DropZoneGuiaMaster
          onFileLoaded={handleGuiaMasterLoaded}
          guiaMaster={guiaMaster}
        />
        <DropZoneCargaMasiva
          onFilesLoaded={handleBulkDocsLoaded}
          archivosCount={archivosCount}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
          disabled={tramites.length === 0}
        />
      </div>

      {/* Integrity Monitor */}
      {tramites.length > 0 && (
        <MonitorIntegridad integridad={integridad} />
      )}

      {/* Manifest Table + Viewer */}
      {tramites.length > 0 && (
        <div className={cn('grid gap-0', showViewer ? 'grid-cols-[1fr_380px]' : 'grid-cols-1')}>
          {/* Table */}
          <Card className="card-elevated overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Manifiesto de Trámites
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar guía, consignatario..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs w-56"
                    />
                  </div>
                  <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoFiltro)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="completo">Completos</SelectItem>
                      <SelectItem value="sin_factura">Sin Factura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[480px]">
                <table className="data-table w-full">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-8"></th>
                      <th>Tracking</th>
                      <th>Consignatario</th>
                      <th>Descripción</th>
                      <th className="text-right">Valor FOB</th>
                      <th className="text-right">Peso</th>
                      <th className="text-center">Docs</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tramitesFiltrados.slice(0, 100).map((tramite, idx) => (
                      <tr
                        key={tramite.id}
                        onClick={() => setSelectedTramite(
                          selectedTramite?.id === tramite.id ? null : tramite
                        )}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedTramite?.id === tramite.id && 'bg-primary/5'
                        )}
                      >
                        <td className="text-xs text-muted-foreground text-center">{idx + 1}</td>
                        <td>
                          <span className="font-mono text-xs text-foreground">
                            {tramite.trackingNumber}
                          </span>
                        </td>
                        <td className="text-xs text-foreground">{tramite.consignatario}</td>
                        <td className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {tramite.descripcion}
                        </td>
                        <td className="text-right text-xs font-mono text-foreground">
                          ${tramite.valorFOB.toFixed(2)}
                        </td>
                        <td className="text-right text-xs font-mono text-muted-foreground">
                          {tramite.peso} kg
                        </td>
                        <td className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px]',
                              tramite.documentosVinculados.length > 0
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {tramite.documentosVinculados.length}
                          </Badge>
                        </td>
                        <td className="text-center">
                          {tramite.estado === 'completo' ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : tramite.estado === 'incompleto' ? (
                            <AlertTriangle className="w-4 h-4 text-warning mx-auto" />
                          ) : (
                            <FileQuestion className="w-4 h-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tramitesFiltrados.length > 100 && (
                  <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                    Mostrando 100 de {tramitesFiltrados.length} trámites
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Expediente Viewer Panel */}
          {showViewer && selectedTramite && (
            <ExpedienteViewer
              tramite={selectedTramite}
              onClose={() => setSelectedTramite(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
