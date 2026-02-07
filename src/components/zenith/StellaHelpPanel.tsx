/**
 * STELLA HELP - Panel de IA Proactiva
 * Entrenadora de funcionalidades y asistente operativa
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, MessageCircle, CheckCircle2, AlertTriangle,
  FileSpreadsheet, ArrowRight, X, Lightbulb, Heart, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_INFO } from '@/lib/companyConfig';
import { useAuth, AppRole } from '@/contexts/AuthContext';

export interface StellaContext {
  /** Is this a new user / first time on this section? */
  isNewUser?: boolean;
  /** Current processing progress 0-100 */
  processingProgress?: number;
  /** Number of packages loaded */
  totalPaquetes?: number;
  /** Any sanitary alerts (MINSA/MIDA/AUPSA) */
  alertasSanitarias?: StellaAlert[];
  /** Section currently active */
  seccionActiva?: string;
  /** Is the manifest ready to export? */
  listoParaExportar?: boolean;
  /** Are there validation errors? */
  erroresValidacion?: number;
}

export interface StellaAlert {
  tipo: 'MINSA' | 'MIDA' | 'AUPSA' | 'ANA';
  mensaje: string;
  severidad: 'info' | 'warning' | 'critical';
  accion?: string;
}

interface StellaMessage {
  id: string;
  text: string;
  type: 'greeting' | 'proactive' | 'alert' | 'suggestion' | 'celebration';
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface Props {
  context: StellaContext;
  onAction?: (action: string) => void;
  compact?: boolean;
}

export function StellaHelpPanel({ context, onAction, compact = false }: Props) {
  const { role } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(!compact);

  const messages = useMemo(() => {
    const msgs: StellaMessage[] = [];
    const esOperador = role === 'operador';
    const esCorredor = role === 'revisor' || role === 'admin';

    // Onboarding contextual por rol
    if (context.isNewUser || (!context.totalPaquetes && !context.seccionActiva)) {
      if (esOperador) {
        msgs.push({
          id: 'onboarding-operador',
          text: 'Soy Stella, tu entrenadora operativa. Vamos a preparar este expediente juntos. Yo te guío con las clasificaciones, permisos y cálculos. Cuando todo esté listo, lo enviaremos al Corredor para su Veredicto Profesional.',
          type: 'greeting',
          icon: <Heart className="w-4 h-4" />,
          dismissible: true,
        });
      } else if (esCorredor) {
        msgs.push({
          id: 'onboarding-corredor',
          text: 'Bienvenido al centro de control. Tiene expedientes preparados por el equipo de analistas esperando su Veredicto Profesional. Acceda al Portal del Corredor para revisar las aprobaciones pendientes.',
          type: 'greeting',
          icon: <Heart className="w-4 h-4" />,
          dismissible: true,
          action: {
            label: 'Ir al Portal del Corredor',
            onClick: () => onAction?.('go-portal-corredor'),
          },
        });
      } else {
        msgs.push({
          id: 'onboarding',
          text: 'Soy Stella, tu consultora normativa. Comienza cargando un manifiesto de transporte.',
          type: 'greeting',
          icon: <Heart className="w-4 h-4" />,
          dismissible: true,
        });
      }
    }

    // Process ready to export — role-aware messaging
    if (context.processingProgress === 100 && context.listoParaExportar) {
      if (esOperador) {
        msgs.push({
          id: 'ready-send-review',
          text: 'El expediente está completo. He preparado el Resumen de Auditoría para el Corredor. Cuando estés listo, envíalo a revisión para obtener el Veredicto Profesional.',
          type: 'proactive',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          action: {
            label: 'Enviar a Revisión',
            onClick: () => onAction?.('send-to-review'),
          },
        });
      } else if (esCorredor) {
        msgs.push({
          id: 'ready-export',
          text: 'El expediente está listo para su Veredicto Profesional. Revise el Informe de Confianza de Zod y proceda con la firma si todo está en orden.',
          type: 'proactive',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          action: {
            label: 'Revisar y Firmar',
            onClick: () => onAction?.('review-and-sign'),
          },
        });
      }
    }

    // Processing in progress — instructive for operador
    if (context.processingProgress !== undefined && context.processingProgress > 0 && context.processingProgress < 100) {
      msgs.push({
        id: 'processing',
        text: esOperador
          ? `Procesando ${context.totalPaquetes || 0} guías... Estoy triangulando datos y preparando las notas técnicas. ${context.processingProgress}% completado. Cuando termine, revisa los resultados antes de enviar al Corredor.`
          : `Procesando ${context.totalPaquetes || 0} guías... ${context.processingProgress}% completado.`,
        type: 'suggestion',
        icon: <Sparkles className="w-4 h-4 animate-spin-slow" />,
      });
    }

    // Sanitary alerts with Stella's friendly tone
    if (context.alertasSanitarias && context.alertasSanitarias.length > 0) {
      context.alertasSanitarias.forEach((alerta, idx) => {
        const friendlyPrefix = 
          alerta.severidad === 'critical' 
            ? '⚠️ Jefe, atención importante: '
            : alerta.severidad === 'warning'
              ? '📋 Te informo que: '
              : '💡 Para tu conocimiento: ';

        msgs.push({
          id: `alert-${alerta.tipo}-${idx}`,
          text: `${friendlyPrefix}${alerta.mensaje}`,
          type: 'alert',
          icon: <AlertTriangle className="w-4 h-4" />,
          dismissible: true,
        });
      });
    }

    // Validation errors — role-aware
    if (context.erroresValidacion && context.erroresValidacion > 0) {
      msgs.push({
        id: 'validation-errors',
        text: esOperador
          ? `He detectado ${context.erroresValidacion} discrepancias que debes corregir antes de enviar a revisión. Haz clic en cada alerta para ver cómo resolverlo.`
          : `He detectado ${context.erroresValidacion} discrepancias documentales que requieren su criterio profesional. Zod las marcó en el Informe de Confianza.`,
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        action: {
          label: 'Revisar',
          onClick: () => onAction?.('review-errors'),
        },
      });
    }

    // Empty state suggestion
    if (context.totalPaquetes === 0 && !context.isNewUser) {
      msgs.push({
        id: 'empty-section',
        text: 'Esta sección está vacía. ¿Quieres que te guíe para comenzar?',
        type: 'suggestion',
        icon: <Lightbulb className="w-4 h-4" />,
        dismissible: true,
      });
    }

    return msgs.filter(m => !dismissedIds.has(m.id));
  }, [context, dismissedIds, onAction]);

  const dismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  if (messages.length === 0 && compact) return null;

  const stellaName = PLATFORM_INFO.engines.stella.name;

  if (compact) {
    return (
      <div className="space-y-2">
        {messages.slice(0, 2).map(msg => (
          <div 
            key={msg.id}
            className="flex items-start gap-3 p-3 rounded-lg glass-panel-stella animate-fade-in"
          >
            <Sparkles className="w-4 h-4 text-stella mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/90">{msg.text}</p>
              {msg.action && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="mt-1 h-6 px-2 text-xs text-stella hover:text-stella-light hover:bg-primary/10"
                  onClick={msg.action.onClick}
                >
                  {msg.action.label} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            {msg.dismissible && (
              <button onClick={() => dismiss(msg.id)} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="glass-panel-stella stella-pulse overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-stella">
            <Sparkles className="w-5 h-5" />
            <span className="font-display tracking-wide">{stellaName}</span>
            <Badge variant="outline" className="ml-2 border-primary/30 text-primary text-[10px]">
              {role === 'operador' ? 'Entrenadora del Analista' : role === 'revisor' ? 'Enlace del Corredor' : 'Consultora Normativa'}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {messages.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>
                {role === 'operador' 
                  ? 'Todo en orden. Cuando completes el expediente, envíalo al Corredor para su Veredicto Profesional.'
                  : 'Todo en orden. El expediente está siendo monitoreado. Acceda al Portal del Corredor para las aprobaciones pendientes.'}
              </span>
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  msg.type === 'alert' ? 'bg-warning/5 border border-warning/20' :
                  msg.type === 'celebration' ? 'bg-success/5 border border-success/20' :
                  'bg-primary/5 border border-primary/10'
                }`}
              >
                <span className={`mt-0.5 flex-shrink-0 ${
                  msg.type === 'alert' ? 'text-zod' : 'text-stella'
                }`}>
                  {msg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 leading-relaxed">{msg.text}</p>
                  {msg.action && (
                    <Button 
                      size="sm" 
                      className="mt-2 h-7 px-3 text-xs bg-primary/10 text-stella hover:bg-primary/20 border border-primary/20"
                      variant="ghost"
                      onClick={msg.action.onClick}
                    >
                      {msg.action.label} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                {msg.dismissible && (
                  <button 
                    onClick={() => dismiss(msg.id)} 
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}