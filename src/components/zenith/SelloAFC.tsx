/**
 * SELLO DE FACILITACIÓN AFC-OMC
 * Distintivo visual que indica procesamiento bajo estándares del
 * Acuerdo de Facilitación del Comercio de la OMC.
 */

import { Shield, CheckCircle2, Globe, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipTrigger
} from '@/components/ui/tooltip';

interface SelloAFCProps {
  activo: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function SelloAFC({ activo, size = 'md', showTooltip = true }: SelloAFCProps) {
  if (!activo) return null;

  const sizeClasses = {
    sm: 'text-[9px] gap-1 px-1.5 py-0.5',
    md: 'text-[10px] gap-1.5 px-2 py-1',
    lg: 'text-xs gap-2 px-3 py-1.5',
  };

  const iconSize = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  const sello = (
    <Badge
      variant="outline"
      className={`${sizeClasses[size]} border-primary/40 bg-primary/10 text-stella font-semibold tracking-wide animate-fade-in`}
    >
      <Globe className={iconSize[size]} />
      AFC-OMC
      <CheckCircle2 className={iconSize[size]} />
    </Badge>
  );

  if (!showTooltip) return sello;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{sello}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <div className="space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-stella" />
            Procesado bajo estándares AFC-OMC
          </p>
          <p className="text-muted-foreground">
            Este expediente cumple con los protocolos del Acuerdo sobre Facilitación
            del Comercio de la Organización Mundial del Comercio, ratificado por Panamá
            mediante Ley 26 de 2016.
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="outline" className="text-[8px] border-primary/20">Art. 7.1 Pre-Arribo</Badge>
            <Badge variant="outline" className="text-[8px] border-primary/20">Art. 7.9 Perecederos</Badge>
            <Badge variant="outline" className="text-[8px] border-primary/20">Art. 3 Resoluciones</Badge>
            <Badge variant="outline" className="text-[8px] border-primary/20">Art. 10.4 Ventanilla Única</Badge>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Larger banner version for display in dashboards
 */
export function BannerAFC({ activo }: { activo: boolean }) {
  if (!activo) return null;

  return (
    <div className="glass-panel-stella p-3 flex items-center gap-3 animate-fade-in">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Globe className="w-5 h-5 text-stella" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold font-display text-stella tracking-wide">
            Procesado bajo estándares AFC-OMC
          </span>
          <CheckCircle2 className="w-4 h-4 text-success" />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Ley 26 de 2016 — Acuerdo sobre Facilitación del Comercio (OMC) · Pre-Arribo · Perecederos · Resoluciones Anticipadas
        </p>
      </div>
      <Shield className="w-5 h-5 text-primary/30 flex-shrink-0" />
    </div>
  );
}
