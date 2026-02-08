/**
 * STELLA MESSAGE BUBBLE — Individual chat message rendering
 * Supports markdown-style formatting and actionable suggestions
 */

import { Sparkles, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { StellaMessage } from '@/hooks/useStellaHelp';

interface Props {
  message: StellaMessage;
}

export function StellaMessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-like rendering: bold, lists, code, headings
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Heading (## or ###)
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-xs font-bold text-foreground mt-2 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-bold text-foreground mt-2 mb-1">{line.slice(3)}</h3>;
      }

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-primary/60 mt-0.5">•</span>
            <span className="flex-1">{renderInline(line.slice(2))}</span>
          </div>
        );
      }

      // Numbered list
      const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-primary/60 font-medium min-w-[16px]">{numberedMatch[1]}.</span>
            <span className="flex-1">{renderInline(numberedMatch[2])}</span>
          </div>
        );
      }

      // Inline code block
      if (line.startsWith('```')) return null;

      // Signature line
      if (line.startsWith('— Stella')) {
        return <p key={i} className="text-[10px] text-primary/60 mt-2 italic">{line}</p>;
      }

      // Empty line
      if (line.trim() === '') return <div key={i} className="h-1.5" />;

      // Regular text
      return <p key={i}>{renderInline(line)}</p>;
    });
  };

  // Inline formatting: **bold**, `code`, _italic_
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono text-primary">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className={cn('flex gap-2.5', isAssistant ? 'items-start' : 'items-start flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
        isAssistant ? 'bg-primary/10' : 'bg-muted'
      )}>
        {isAssistant
          ? <Sparkles className="w-3.5 h-3.5 text-primary" />
          : <User className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'group relative max-w-[85%] rounded-xl px-3.5 py-2.5',
        isAssistant
          ? 'bg-muted/50 border border-border text-foreground'
          : 'bg-primary text-primary-foreground'
      )}>
        <div className={cn(
          'text-[13px] leading-relaxed space-y-0.5',
          isAssistant ? 'text-foreground/90' : 'text-primary-foreground'
        )}>
          {isAssistant ? renderContent(message.content) : <p>{message.content}</p>}
        </div>

        {/* Copy button for assistant messages */}
        {isAssistant && message.content.length > 20 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute -bottom-3 right-1 h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border shadow-sm"
          >
            {copied
              ? <><Check className="w-3 h-3 mr-1 text-success" />Copiado</>
              : <><Copy className="w-3 h-3 mr-1" />Copiar</>}
          </Button>
        )}

        {/* Timestamp */}
        <p className={cn(
          'text-[9px] mt-1',
          isAssistant ? 'text-muted-foreground/40' : 'text-primary-foreground/50'
        )}>
          {message.timestamp.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
