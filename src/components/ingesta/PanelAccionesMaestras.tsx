/**
 * PANEL DE ACCIONES MAESTRAS — ZENITH
 * 
 * Sidebar con botones principales de acción:
 * - Nueva Declaración (flujo manual)
 * - Carga Masiva (manifiestos Excel)
 * - Biblioteca Normativa (aranceles y SOPs)
 */

import { Link } from 'react-router-dom';
import {
  FilePlus, Upload, BookOpen, Sparkles, Shield,
  FileSpreadsheet, Search, Award, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PanelAccionesMaestrasProps {
  onNuevaDeclaracion: () => void;
  onCargaMasiva: () => void;
  className?: string;
}

const ACCIONES = [
  {
    id: 'nueva-declaracion',
    label: 'Nueva Declaración',
    descripcion: 'Captura manual de datos aduaneros',
    icon: FilePlus,
    variant: 'default' as const,
    glow: true,
  },
  {
    id: 'carga-masiva',
    label: 'Carga Masiva',
    descripcion: 'Sube manifiestos en Excel',
    icon: Upload,
    variant: 'outline' as const,
    glow: false,
  },
];

const ACCESOS_RAPIDOS = [
  { label: 'Buscador Aranceles', to: '/aranceles', icon: Search },
  { label: 'Consultas Clasificatorias', to: '/consultas-clasificatorias', icon: BookOpen },
  { label: 'Licenciamiento ACA', to: '/licenciamiento-aca', icon: Award },
  { label: 'Zenith Pulse', to: '/zenith-pulse', icon: Scale },
];

export function PanelAccionesMaestras({
  onNuevaDeclaracion,
  onCargaMasiva,
  className,
}: PanelAccionesMaestrasProps) {
  return (
    <aside className={cn('space-y-6', className)}>
      {/* Acciones Principales */}
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-zod" />
          <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Acciones
          </h3>
        </div>

        {ACCIONES.map((accion) => {
          const Icon = accion.icon;
          const handler = accion.id === 'nueva-declaracion' ? onNuevaDeclaracion : onCargaMasiva;
          return (
            <Button
              key={accion.id}
              variant={accion.variant}
              className={cn(
                'w-full justify-start gap-3 h-auto py-3 px-4',
                accion.glow && 'zenith-border-glow'
              )}
              onClick={handler}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-medium">{accion.label}</span>
                <span className="block text-[11px] text-muted-foreground">{accion.descripcion}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Biblioteca Normativa */}
      <div className="card-elevated p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-stella" />
          <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Biblioteca Normativa
          </h3>
        </div>

        {ACCESOS_RAPIDOS.map((acceso) => {
          const Icon = acceso.icon;
          return (
            <Link key={acceso.to} to={acceso.to}>
              <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm" size="sm">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {acceso.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Indicador Stella */}
      <div className="glass-panel-stella p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-stella stella-pulse" />
          <span className="text-xs font-medium text-stella-light">Stella Activa</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Al cargar documentos, Stella ejecutará pre-clasificación automática, OCR
          y validación con el motor Zod antes de la captura.
        </p>
      </div>
    </aside>
  );
}
