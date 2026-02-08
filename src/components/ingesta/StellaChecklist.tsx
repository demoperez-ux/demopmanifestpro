/**
 * STELLA CHECKLIST — ZENITH
 * Professional compliance checklist panel.
 */

import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle,
  Mail, ShieldCheck, ShieldAlert, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      resultado.consistente ? 'panel-stella' : 'panel-zod'
    )}>
      <button className="w-full flex items-center justify-between" onClick={() => setExpandido(!expandido)}>
        <div className="flex items-center gap-2">
          {resultado.consistente ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-warning" />
          )}
          <span className="text-xs font-semibold text-foreground">Verificación de Integridad</span>
          <Badge variant={resultado.consistente ? 'secondary' : 'destructive'} className="text-[10px]">
            {resultado.score}%
          </Badge>
        </div>
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
                    'p-2 rounded-md text-xs space-y-1 border',
                    disc.severidad === 'critica' && 'bg-destructive-light border-destructive/20',
                    disc.severidad === 'media' && 'bg-warning-light border-warning/20',
                    disc.severidad === 'baja' && 'bg-muted border-border',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{disc.campo}</span>
                    <Badge variant={disc.severidad === 'critica' ? 'destructive' : 'outline'} className="text-[9px]">
                      {disc.severidad}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      <span className="text-[10px] block text-muted-foreground/70">Factura</span>
                      <span className="font-mono text-xs">{disc.valorFactura}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-muted-foreground/70">B/L</span>
                      <span className="font-mono text-xs">{disc.valorBL}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{disc.descripcion}</p>
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
  const todosFaltantes = [...expediente.documentosFaltantes, ...expediente.permisosFaltantes];

  const handleSolicitarCliente = async () => {
    setGenerandoCorreo(true);
    const asunto = `Documentación faltante — Expediente ${expediente.referencia}`;
    const cuerpo = `Estimado cliente,\n\nEn relación al expediente ${expediente.referencia}, se requiere la siguiente documentación:\n\n${todosFaltantes.map((doc, i) => `  ${i + 1}. ${doc}`).join('\n')}\n\nSaludos cordiales,\nDepartamento de Operaciones`;
    try {
      await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${cuerpo}`);
      toast.success('Solicitud copiada al portapapeles', { duration: 5000 });
    } catch {
      toast.info('Solicitud generada');
    }
    onSolicitarCliente(expediente.id, todosFaltantes);
    setGenerandoCorreo(false);
  };

  const completitud = todosRequeridos.length > 0
    ? Math.round(((todosRequeridos.length - todosFaltantes.length) / todosRequeridos.length) * 100)
    : 0;

  return (
    <Card className={cn('flex flex-col h-full max-h-[600px]', className)}>
      <CardHeader className="p-4 pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Checklist de Cumplimiento</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      {/* Expediente Info */}
      <div className="px-4 py-3 bg-muted/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Expediente</span>
          <Badge variant="outline" className="text-[10px] font-mono">{expediente.referencia}</Badge>
        </div>
        <p className="text-sm font-medium text-foreground truncate">{expediente.importador}</p>
        {expediente.hsCodePreliminar && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground">HS Preliminar:</span>
            <span className="text-xs font-mono text-primary">{expediente.hsCodePreliminar}</span>
          </div>
        )}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Completitud documental</span>
            <span className={cn(
              'font-semibold',
              completitud >= 80 ? 'text-success' : completitud >= 50 ? 'text-warning' : 'text-destructive'
            )}>{completitud}%</span>
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

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
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
                  esFaltante && !esRecomendado && 'bg-destructive-light',
                  !esFaltante && 'bg-success-light',
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
                )}>{doc}</span>
                {esFaltante && !esRecomendado && (
                  <Badge variant="destructive" className="text-[9px]">Faltante</Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {expediente.consistenciaCruzada && (
        <div className="px-4 py-3">
          <ZodCrossCheckPanel resultado={expediente.consistenciaCruzada} />
        </div>
      )}

      <div className="p-4 border-t border-border space-y-2">
        {todosFaltantes.length > 0 && (
          <Button className="w-full gap-2" onClick={handleSolicitarCliente} disabled={generandoCorreo}>
            <Mail className="w-4 h-4" />
            {generandoCorreo ? 'Generando...' : 'Solicitar al Cliente'}
          </Button>
        )}
        {expediente.listoParaZod && (
          <Button variant="outline" className="w-full gap-2">
            <ShieldCheck className="w-4 h-4" />
            Enviar a Validación
          </Button>
        )}
      </div>
    </Card>
  );
}
