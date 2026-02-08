/**
 * ÁREA B — Drop Zone para Guía Master (PDF único)
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { GuiaMasterData } from '@/lib/courier/LexisIngressEngine';

interface DropZoneGuiaMasterProps {
  onFileLoaded: (file: File) => void;
  guiaMaster?: GuiaMasterData | null;
}

export function DropZoneGuiaMaster({ onFileLoaded, guiaMaster }: DropZoneGuiaMasterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileLoaded(file);
    }
  }, [onFileLoaded]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoaded(file);
    e.target.value = '';
  }, [onFileLoaded]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-info/10 text-info border-info/20 text-[10px] font-semibold">B</Badge>
        <span className="text-sm font-semibold text-foreground">Guía Master (MAWB)</span>
        <span className="text-[10px] text-muted-foreground">PDF único</span>
      </div>

      {guiaMaster ? (
        <div className="p-4 rounded-lg border border-info/30 bg-info/5 animate-fade-in space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-info/10">
              <FileText className="w-5 h-5 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{guiaMaster.archivo.name}</p>
              <p className="text-xs text-info">Datos de vuelo extraídos</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-info flex-shrink-0" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground">Vuelo</p>
              <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1">
                <Plane className="w-3 h-3" /> {guiaMaster.vuelo}
              </p>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground">MAWB</p>
              <p className="text-xs font-mono font-semibold text-foreground">{guiaMaster.mawb}</p>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground">Ruta</p>
              <p className="text-xs font-semibold text-foreground">{guiaMaster.origen} → {guiaMaster.destino}</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'drop-zone p-6 text-center cursor-pointer',
            isDragging && 'drop-zone-active'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
              isDragging ? 'bg-info/10' : 'bg-muted'
            )}>
              <FileText className={cn('w-5 h-5', isDragging ? 'text-info' : 'text-muted-foreground')} />
            </div>
            <p className="text-sm font-medium text-foreground">
              Deposite la Guía Aérea Master
            </p>
            <p className="text-xs text-muted-foreground">
              Un solo archivo PDF — Extrae vuelo y transportista
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
