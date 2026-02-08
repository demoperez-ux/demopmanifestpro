/**
 * MONITOR DE CARGA EXTERNA — ZENITH
 * Dense data table with professional pill-style status indicators.
 */

import { useState, useMemo } from 'react';
import {
  CircleAlert, CircleCheck, CircleMinus, ExternalLink,
  FileSearch, ShieldAlert, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  type ExpedienteExterno,
  type SemaforoEstado,
} from '@/lib/sniffer/DocumentSniffer';

interface MonitorCargaExternaProps {
  expedientes: ExpedienteExterno[];
  onSeleccionarExpediente: (expediente: ExpedienteExterno) => void;
  onValidarZod: (expedienteId: string) => void;
  className?: string;
}

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

export function MonitorCargaExterna({
  expedientes,
  onSeleccionarExpediente,
  onValidarZod,
  className,
}: MonitorCargaExternaProps) {
  const [filtroSemaforo, setFiltroSemaforo] = useState<SemaforoEstado | 'todos'>('todos');

  const expedientesFiltrados = useMemo(() => {
    if (filtroSemaforo === 'todos') return expedientes;
    return expedientes.filter(e => e.semaforo === filtroSemaforo);
  }, [expedientes, filtroSemaforo]);

  const conteo = useMemo(() => ({
    rojo: expedientes.filter(e => e.semaforo === 'rojo').length,
    amarillo: expedientes.filter(e => e.semaforo === 'amarillo').length,
    verde: expedientes.filter(e => e.semaforo === 'verde').length,
    total: expedientes.length,
  }), [expedientes]);

  if (expedientes.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <CardContent className="p-0">
          <FileSearch className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">Sin trámites externos detectados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Los documentos cargados que no provengan del sistema principal aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter cards */}
      <div className="grid grid-cols-4 gap-3">
        {(['todos', 'rojo', 'amarillo', 'verde'] as const).map((filtro) => {
          const isActive = filtroSemaforo === filtro;
          const count = filtro === 'todos' ? conteo.total : conteo[filtro];
          const config = filtro !== 'todos' ? SEMAFORO_CONFIG[filtro] : null;

          return (
            <button
              key={filtro}
              onClick={() => setFiltroSemaforo(filtro)}
              className={cn(
                'p-3 text-center transition-all cursor-pointer rounded-lg border border-border bg-card',
                isActive && 'ring-1 ring-primary border-primary/30',
                !isActive && 'hover:border-primary/20'
              )}
            >
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className={cn(
                'text-xs font-medium mt-0.5',
                config ? config.colorClass : 'text-muted-foreground'
              )}>
                {filtro === 'todos' ? 'Total' : config!.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Data table */}
      <Card>
        <CardHeader className="p-4 pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            Monitor de Carga Externa
            <Badge variant="outline" className="text-[10px]">Origen Externo</Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {expedientesFiltrados.length} de {conteo.total}
          </span>
        </CardHeader>

        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Estado</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Importador</TableHead>
                <TableHead>Exportador</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead>Faltantes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expedientesFiltrados.map((exp) => {
                const semConfig = SEMAFORO_CONFIG[exp.semaforo];
                const SemIcon = semConfig.icon;
                return (
                  <TableRow
                    key={exp.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSeleccionarExpediente(exp)}
                  >
                    <TableCell>
                      <div className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium',
                        semConfig.bgClass, semConfig.colorClass
                      )}>
                        <SemIcon className="w-3 h-3" />
                        {semConfig.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium text-foreground">{exp.referencia}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[160px] truncate">{exp.importador}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{exp.exportador}</TableCell>
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
                        {(exp.documentosFaltantes.length + exp.permisosFaltantes.length) > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{exp.documentosFaltantes.length + exp.permisosFaltantes.length - 3}
                          </Badge>
                        )}
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
    </div>
  );
}
