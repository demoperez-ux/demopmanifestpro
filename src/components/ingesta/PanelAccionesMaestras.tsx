/**
 * PANEL DE ACCIONES MAESTRAS — ZENITH
 * Clean enterprise action panel.
 */

import { Link } from 'react-router-dom';
import { FilePlus, Upload, BookOpen, Search, Award, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PanelAccionesMaestrasProps {
  onNuevaDeclaracion: () => void;
  onCargaMasiva: () => void;
  className?: string;
}

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
    <aside className={cn('space-y-4', className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Acciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start gap-3" onClick={onNuevaDeclaracion}>
            <FilePlus className="w-4 h-4" />
            Nueva Declaración
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={onCargaMasiva}>
            <Upload className="w-4 h-4" />
            Carga Masiva
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Biblioteca Normativa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
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
        </CardContent>
      </Card>

      <Card className="panel-stella">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground mb-1">Notificación de Cumplimiento</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Al cargar documentos, el sistema ejecutará clasificación automática
            y validación de integridad antes de la captura.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
