/**
 * ZOD INTEGRITY ENGINE - Modal de Bloqueo de Seguridad
 * "La integridad de los datos no es negociable"
 */

import { Shield, AlertTriangle, Lock, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ZodVerdict {
  bloqueado: boolean;
  tipo: 'peso' | 'honorarios' | 'cumplimiento' | 'subvaluacion' | 'vehiculo' | 'general' | 'gs1';
  titulo: string;
  descripcion: string;
  detalles?: string[];
  accionRequerida?: string;
  hashVerificacion?: string;
}

interface Props {
  verdict: ZodVerdict | null;
  open: boolean;
  onClose: () => void;
  onOverride?: () => void;
}

export function ZodIntegrityModal({ verdict, open, onClose, onOverride }: Props) {
  if (!verdict) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-panel-zod border-warning/30">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-center zod-pulse">
              <Shield className="w-6 h-6 text-zod" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 font-display text-zod tracking-wide">
                <Lock className="w-4 h-4" />
                Veredicto de Zod
              </DialogTitle>
              <DialogDescription className="text-warning/80">
                Operación detenida — Motor de Integridad
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Severity indicator */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-zod" />
            <Badge variant="outline" className="border-warning/40 text-zod text-xs uppercase tracking-wider">
              {verdict.tipo}
            </Badge>
            {verdict.bloqueado && (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                BLOQUEADO
              </Badge>
            )}
          </div>

          {/* Main message */}
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <h4 className="font-display font-semibold text-foreground mb-1">
              {verdict.titulo}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {verdict.descripcion}
            </p>
          </div>

          {/* Details */}
          {verdict.detalles && verdict.detalles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Discrepancias detectadas
              </p>
              {verdict.detalles.map((detalle, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-foreground/80 p-2 rounded bg-muted/30">
                  <span className="text-zod">•</span>
                  <span>{detalle}</span>
                </div>
              ))}
            </div>
          )}

          {/* Required action */}
          {verdict.accionRequerida && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground font-medium mb-1">Acción requerida:</p>
              <p className="text-sm text-stella">{verdict.accionRequerida}</p>
            </div>
          )}

          {/* Hash verification */}
          {verdict.hashVerificacion && (
            <div className="p-2 rounded bg-muted/30 border border-border">
              <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
                Sello de Inexpugnabilidad: {verdict.hashVerificacion.substring(0, 32)}...
              </p>
            </div>
          )}

          {/* Zenith tagline */}
          <p className="text-center text-xs text-muted-foreground/60 italic">
            "Blindaje Legal — La integridad de los datos no es negociable." — Zod Integrity Engine
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {onOverride && !verdict.bloqueado && (
            <Button
              variant="outline"
              size="sm"
              className="border-warning/30 text-warning hover:bg-warning/10"
              onClick={onOverride}
            >
              Continuar bajo responsabilidad
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={onClose}
            className="bg-warning/10 text-zod border border-warning/30 hover:bg-warning/20"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}