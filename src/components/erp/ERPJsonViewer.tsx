/**
 * ERP JSON VIEWER — Code-style viewer for structured data
 * Dark mode syntax highlighting for technical payload inspection
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  data: Record<string, unknown>;
}

export function ERPJsonViewer({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar text-sidebar-foreground/60 text-[10px]">
        <span className="font-mono">JSON</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-5 px-1.5 text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground"
        >
          {copied ? <Check className="w-3 h-3 text-success mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[300px] bg-sidebar text-sidebar-foreground/80 scrollbar-thin">
        <code>{colorizeJson(jsonStr)}</code>
      </pre>
    </div>
  );
}

/**
 * Simple JSON syntax colorizer using spans
 * Returns JSX elements with semantic token colors
 */
function colorizeJson(json: string): React.ReactNode[] {
  const lines = json.split('\n');
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    // Match JSON tokens
    const tokenRegex = /("(?:[^"\\]|\\.)*")\s*(:?)|\b(true|false|null)\b|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`${i}-ws-${keyIdx++}`} className="text-sidebar-foreground/30">{line.slice(lastIndex, match.index)}</span>);
      }

      if (match[1]) {
        // String
        if (match[2] === ':') {
          // Key
          parts.push(<span key={`${i}-k-${keyIdx++}`} className="text-primary">{match[1]}</span>);
          parts.push(<span key={`${i}-c-${keyIdx++}`} className="text-sidebar-foreground/30">:</span>);
        } else {
          // Value string
          parts.push(<span key={`${i}-v-${keyIdx++}`} className="text-success">{match[1]}</span>);
        }
      } else if (match[3]) {
        // Boolean/null
        parts.push(<span key={`${i}-b-${keyIdx++}`} className="text-warning">{match[3]}</span>);
      } else if (match[4]) {
        // Number
        parts.push(<span key={`${i}-n-${keyIdx++}`} className="text-accent-foreground">{match[4]}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text (braces, brackets, commas)
    if (lastIndex < line.length) {
      parts.push(<span key={`${i}-r-${keyIdx++}`} className="text-sidebar-foreground/30">{line.slice(lastIndex)}</span>);
    }

    return (
      <span key={`line-${i}`}>
        {parts.length > 0 ? parts : <span className="text-sidebar-foreground/30">{line}</span>}
        {i < lines.length - 1 ? '\n' : ''}
      </span>
    );
  });
}
