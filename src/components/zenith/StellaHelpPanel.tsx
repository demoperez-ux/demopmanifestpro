/**
 * STELLA HELP - Panel de IA Proactiva
 * Entrenadora de funcionalidades y asistente operativa
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, MessageCircle, CheckCircle2, AlertTriangle,
  FileSpreadsheet, ArrowRight, X, Lightbulb, Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_INFO } from '@/lib/companyConfig';

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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(!compact);

  const messages = useMemo(() => {
    const msgs: StellaMessage[] = [];

    // Onboarding for new users
    if (context.isNewUser || (!context.totalPaquetes && !context.seccionActiva)) {
      msgs.push({
        id: 'onboarding',
        text: 'Soy Stella, tu brazo derecho. Vamos a configurar este proceso juntos. Comienza cargando un manifiesto de transporte para que pueda ayudarte.',
        type: 'greeting',
        icon: <Heart className="w-4 h-4" />,
        dismissible: true,
      });
    }

    // Process ready to export
    if (context.processingProgress === 100 && context.listoParaExportar) {
      msgs.push({
        id: 'ready-export',
        text: 'Jefe, el proceso está listo para facturar. ¿Deseas que genere el reporte ahora?',
        type: 'proactive',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        action: {
          label: 'Generar Reporte',
          onClick: () => onAction?.('generate-report'),
        },
      });
    }

    // Processing in progress
    if (context.processingProgress !== undefined && context.processingProgress > 0 && context.processingProgress < 100) {
      msgs.push({
        id: 'processing',
        text: `Procesando ${context.totalPaquetes || 0} paquetes... Estoy verificando cada uno con Zod Integrity Engine. ${context.processingProgress}% completado.`,
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

    // Validation errors
    if (context.erroresValidacion && context.erroresValidacion > 0) {
      msgs.push({
        id: 'validation-errors',
        text: `He detectado ${context.erroresValidacion} discrepancias que necesitan tu revisión. Zod ya las marcó para atención prioritaria.`,
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
              IA Proactiva
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
              <span>Todo en orden, jefe. Estoy monitoreando.</span>
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