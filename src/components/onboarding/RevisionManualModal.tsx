// ============================================
// Modal de Revisión Manual Obligatoria
// Human-in-the-Loop cuando IA < 95%
// ============================================

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Sparkles, Eye } from 'lucide-react';

interface CampoCritico {
  campo: string;
  valorExtraido: string;
  confianza: number;
}

interface RevisionManualModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: (correcciones: Record<string, string>) => void;
  documentoNombre: string;
  camposCriticos: CampoCritico[];
}

export const RevisionManualModal: React.FC<RevisionManualModalProps> = ({
  open,
  onClose,
  onApprove,
  documentoNombre,
  camposCriticos,
}) => {
  const [correcciones, setCorrecciones] = useState<Record<string, string>>({});

  const handleCorrection = (campo: string, valor: string) => {
    setCorrecciones(prev => ({ ...prev, [campo]: valor }));
  };

  const handleApprove = () => {
    onApprove(correcciones);
    setCorrecciones({});
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg bg-card border-warning/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            Revisión Manual Obligatoria
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-stella" />
              Stella detectó campos con confianza &lt; 95% en
            </span>
            <span className="font-medium text-foreground ml-1">{documentoNombre}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="glass-panel-zod p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-zod" />
              <span className="text-xs font-semibold text-zod-light">
                Veredicto de Zod: Validación requiere supervisión humana
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Los siguientes campos críticos no alcanzaron el umbral de confianza del 95%.
              El AI Quality Lead debe verificar y corregir antes de continuar.
            </p>
          </div>

          {camposCriticos.map((campo) => (
            <div key={campo.campo} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{campo.campo}</Label>
                <Badge
                  variant={campo.confianza < 80 ? 'destructive' : 'secondary'}
                  className="text-[10px]"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  IA: {campo.confianza.toFixed(0)}%
                </Badge>
              </div>
              <Input
                defaultValue={campo.valorExtraido}
                onChange={(e) => handleCorrection(campo.campo, e.target.value)}
                className="border-warning/30 focus:border-warning"
                placeholder={`Valor extraído: ${campo.valorExtraido}`}
              />
              <p className="text-[10px] text-muted-foreground">
                Valor detectado por IA — verifique y corrija si es necesario
              </p>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <Shield className="w-4 h-4 mr-1" />
            Aprobar con Correcciones
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
