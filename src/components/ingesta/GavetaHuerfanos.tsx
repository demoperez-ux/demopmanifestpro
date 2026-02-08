/**
 * GAVETA DE HUÉRFANOS — ZENITH
 * 
 * Panel lateral colapsable que muestra documentos sin trámite asociado.
 * Soporta drag & drop hacia el Monitor de Carga Externa,
 * con matching inteligente de Stella y validación Zod.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Sparkles, GripVertical, FileText, Image, FileSpreadsheet,
  ChevronLeft, ChevronRight, Package, ArrowRight,
  ShieldCheck, ShieldAlert, X, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  type DocumentoHuerfano,
  type SugerenciaAsociacion,
  type ResultadoAsociacion,
} from '@/lib/sniffer/OrphanMatcher';
import { type TipoDocumentoSniffer } from '@/lib/sniffer/DocumentSniffer';

// ─── Tipos locales ──────────────────────────────────────────────

interface GavetaHuerfanosProps {
  huerfanos: DocumentoHuerfano[];
  onAsociar: (docId: string, expedienteId: string) => ResultadoAsociacion;
  onDragStart: (docId: string) => void;
  onDragEnd: () => void;
  className?: string;
}

const TIPO_ICONS: Record<TipoDocumentoSniffer, typeof FileText> = {
  factura_comercial: FileText,
  bill_of_lading: FileSpreadsheet,
  certificado_origen: FileText,
  packing_list: FileSpreadsheet,
  permiso_minsa: FileText,
  permiso_mida: FileText,
  permiso_aupsa: FileText,
  certificado_fitosanitario: FileText,
  poliza_seguro: FileText,
  desconocido: Package,
};

const TIPO_LABELS_SHORT: Record<TipoDocumentoSniffer, string> = {
  factura_comercial: 'Factura',
  bill_of_lading: 'B/L',
  certificado_origen: 'C. Origen',
  packing_list: 'Packing',
  permiso_minsa: 'MINSA',
  permiso_mida: 'MIDA',
  permiso_aupsa: 'AUPSA',
  certificado_fitosanitario: 'Fitosanitario',
  poliza_seguro: 'Seguro',
  desconocido: 'Sin clasificar',
};

// ─── Tarjeta de documento huérfano ──────────────────────────────

function TarjetaHuerfano({
  huerfano,
  onDragStart,
  onDragEnd,
  onClickSugerencia,
}: {
  huerfano: DocumentoHuerfano;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClickSugerencia: (sugerencia: SugerenciaAsociacion) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const Icon = TIPO_ICONS[huerfano.resultado.tipoDetectado] || FileText;
  const mejorSugerencia = huerfano.sugerencias[0];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', huerfano.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'card-interactive p-3 cursor-grab active:cursor-grabbing',
        'group relative animate-fade-in',
        mejorSugerencia && mejorSugerencia.confianzaAsociacion >= 70 && 'border-primary/30 zenith-border-glow'
      )}
    >
      {/* Drag handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      <div className="flex items-start gap-2.5 pl-3">
        {/* Miniatura */}
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {huerfano.resultado.tipoDetectado === 'desconocido' ? (
            <Image className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Icon className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {huerfano.resultado.archivo}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {TIPO_LABELS_SHORT[huerfano.resultado.tipoDetectado]}
            </Badge>
            <span className={cn(
              'text-[9px] font-semibold',
              huerfano.resultado.confianza >= 70 ? 'text-success' :
              huerfano.resultado.confianza >= 40 ? 'text-warning' : 'text-destructive'
            )}>
              {huerfano.resultado.confianza}%
            </span>
          </div>
        </div>
      </div>

      {/* Sugerencia de Stella */}
      {mejorSugerencia && (
        <div className="mt-2 pl-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandido(!expandido);
            }}
            className="w-full text-left"
          >
            <div className="flex items-center gap-1.5 glass-panel-stella rounded-md px-2 py-1.5">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              <p className="text-[10px] text-stella-light truncate flex-1">
                Stella: coincide con <strong>{mejorSugerencia.referencia}</strong>
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1 py-0',
                  mejorSugerencia.confianzaAsociacion >= 70 ? 'text-success border-success/30' :
                  'text-warning border-warning/30'
                )}
              >
                {mejorSugerencia.confianzaAsociacion}%
              </Badge>
            </div>
          </button>

          {expandido && (
            <div className="mt-1.5 space-y-1 animate-fade-in">
              {mejorSugerencia.razones.map((r, i) => (
                <p key={i} className="text-[9px] text-muted-foreground pl-2">• {r}</p>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] w-full mt-1 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickSugerencia(mejorSugerencia);
                }}
              >
                <ArrowRight className="w-3 h-3" />
                Asociar a {mejorSugerencia.referencia}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Resultado de Zod ───────────────────────────────────────────

function ZodResultadoOverlay({
  resultado,
  onClose,
}: {
  resultado: ResultadoAsociacion;
  onClose: () => void;
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg animate-fade-in space-y-2',
      resultado.exito ? 'glass-panel-stella' : 'glass-panel-zod'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {resultado.exito ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-warning" />
          )}
          <span className="text-xs font-bold text-foreground">
            {resultado.exito ? 'Zod: Aprobado' : 'Zod: Rechazado'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">{resultado.mensaje}</p>
      <div className="space-y-0.5">
        {resultado.detalles.map((d, i) => (
          <p key={i} className="text-[10px] text-muted-foreground">{d}</p>
        ))}
      </div>
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────

export function GavetaHuerfanos({
  huerfanos,
  onAsociar,
  onDragStart,
  onDragEnd,
  className,
}: GavetaHuerfanosProps) {
  const [colapsado, setColapsado] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoAsociacion | null>(null);

  const handleClickSugerencia = useCallback((docId: string, sugerencia: SugerenciaAsociacion) => {
    const resultado = onAsociar(docId, sugerencia.expedienteId);
    setUltimoResultado(resultado);

    if (resultado.exito) {
      toast.success('Zod: Documento vinculado — Integridad confirmada ✓', {
        description: `Asociado al expediente ${sugerencia.referencia}`,
        duration: 5000,
      });
    } else {
      toast.error('Zod: Documento devuelto a la Gaveta ✗', {
        description: resultado.mensaje,
        duration: 7000,
      });
    }

    // Clear resultado after 6s
    setTimeout(() => setUltimoResultado(null), 6000);
  }, [onAsociar]);

  // Mini state (collapsed)
  if (colapsado) {
    return (
      <div className={cn(
        'card-elevated flex flex-col items-center py-4 px-1.5 gap-3 w-12',
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setColapsado(false)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex flex-col items-center gap-1">
          <Inbox className="w-4 h-4 text-primary" />
          {huerfanos.length > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 min-w-[18px] text-center">
              {huerfanos.length}
            </Badge>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground writing-mode-vertical rotate-180"
          style={{ writingMode: 'vertical-rl' }}>
          Huérfanos
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'card-elevated flex flex-col w-72 max-h-[600px]',
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            Gaveta de Stella
          </span>
          {huerfanos.length > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
              {huerfanos.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setColapsado(true)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border">
        Documentos sin trámite. Arrastre a un expediente o use las sugerencias de Stella.
      </p>

      {/* Zod result */}
      {ultimoResultado && (
        <div className="px-3 pt-2">
          <ZodResultadoOverlay
            resultado={ultimoResultado}
            onClose={() => setUltimoResultado(null)}
          />
        </div>
      )}

      {/* Document list */}
      <ScrollArea className="flex-1 px-3 py-2">
        {huerfanos.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              Sin documentos huérfanos
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Todos los documentos han sido asociados.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {huerfanos.map((h) => (
              <TarjetaHuerfano
                key={h.id}
                huerfano={h}
                onDragStart={() => onDragStart(h.id)}
                onDragEnd={onDragEnd}
                onClickSugerencia={(sug) => handleClickSugerencia(h.id, sug)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer stats */}
      {huerfanos.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{huerfanos.filter(h => h.sugerencias.length > 0).length} con sugerencias</span>
            <span>{huerfanos.filter(h => h.sugerencias.some(s => s.confianzaAsociacion >= 70)).length} alta confianza</span>
          </div>
        </div>
      )}
    </div>
  );
}
