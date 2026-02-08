/**
 * LEXIS: Pending Classification — ZENITH
 * Executive inbox-style panel for unassigned documents.
 */

import { useState, useCallback } from 'react';
import {
  GripVertical, FileText, Image, FileSpreadsheet,
  ChevronLeft, ChevronRight, Package, ArrowRight,
  ShieldCheck, ShieldAlert, X, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  type DocumentoHuerfano,
  type SugerenciaAsociacion,
  type ResultadoAsociacion,
} from '@/lib/sniffer/OrphanMatcher';
import { type TipoDocumentoSniffer } from '@/lib/sniffer/DocumentSniffer';

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
        'p-3 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing',
        'group relative animate-fade-in hover:border-primary/20 transition-colors',
        mejorSugerencia && mejorSugerencia.confianzaAsociacion >= 70 && 'border-primary/30'
      )}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      <div className="flex items-start gap-2.5 pl-3">
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{huerfano.resultado.archivo}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {TIPO_LABELS_SHORT[huerfano.resultado.tipoDetectado]}
            </Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              LEXIS: Pending
            </Badge>
          </div>
        </div>
      </div>

      {mejorSugerencia && (
        <div className="mt-2 pl-3">
          <button
            onClick={(e) => { e.stopPropagation(); setExpandido(!expandido); }}
            className="w-full text-left"
          >
            <div className="flex items-center gap-1.5 panel-stella rounded-md px-2 py-1.5">
              <p className="text-[10px] text-foreground truncate flex-1">
                Sugerencia: Coincide con <strong>{mejorSugerencia.referencia}</strong>
              </p>
              <Badge variant="outline" className={cn(
                'text-[9px] px-1 py-0',
                mejorSugerencia.confianzaAsociacion >= 70 ? 'text-success border-success/30' : 'text-warning border-warning/30'
              )}>
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
                onClick={(e) => { e.stopPropagation(); onClickSugerencia(mejorSugerencia); }}
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
      resultado.exito ? 'panel-stella' : 'panel-zod'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {resultado.exito ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-warning" />
          )}
           <span className="text-xs font-semibold text-foreground">
             LEXIS: Certificación de Integridad — {resultado.exito ? 'Aprobada' : 'Rechazada'}
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
      toast.success('LEXIS: Certificación de Integridad — Documento vinculado', {
        description: `Asociado al expediente ${sugerencia.referencia}`,
        duration: 5000,
      });
    } else {
      toast.error('LEXIS: Alerta de Riesgo Legal — Documento devuelto', {
        description: resultado.mensaje,
        duration: 7000,
      });
    }

    setTimeout(() => setUltimoResultado(null), 6000);
  }, [onAsociar]);

  if (colapsado) {
    return (
      <div className={cn(
        'flex flex-col items-center py-4 px-1.5 gap-3 w-12 border border-border rounded-lg bg-card',
        className
      )}>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setColapsado(false)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex flex-col items-center gap-1">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          {huerfanos.length > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 min-w-[18px] text-center">
              {huerfanos.length}
            </Badge>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground rotate-180" style={{ writingMode: 'vertical-rl' }}>
          Pendientes
        </span>
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col w-72 max-h-[600px]', className)}>
      <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          LEXIS: Pending Classification
          {huerfanos.length > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{huerfanos.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setColapsado(true)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      <p className="px-3 pb-2 text-[10px] text-muted-foreground border-b border-border">
        Documentación sin trámite asignado. Arrastre a un expediente o utilice las sugerencias de LEXIS.
      </p>

      {ultimoResultado && (
        <div className="px-3 pt-2">
          <ZodResultadoOverlay resultado={ultimoResultado} onClose={() => setUltimoResultado(null)} />
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        {huerfanos.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">Sin documentos pendientes</p>
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

      {huerfanos.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{huerfanos.filter(h => h.sugerencias.length > 0).length} con sugerencias</span>
            <span>{huerfanos.filter(h => h.sugerencias.some(s => s.confianzaAsociacion >= 70)).length} alta confianza</span>
          </div>
        </div>
      )}
    </Card>
  );
}
