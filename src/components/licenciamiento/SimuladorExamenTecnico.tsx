// ============================================
// Simulador de Examen Técnico — Fase 5
// 50 preguntas aleatorias: Clasificación, Valoración, Normativa ANA
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, CheckCircle2, XCircle, ChevronLeft, ChevronRight, BarChart3, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  generarExamenAleatorio,
  evaluarExamen,
  type PreguntaExamen,
} from '@/lib/licenciamiento/MotorLicenciamientoACA';

const CATEGORIA_LABELS: Record<string, { label: string; color: string }> = {
  clasificacion: { label: 'Clasificación', color: 'text-primary border-primary/30 bg-primary/10' },
  valoracion: { label: 'Valoración', color: 'text-warning border-warning/30 bg-warning/10' },
  normativa: { label: 'Normativa ANA', color: 'text-success border-success/30 bg-success/10' },
};

export const SimuladorExamenTecnico: React.FC = () => {
  const [preguntas, setPreguntas] = useState<PreguntaExamen[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [examenIniciado, setExamenIniciado] = useState(false);
  const [examenFinalizado, setExamenFinalizado] = useState(false);

  const iniciarExamen = useCallback(() => {
    const nuevasPreguntas = generarExamenAleatorio(50);
    setPreguntas(nuevasPreguntas);
    setRespuestas({});
    setPreguntaActual(0);
    setExamenIniciado(true);
    setExamenFinalizado(false);
  }, []);

  const resultado = useMemo(() => {
    if (!examenFinalizado) return null;
    return evaluarExamen(preguntas, respuestas);
  }, [examenFinalizado, preguntas, respuestas]);

  const handleRespuesta = (opcionIdx: number) => {
    if (examenFinalizado) return;
    const pregunta = preguntas[preguntaActual];
    setRespuestas(prev => ({ ...prev, [pregunta.id]: opcionIdx }));
  };

  const respondidas = Object.keys(respuestas).length;
  const progreso = preguntas.length > 0 ? (respondidas / preguntas.length) * 100 : 0;

  // Pre-exam screen
  if (!examenIniciado) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold font-display tracking-wider text-foreground">
                Simulador de Examen Técnico
              </h3>
              <p className="text-xs text-muted-foreground">Fase 5 · SOP-ACA-001</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Este simulador genera <strong className="text-foreground">50 preguntas aleatorias</strong> distribuidas equitativamente entre:
          </p>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CATEGORIA_LABELS).map(([key, val]) => (
              <div key={key} className={cn('p-3 rounded-lg border text-center', val.color)}>
                <p className="text-sm font-semibold">{val.label}</p>
                <p className="text-xs mt-1 opacity-70">~17 preguntas</p>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Nota mínima de aprobación: <strong className="text-foreground">70%</strong></p>
            <p>• Basado en el Decreto Ley 1 de 2008, Resolución 222/2025 y el SA de la OMA</p>
            <p>• Cada intento genera un set único de preguntas</p>
          </div>
          <Button onClick={iniciarExamen} className="w-full btn-primary gap-2">
            <BookOpen className="w-4 h-4" />
            Iniciar Examen Técnico
          </Button>
        </div>
      </div>
    );
  }

  // Results screen
  if (examenFinalizado && resultado) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg border flex items-center justify-center',
              resultado.aprobado ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
            )}>
              {resultado.aprobado ? (
                <Award className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold font-display tracking-wider text-foreground">
                Resultado del Examen
              </h3>
              <p className="text-xs text-muted-foreground">
                {resultado.aprobado ? 'APROBADO' : 'NO APROBADO'} — {resultado.porcentaje.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score */}
          <div className="text-center">
            <div className={cn(
              'text-6xl font-bold font-display',
              resultado.aprobado ? 'text-success' : 'text-destructive'
            )}>
              {resultado.porcentaje.toFixed(0)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {resultado.correctas} de {resultado.total} correctas
            </p>
          </div>

          {/* By category */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Desglose por Categoría
            </h4>
            {Object.entries(resultado.porCategoria).map(([cat, val]) => {
              const catInfo = CATEGORIA_LABELS[cat];
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{catInfo?.label || cat}</span>
                    <span className={cn(
                      'font-mono font-bold',
                      val.porcentaje >= 70 ? 'text-success' : 'text-destructive'
                    )}>
                      {val.correctas}/{val.total} ({val.porcentaje.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={val.porcentaje} className="h-2" />
                </div>
              );
            })}
          </div>

          <Button onClick={iniciarExamen} variant="outline" className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Intentar Nuevo Examen
          </Button>
        </div>
      </div>
    );
  }

  // Exam in progress
  const pregunta = preguntas[preguntaActual];
  if (!pregunta) return null;
  const catInfo = CATEGORIA_LABELS[pregunta.categoria];
  const respuestaSeleccionada = respuestas[pregunta.id];

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Pregunta {preguntaActual + 1} de {preguntas.length}
            </span>
          </div>
          <Badge variant="outline" className={cn('text-[10px]', catInfo?.color)}>
            {catInfo?.label}
          </Badge>
        </div>
        <Progress value={progreso} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">{respondidas} de {preguntas.length} respondidas</p>
      </div>

      {/* Question */}
      <div className="p-6">
        <p className="text-sm font-medium text-foreground leading-relaxed mb-4">
          {pregunta.pregunta}
        </p>

        <div className="space-y-2">
          {pregunta.opciones.map((opcion, idx) => (
            <button
              key={idx}
              onClick={() => handleRespuesta(idx)}
              className={cn(
                'w-full text-left p-3 rounded-lg border text-sm transition-all duration-200',
                respuestaSeleccionada === idx
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="font-mono text-xs text-primary mr-2">
                {String.fromCharCode(65 + idx)}.
              </span>
              {opcion}
            </button>
          ))}
        </div>

        {pregunta.fundamentoLegal && (
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Fundamento: {pregunta.fundamentoLegal}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreguntaActual(Math.max(0, preguntaActual - 1))}
          disabled={preguntaActual === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {preguntaActual < preguntas.length - 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreguntaActual(preguntaActual + 1)}
            className="gap-1"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => setExamenFinalizado(true)}
            disabled={respondidas < preguntas.length}
            className="btn-primary gap-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizar Examen ({respondidas}/{preguntas.length})
          </Button>
        )}
      </div>
    </div>
  );
};
