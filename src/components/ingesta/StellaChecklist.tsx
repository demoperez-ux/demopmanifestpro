/**
 * STELLA CHECKLIST — Missing Docs Panel
 * 
 * Panel lateral que lista documentos faltantes obligatorios
 * según la partida arancelaria detectada por el Sniffer.
 * Incluye botón "Solicitar al Cliente" para generar correo automático.
 */

import { useState } from 'react';
import {
  Sparkles, CheckCircle2, XCircle, AlertTriangle,
  Mail, Copy, ChevronDown, ChevronUp, FileText,
  ShieldCheck, ShieldAlert, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  type ExpedienteExterno,
  type ResultadoConsistenciaCruzada,
  obtenerDocumentosRequeridos,
} from '@/lib/sniffer/DocumentSniffer';

interface StellaChecklistProps {
  expediente: ExpedienteExterno | null;
  onClose: () => void;
  onSolicitarCliente: (expedienteId: string, documentosFaltantes: string[]) => void;
  className?: string;
}

function ZodCrossCheckPanel({ resultado }: { resultado: ResultadoConsistenciaCruzada }) {
  const [expandido, setExpandido] = useState(true);

  return (
    <div className={cn(
      'rounded-lg p-3 space-y-2',
      resultado.consistente ? 'glass-panel-stella' : 'glass-panel-zod'
    )}>
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center gap-2">
          {resultado.consistente ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-warning" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Zod Cross-Check
          </span>
          <Badge variant={resultado.consistente ? 'secondary' : 'destructive'} className="text-[10px]">
            {resultado.score}%
          </Badge>
        </div>
        {expandido ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {expandido && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground">{resultado.dictamen}</p>

          {resultado.discrepancias.length > 0 && (
            <div className="space-y-1.5">
              {resultado.discrepancias.map((disc, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded-md text-xs space-y-1',
                    disc.severidad === 'critica' && 'bg-destructive/10 border border-destructive/20',
                    disc.severidad === 'media' && 'bg-warning/10 border border-warning/20',
                    disc.severidad === 'baja' && 'bg-muted border border-border',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{disc.campo}</span>
                    <Badge
                      variant={disc.severidad === 'critica' ? 'destructive' : 'outline'}
                      className="text-[9px]"
                    >
                      {disc.severidad}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      <span className="text-[10px] block text-muted-foreground/70">Factura</span>
                      <span className="font-mono">{disc.valorFactura}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-muted-foreground/70">B/L</span>
                      <span className="font-mono">{disc.valorBL}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground/80">{disc.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StellaChecklist({
  expediente,
  onClose,
  onSolicitarCliente,
  className,
}: StellaChecklistProps) {
  const [generandoCorreo, setGenerandoCorreo] = useState(false);

  if (!expediente) return null;

  const todosRequeridos = obtenerDocumentosRequeridos(expediente.hsCodePreliminar);
  const tiposPresentes = new Set(expediente.documentos.map(d => d.tipoDetectado));
  const todosFaltantes = [...expediente.documentosFaltantes, ...expediente.permisosFaltantes];

  const handleSolicitarCliente = async () => {
    setGenerandoCorreo(true);

    // Generar contenido del correo
    const asunto = `Documentación faltante — Expediente ${expediente.referencia}`;
    const cuerpo = generarCuerpoCorreo(expediente, todosFaltantes);

    // Copiar al portapapeles
    try {
      await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${cuerpo}`);
      toast.success('Stella: Correo copiado al portapapeles', {
        description: 'Pegue el contenido en su cliente de correo para enviar.',
        duration: 5000,
        icon: '✉️',
      });
    } catch {
      toast.info('Stella: Correo generado', {
        description: 'Use el botón de copiar para obtener el texto.',
      });
    }

    onSolicitarCliente(expediente.id, todosFaltantes);
    setGenerandoCorreo(false);
  };

  const completitud = todosRequeridos.length > 0
    ? Math.round(((todosRequeridos.length - todosFaltantes.length) / todosRequeridos.length) * 100)
    : 0;

  return (
    <div className={cn(
      'card-elevated flex flex-col h-full max-h-[600px]',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-bold text-foreground">Stella Checklist</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Expediente Info */}
      <div className="px-4 py-3 bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Expediente</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {expediente.referencia}
          </Badge>
        </div>
        <p className="text-sm font-medium text-foreground truncate">{expediente.importador}</p>
        {expediente.hsCodePreliminar && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground">HS Preliminar:</span>
            <span className="text-xs font-mono text-primary">{expediente.hsCodePreliminar}</span>
          </div>
        )}

        {/* Barra de completitud */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Completitud documental</span>
            <span className={cn(
              'font-semibold',
              completitud >= 80 ? 'text-success' : completitud >= 50 ? 'text-warning' : 'text-destructive'
            )}>
              {completitud}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completitud >= 80 ? 'bg-success' : completitud >= 50 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${completitud}%` }}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Lista de documentos */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Documentos Requeridos
          </p>

          {todosRequeridos.map((doc, i) => {
            const esFaltante = todosFaltantes.some(f =>
              f.toLowerCase().includes(doc.toLowerCase().split(' ')[0]) ||
              doc.toLowerCase().includes(f.toLowerCase().split(' ')[0])
            );
            const esRecomendado = doc.includes('recomendado') || doc.includes('si aplica');

            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors',
                  esFaltante && !esRecomendado && 'bg-destructive/5',
                  !esFaltante && 'bg-success/5',
                  esRecomendado && esFaltante && 'bg-muted/50',
                )}
              >
                {esFaltante ? (
                  esRecomendado ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  )
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                )}
                <span className={cn(
                  'flex-1',
                  esFaltante && !esRecomendado ? 'text-foreground font-medium' : 'text-muted-foreground',
                  !esFaltante && 'line-through'
                )}>
                  {doc}
                </span>
                {esFaltante && !esRecomendado && (
                  <Badge variant="destructive" className="text-[9px]">Faltante</Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {/* Zod Cross-Check (si existe) */}
      {expediente.consistenciaCruzada && (
        <div className="px-4 py-3">
          <ZodCrossCheckPanel resultado={expediente.consistenciaCruzada} />
        </div>
      )}

      {/* Acciones */}
      <div className="p-4 border-t border-border space-y-2">
        {todosFaltantes.length > 0 && (
          <Button
            className="w-full gap-2 btn-primary"
            onClick={handleSolicitarCliente}
            disabled={generandoCorreo}
          >
            <Mail className="w-4 h-4" />
            {generandoCorreo ? 'Generando...' : 'Solicitar al Cliente'}
          </Button>
        )}

        {expediente.listoParaZod && (
          <Button variant="outline" className="w-full gap-2">
            <ShieldCheck className="w-4 h-4" />
            Enviar a Validación Zod
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Generador de correo ────────────────────────────────────────

function generarCuerpoCorreo(
  expediente: ExpedienteExterno,
  faltantes: string[]
): string {
  return `Estimado cliente,

Le escribo en relación al expediente de importación ref. ${expediente.referencia}.

Tras la revisión documental realizada por nuestro sistema ZENITH, hemos identificado que los siguientes documentos son necesarios para completar el trámite aduanal:

${faltantes.map((doc, i) => `  ${i + 1}. ${doc}`).join('\n')}

Le solicitamos amablemente enviar la documentación faltante a la brevedad posible para evitar demoras en el despacho de su mercancía.

${expediente.hsCodePreliminar ? `Partida arancelaria preliminar detectada: ${expediente.hsCodePreliminar}` : ''}

Quedamos atentos a su pronta respuesta.

Saludos cordiales,
Departamento de Operaciones Aduaneras
---
Generado automáticamente por Stella — ZENITH AI Platform
Fecha: ${new Date().toLocaleDateString('es-PA', { dateStyle: 'long' })}`;
}
