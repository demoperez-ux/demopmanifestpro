/**
 * MONITOR DE CARGA EXTERNA — ZENITH
 * 
 * Tabla de monitoreo para trámites externos (no Orión)
 * con semáforo de documentación (Rojo/Amarillo/Verde).
 */

import { useState, useMemo } from 'react';
import {
  CircleAlert, CircleCheck, CircleMinus, ExternalLink,
  FileSearch, Filter, ShieldAlert, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  description: string;
}> = {
  rojo: {
    label: 'Incompleto',
    icon: CircleAlert,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    description: 'Faltan documentos base (Factura/BL)',
  },
  amarillo: {
    label: 'Parcial',
    icon: CircleMinus,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    description: 'Base completa, faltan permisos',
  },
  verde: {
    label: 'Completo',
    icon: CircleCheck,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    description: 'Listo para validación Zod',
  },
};

function SemaforoIndicator({ estado }: { estado: SemaforoEstado }) {
  const config = SEMAFORO_CONFIG[estado];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg', config.bgClass)}>
      <Icon className={cn('w-4 h-4', config.colorClass)} />
      <span className={cn('text-xs font-semibold', config.colorClass)}>
        {config.label}
      </span>
    </div>
  );
}

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
      <div className={cn('card-elevated p-8 text-center', className)}>
        <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-foreground font-medium">Sin trámites externos detectados</p>
        <p className="text-sm text-muted-foreground mt-1">
          Los documentos cargados que no provengan de Orión aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Resumen de semáforos */}
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
                'card-elevated p-3 text-center transition-all cursor-pointer',
                isActive && 'ring-2 ring-primary border-primary/40',
                !isActive && 'hover:border-primary/20'
              )}
            >
              <p className="text-2xl font-bold text-foreground font-display">{count}</p>
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

      {/* Tabla de expedientes */}
      <div className="card-elevated overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Monitor de Carga Externa
            </span>
            <Badge variant="outline" className="text-[10px]">
              [ORIGEN: EXTERNO]
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {expedientesFiltrados.length} de {conteo.total}
            </span>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Semáforo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Importador</TableHead>
                <TableHead>Exportador</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead>Faltantes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expedientesFiltrados.map((exp) => (
                <TableRow
                  key={exp.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onSeleccionarExpediente(exp)}
                >
                  <TableCell>
                    <SemaforoIndicator estado={exp.semaforo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium text-foreground">
                        {exp.referencia}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[160px] truncate">
                    {exp.importador}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {exp.exportador}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[10px]">
                      {exp.documentos.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exp.documentosFaltantes.slice(0, 2).map((doc, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">
                          {doc}
                        </Badge>
                      ))}
                      {exp.permisosFaltantes.slice(0, 1).map((perm, i) => (
                        <Badge key={`p-${i}`} variant="outline" className="text-[10px] text-warning border-warning/30">
                          {perm}
                        </Badge>
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
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onValidarZod(exp.id);
                        }}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Validar Zod
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionarExpediente(exp);
                        }}
                      >
                        Ver detalles
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
