/**
 * ÁREA C — Carga Masiva de Documentos (hasta 1,000 archivos)
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, Files, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface DropZoneCargaMasivaProps {
  onFilesLoaded: (files: File[]) => void;
  archivosCount: number;
  isProcessing: boolean;
  processingProgress: number;
  disabled?: boolean;
}

const MAX_FILES = 1000;

export function DropZoneCargaMasiva({
  onFilesLoaded,
  archivosCount,
  isProcessing,
  processingProgress,
  disabled,
}: DropZoneCargaMasivaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).slice(0, MAX_FILES);
    const valid = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    if (valid.length > 0) onFilesLoaded(valid);
  }, [onFilesLoaded, disabled]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = Array.from(e.target.files || []).slice(0, MAX_FILES);
    const valid = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    if (valid.length > 0) onFilesLoaded(valid);
    e.target.value = '';
  }, [onFilesLoaded, disabled]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] font-semibold">C</Badge>
        <span className="text-sm font-semibold text-foreground">Carga Masiva de Documentos</span>
        <span className="text-[10px] text-muted-foreground">Hasta {MAX_FILES} archivos · PDF/IMG</span>
      </div>

      {isProcessing ? (
        <div className="p-6 rounded-lg border border-warning/30 bg-warning/5 animate-fade-in space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                LEXIS escaneando {archivosCount} documentos...
              </p>
              <p className="text-xs text-muted-foreground">
                Buscando Tracking Number / HAWB en cada archivo
              </p>
            </div>
            <span className="text-sm font-mono font-semibold text-warning">
              {processingProgress}%
            </span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      ) : archivosCount > 0 ? (
        <div className="p-4 rounded-lg border border-success/30 bg-success/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/10">
              <Files className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {archivosCount} documentos cargados
              </p>
              <p className="text-xs text-success">
                Vinculación automática completada
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => inputRef.current?.click()}
            >
              + Agregar más
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            onChange={handleSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'drop-zone p-6 text-center',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            isDragging && !disabled && 'drop-zone-active'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            onChange={handleSelect}
            className="hidden"
            disabled={disabled}
          />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
              isDragging && !disabled ? 'bg-warning/10' : 'bg-muted'
            )}>
              <Upload className={cn('w-5 h-5', isDragging && !disabled ? 'text-warning' : 'text-muted-foreground')} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {disabled ? 'Cargue primero el manifiesto (Área A)' : 'Deposite facturas, guías hijas y documentos de soporte'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF e imágenes — LEXIS vinculará cada documento automáticamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
