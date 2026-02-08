// ============================================
// Carpeta Maestra Panel — Estructura 00 a 08
// ============================================

import React from 'react';
import { FolderOpen, FolderClosed, FileCheck, FileX, FileClock, ChevronRight, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ESTRUCTURA_CARPETA_MAESTRA, 
  type CarpetaMaestraFolder, 
  type ZodDocumentAudit 
} from '@/lib/licenciamiento/MotorLicenciamientoACA';

interface CarpetaMaestraPanelProps {
  etapaActual: number;
  auditorias: ZodDocumentAudit[];
  documentosPorFase: Record<number, { nombre: string; tipo: string; estado: string }[]>;
  onSelectFolder: (fase: number) => void;
  selectedFolder?: number;
}

const ESTADO_ICONS = {
  vigente: <FileCheck className="w-3.5 h-3.5 text-success" />,
  vencido: <FileX className="w-3.5 h-3.5 text-destructive" />,
  por_vencer: <FileClock className="w-3.5 h-3.5 text-warning" />,
  pendiente: <FileClock className="w-3.5 h-3.5 text-muted-foreground" />,
};

export const CarpetaMaestraPanel: React.FC<CarpetaMaestraPanelProps> = ({
  etapaActual,
  auditorias,
  documentosPorFase,
  onSelectFolder,
  selectedFolder,
}) => {
  const getFolderEstado = (fase: number): 'vacio' | 'parcial' | 'completo' | 'bloqueado' => {
    const docs = documentosPorFase[fase] || [];
    const auditsBloqueantes = auditorias.filter(a => a.faseAfectada === fase && a.bloqueaFase);
    
    if (auditsBloqueantes.length > 0) return 'bloqueado';
    if (docs.length === 0) return 'vacio';
    const todosCompletos = docs.every(d => d.estado === 'vigente' || d.estado === 'aprobado');
    return todosCompletos ? 'completo' : 'parcial';
  };

  const getDocCount = (fase: number) => (documentosPorFase[fase] || []).length;

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold font-display tracking-wider text-foreground">
            Carpeta Maestra
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">Ref. SOP-ACA-001 § 7.1</p>
      </div>

      <div className="divide-y divide-border">
        {ESTRUCTURA_CARPETA_MAESTRA.map((folder) => {
          const estado = getFolderEstado(folder.fase);
          const isComplete = folder.fase < etapaActual;
          const isCurrent = folder.fase === etapaActual;
          const isFuture = folder.fase > etapaActual;
          const isSelected = selectedFolder === folder.fase;
          const docCount = getDocCount(folder.fase);

          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.fase)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200',
                isSelected && 'bg-accent/50',
                !isSelected && !isFuture && 'hover:bg-muted/30',
                isFuture && 'opacity-40',
              )}
            >
              {/* Folder Icon */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                estado === 'completo' && 'bg-success/20 text-success border border-success/30',
                estado === 'parcial' && 'bg-warning/20 text-warning border border-warning/30',
                estado === 'vacio' && 'bg-muted text-muted-foreground border border-border',
                estado === 'bloqueado' && 'bg-destructive/20 text-destructive border border-destructive/30',
              )}>
                {estado === 'bloqueado' ? (
                  <Shield className="w-4 h-4" />
                ) : isComplete ? (
                  <FileCheck className="w-4 h-4" />
                ) : (
                  <FolderClosed className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{folder.numero}</span>
                  <span className={cn(
                    'text-sm font-medium truncate',
                    isCurrent && 'text-foreground',
                    isComplete && 'text-success',
                    isFuture && 'text-muted-foreground',
                    estado === 'bloqueado' && 'text-destructive',
                  )}>
                    {folder.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[9px] px-1.5',
                      estado === 'completo' && 'border-success/30 text-success',
                      estado === 'parcial' && 'border-warning/30 text-warning',
                      estado === 'vacio' && 'border-border text-muted-foreground',
                      estado === 'bloqueado' && 'border-destructive/30 text-destructive',
                    )}
                  >
                    {estado === 'bloqueado' ? 'ZOD BLOQUEO' : estado.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {docCount} doc{docCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {isSelected && <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
