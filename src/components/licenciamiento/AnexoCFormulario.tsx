// ============================================
// Anexo C — Declaración de Integridad (Formulario Interactivo)
// ============================================

import React, { useState } from 'react';
import { Shield, CheckCircle2, Fingerprint, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  DECLARACIONES_INTEGRIDAD, 
  firmarAnexoC, 
  type AnexoCDeclaracion 
} from '@/lib/licenciamiento/MotorLicenciamientoACA';
import { useToast } from '@/hooks/use-toast';

interface AnexoCFormularioProps {
  procesoId: string;
  corredorNombre: string;
  corredorCedula: string;
  onFirmado: (hash: string) => void;
  firmado?: boolean;
  hashExistente?: string;
}

export const AnexoCFormulario: React.FC<AnexoCFormularioProps> = ({
  procesoId,
  corredorNombre,
  corredorCedula,
  onFirmado,
  firmado = false,
  hashExistente,
}) => {
  const { toast } = useToast();
  const [aceptadas, setAceptadas] = useState<Record<string, boolean>>({});
  const [firmando, setFirmando] = useState(false);
  const [firmaHash, setFirmaHash] = useState<string | undefined>(hashExistente);

  const todasAceptadas = DECLARACIONES_INTEGRIDAD.every(d => aceptadas[d.id]);

  const handleToggle = (id: string) => {
    if (firmado) return;
    setAceptadas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFirmar = async () => {
    if (!todasAceptadas || firmado) return;
    setFirmando(true);

    try {
      const declaracion: AnexoCDeclaracion = {
        procesoId,
        corredorNombre,
        corredorCedula,
        fechaDeclaracion: new Date().toISOString(),
        declaraciones: DECLARACIONES_INTEGRIDAD.map(d => ({
          id: d.id,
          texto: d.texto,
          aceptada: aceptadas[d.id] || false,
        })),
        estado: 'firmada',
      };

      const { hash } = await firmarAnexoC(declaracion);
      setFirmaHash(hash);
      onFirmado(hash);

      toast({
        title: '✅ Anexo C Firmado Digitalmente',
        description: `Hash SHA-256: ${hash.substring(0, 16)}... — Expediente desbloqueado.`,
      });
    } catch (error) {
      toast({
        title: 'Error al firmar',
        description: 'No se pudo generar la firma digital. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setFirmando(false);
    }
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-zod" />
          </div>
          <div>
            <h3 className="text-base font-semibold font-display tracking-wider text-foreground">
              Anexo C — Declaración de Integridad
            </h3>
            <p className="text-xs text-muted-foreground">
              SOP-ACA-001 · Requisito obligatorio para desbloquear expediente
            </p>
          </div>
          {firmado && (
            <Badge className="ml-auto bg-success/20 text-success border border-success/30 text-xs">
              <Fingerprint className="w-3 h-3 mr-1" />
              FIRMADO
            </Badge>
          )}
        </div>
      </div>

      {/* Corredor Info */}
      <div className="px-6 py-3 bg-card border-b border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Declarante:</span>
            <p className="font-medium text-foreground">{corredorNombre}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Cédula:</span>
            <p className="font-medium text-foreground">{corredorCedula}</p>
          </div>
        </div>
      </div>

      {/* Declaraciones */}
      <div className="px-6 py-4 space-y-4">
        {DECLARACIONES_INTEGRIDAD.map((decl, index) => (
          <div
            key={decl.id}
            className={cn(
              'flex gap-3 p-3 rounded-lg border transition-all duration-200',
              aceptadas[decl.id] ? 'border-success/30 bg-success/5' : 'border-border bg-card',
              firmado && 'opacity-80',
            )}
          >
            <Checkbox
              id={decl.id}
              checked={aceptadas[decl.id] || false}
              onCheckedChange={() => handleToggle(decl.id)}
              disabled={firmado}
              className="mt-1 flex-shrink-0"
            />
            <label
              htmlFor={decl.id}
              className={cn(
                'text-sm leading-relaxed cursor-pointer',
                aceptadas[decl.id] ? 'text-foreground' : 'text-muted-foreground',
                firmado && 'cursor-default',
              )}
            >
              <span className="text-xs font-mono text-primary mr-2">{decl.id}</span>
              {decl.texto}
            </label>
          </div>
        ))}
      </div>

      {/* Footer / Action */}
      <div className="px-6 py-4 border-t border-border bg-muted/20">
        {!firmado ? (
          <div className="space-y-3">
            {!todasAceptadas && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Debe aceptar todas las declaraciones para firmar digitalmente.</span>
              </div>
            )}
            <Button
              onClick={handleFirmar}
              disabled={!todasAceptadas || firmando}
              className="w-full btn-primary gap-2"
            >
              {firmando ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generando firma SHA-256...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Firmar Declaración de Integridad
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="glass-panel-zod p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-zod flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zod-light">Sello de Integridad Zod — Anexo C</p>
              <p className="text-xs text-muted-foreground mt-1">
                Declaración firmada digitalmente. Hash: <code className="text-[10px] font-mono text-foreground">{firmaHash?.substring(0, 32)}...</code>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Expediente desbloqueado para avanzar a Fase 5 (Expediente Builder)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
