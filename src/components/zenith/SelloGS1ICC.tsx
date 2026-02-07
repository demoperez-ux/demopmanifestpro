/**
 * SELLO DE CALIDAD INTERNACIONAL GS1/ICC — ZENITH
 * Badge de cumplimiento con estándares internacionales
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Globe, Shield, Barcode } from 'lucide-react';

interface SelloGS1ICCProps {
  tieneGTIN?: boolean;
  tieneGLN?: boolean;
  incotermUsado?: string;
  compact?: boolean;
}

export function SelloGS1ICC({ tieneGTIN, tieneGLN, incotermUsado, compact = false }: SelloGS1ICCProps) {
  const cumpleGS1 = tieneGTIN || tieneGLN;
  const cumpleICC = !!incotermUsado;

  if (!cumpleGS1 && !cumpleICC) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {cumpleGS1 && (
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-1.5 py-0">
            <Barcode className="w-2.5 h-2.5 mr-0.5" />
            GS1
          </Badge>
        )}
        {cumpleICC && (
          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/5 px-1.5 py-0">
            <Globe className="w-2.5 h-2.5 mr-0.5" />
            ICC
          </Badge>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {cumpleGS1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 cursor-help">
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">GS1 Compliant</span>
                <Shield className="w-3 h-3 text-emerald-500/60" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-xs">Estándar GS1 — Identificación Global</p>
                <p className="text-xs text-muted-foreground">
                  {tieneGTIN && 'GTIN verificado (checksum válido). '}
                  {tieneGLN && 'GLN de recinto mapeado. '}
                  Cumple con GS1 General Specifications v24.0 para trazabilidad internacional de mercancías.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {cumpleICC && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 cursor-help">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">
                  Incoterms® 2020 — {incotermUsado}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-xs">Incoterms® 2020 — Cámara de Comercio Internacional (ICC)</p>
                <p className="text-xs text-muted-foreground">
                  Valor CIF calculado según regla {incotermUsado} de Incoterms® 2020.
                  El cálculo de valoración aduanera cumple con el Acuerdo de Valoración de la OMC (Art. 1-8).
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Generates GS1/ICC compliance data for Excel/PDF export headers
 */
export function generarDatosExportGS1ICC(params: {
  totalGTIN: number;
  totalGLN: number;
  incoterm?: string;
  gtinValidos: number;
  glnValidos: number;
}): Record<string, string> {
  const datos: Record<string, string> = {};

  if (params.totalGTIN > 0) {
    datos['Estándar GS1'] = 'GTIN Validado';
    datos['GTIN Procesados'] = `${params.gtinValidos}/${params.totalGTIN} válidos`;
  }

  if (params.totalGLN > 0) {
    datos['GLN Verificados'] = `${params.glnValidos}/${params.totalGLN} mapeados`;
  }

  if (params.incoterm) {
    datos['Incoterms® 2020 (ICC)'] = params.incoterm;
    datos['Base Valoración'] = `CIF calculado según ${params.incoterm}`;
  }

  datos['Certificación'] = 'Procesado bajo estándares GS1/ICC — ZENITH Customs Platform';

  return datos;
}
