/**
 * STELLA HELP — Conversational Technical Advisor
 * Floating chat panel with streaming AI responses
 */

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, X, Trash2, StopCircle, Maximize2, Minimize2,
  BookOpen, Scale, Shield, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStellaHelp, StellaMessage } from '@/hooks/useStellaHelp';
import { StellaMessageBubble } from './StellaMessageBubble';

const QUICK_PROMPTS = [
  { label: 'Clasificación', icon: BookOpen, prompt: '¿Cómo clasifico un producto electrónico que llega por courier desde EE.UU.?' },
  { label: 'Impuestos', icon: Scale, prompt: '¿Cuáles son los impuestos aplicables a una importación con valor CIF de $500?' },
  { label: 'Permisos', icon: Shield, prompt: '¿Qué permisos necesito para importar suplementos alimenticios a Panamá?' },
];

export function StellaHelpChat() {
  const { messages, isLoading, sendMessage, cancelStream, clearChat } = useStellaHelp();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        aria-label="Abrir Stella Help"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Stella Help</span>
        {messages.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-background/20 text-primary-foreground">
            {messages.length}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col bg-background border border-border rounded-xl shadow-2xl transition-all duration-300',
        isExpanded
          ? 'bottom-4 right-4 left-4 top-4 sm:left-auto sm:w-[600px] sm:top-4'
          : 'bottom-4 right-4 w-[380px] h-[560px] sm:w-[420px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Stella Help</h3>
            <p className="text-[10px] text-muted-foreground">Consultora Normativa · ZENITH</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={clearChat} title="Limpiar chat">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">¿En qué puedo asistirle?</h4>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Soy su consultora normativa. Pregunte sobre clasificación arancelaria, impuestos, permisos o regulaciones aduaneras.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
              {QUICK_PROMPTS.map((qp) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <Icon className="w-3 h-3" />
                    {qp.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <StellaMessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse pl-2">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
                <span>Stella está analizando...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom indicator */}
      {messages.length > 4 && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-[72px] left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-border px-3 py-2.5 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escriba su consulta técnica..."
            rows={1}
            className="flex-1 resize-none bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 max-h-24 scrollbar-thin"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
              onClick={cancelStream}
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1.5 text-center">
          Stella Help · ZENITH — Systemic DNA by Demostenes Perez Castillero
        </p>
      </form>
    </div>
  );
}
