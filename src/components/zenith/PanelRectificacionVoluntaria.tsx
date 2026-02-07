/**
 * PANEL DE RECTIFICACIÓN VOLUNTARIA — ZENITH
 * Guía asistida por Stella para correcciones post-levante
 * Evita sanciones graves de la ANA
 */

import { useState } from 'react';
import { Sparkles, FileText, AlertTriangle, CheckCircle2, ArrowRight, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export interface ErrorPostLevante {
  id: string;
  tipo: 'valor_cif' | 'clasificacion_hts' | 'peso' | 'descripcion' | 'consignatario' | 'otro';
  descripcion: string;
  valorOriginal: string;
  valorCorregido?: string;
  guia: string;
  mawb: string;
  fechaDeteccion: string;
}

interface Props {
  errores?: ErrorPostLevante[];
  onRectificar?: (errores: ErrorPostLevante[]) => void;
}

const PASOS_RECTIFICACION = [
  {
    numero: 1,
    titulo: 'Identificar el Error',
    stellaMensaje: 'Jefe, he detectado una discrepancia post-levante. Es importante corregirla voluntariamente antes de que la ANA inicie un procedimiento. La rectificación voluntaria reduce sanciones hasta en un 75%.',
    detalle: 'Documente el error encontrado con evidencia de soporte (factura original, B/L, etc.)',
  },
  {
    numero: 2,
    titulo: 'Preparar Documentación',
    stellaMensaje: 'Necesitamos preparar: (1) Nota de rectificación dirigida a la ANA, (2) Copia de la declaración original, (3) Documentos de soporte que justifiquen la corrección, (4) Cálculo de diferencia de tributos si aplica.',
    detalle: 'La documentación debe presentarse en formato SIGA con los códigos de enmienda correctos',
  },
  {
    numero: 3,
    titulo: 'Calcular Diferencial',
    stellaMensaje: 'Si la rectificación implica mayor tributación, el diferencial debe pagarse junto con la solicitud. Zod calculará automáticamente la diferencia con recargos aplicables según la fecha del levante original.',
    detalle: 'Tributos adicionales + Recargo administrativo (si aplica) + Intereses moratorios',
  },
  {
    numero: 4,
    titulo: 'Presentar ante ANA',
    stellaMensaje: 'La solicitud se presenta en la ventanilla de la Administración Regional de Aduanas correspondiente. El plazo máximo para rectificación voluntaria es de 4 años desde la fecha de la declaración original.',
    detalle: 'Conserve el acuse de recibo como evidencia de buena fe ante posibles auditorías',
  },
];

export function PanelRectificacionVoluntaria({ errores = [], onRectificar }: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const [correccion, setCorreccion] = useState('');
  const [justificacion, setJustificacion] = useState('');

  const paso = PASOS_RECTIFICACION[pasoActual];

  const handleSiguiente = () => {
    if (pasoActual < PASOS_RECTIFICACION.length - 1) {
      setPasoActual(prev => prev + 1);
    } else {
      toast({
        title: 'Rectificación Preparada',
        description: 'Los documentos están listos para presentar ante la ANA.',
      });
      onRectificar?.(errores);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-zod/5 border-b border-zod/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zod/10 border border-zod/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-zod" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              Rectificación Voluntaria
              <Badge variant="outline" className="border-zod/30 text-zod text-[10px]">
                ANA
              </Badge>
            </CardTitle>
            <CardDescription>Guía asistida para correcciones post-levante</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Errores detectados */}
        {errores.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Errores Detectados</p>
            {errores.map(error => (
              <div key={error.id} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{error.descripcion}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Guía: {error.guia}</span>
                    <span className="text-xs text-muted-foreground">Tipo: {error.tipo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1">
          {PASOS_RECTIFICACION.map((p, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < pasoActual ? 'bg-success text-success-foreground' :
                i === pasoActual ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < pasoActual ? <CheckCircle2 className="w-4 h-4" /> : p.numero}
              </div>
              {i < PASOS_RECTIFICACION.length - 1 && (
                <div className={`w-12 h-0.5 ${i < pasoActual ? 'bg-success' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Step */}
        {paso && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg text-foreground">
              Paso {paso.numero}: {paso.titulo}
            </h3>

            {/* Stella Message */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80 italic leading-relaxed">{paso.stellaMensaje}</p>
            </div>

            <p className="text-sm text-muted-foreground">{paso.detalle}</p>

            {/* Forms for specific steps */}
            {pasoActual === 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-foreground">Descripción del error</Label>
                  <Textarea
                    placeholder="Describa el error detectado..."
                    value={correccion}
                    onChange={(e) => setCorreccion(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {pasoActual === 1 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-foreground">Justificación de la corrección</Label>
                  <Textarea
                    placeholder="Justifique la rectificación (requerido por la ANA)..."
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setPasoActual(prev => Math.max(0, prev - 1))}
            disabled={pasoActual === 0}
          >
            Anterior
          </Button>
          <Button onClick={handleSiguiente} className="gap-2">
            {pasoActual === PASOS_RECTIFICACION.length - 1 ? 'Finalizar' : 'Siguiente'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zod seal */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Shield className="w-3 h-3 text-zod" />
          <p className="text-[10px] text-muted-foreground">
            Registro inmutable respaldado por Zod Integrity Engine
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
