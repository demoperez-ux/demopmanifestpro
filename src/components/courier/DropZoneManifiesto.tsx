/**
 * ÁREA A — Drop Zone para Manifiesto (CSV/XLSX)
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DropZoneManifiestoProps {
  onFileLoaded: (file: File) => void;
  archivo?: File | null;
  totalTramites?: number;
}

export function DropZoneManifiesto({ onFileLoaded, archivo, totalTramites }: DropZoneManifiestoProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
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
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">A</Badge>
        <span className="text-sm font-semibold text-foreground">El Manifiesto</span>
        <span className="text-[10px] text-muted-foreground">CSV / XLSX</span>
      </div>

      {archivo ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-success/30 bg-success/5 animate-fade-in">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/10">
            <FileSpreadsheet className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{archivo.name}</p>
            <p className="text-xs text-success">
              {totalTramites ? `${totalTramites} trámites generados` : 'Procesando...'}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
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
            accept=".csv,.xlsx,.xls"
            onChange={handleSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Upload className={cn('w-5 h-5', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <p className="text-sm font-medium text-foreground">
              Deposite el manifiesto del vuelo
            </p>
            <p className="text-xs text-muted-foreground">
              Solo archivos .csv o .xlsx
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
