/**
 * SMART DROP ZONE — ZENITH LEXIS
 * 
 * Minimal enterprise drag-and-drop zone supporting PDF, JPG, PNG, XLSX.
 * LEXIS classifies automatically with professional status indicators.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, FileText, Image, X,
  Loader2, CheckCircle2, AlertTriangle, FileSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

export type TipoDocumentoDetectado =
  | 'factura_comercial'
  | 'documento_transporte'
  | 'manifiesto'
  | 'packing_list'
  | 'imagen'
  | 'desconocido';

export interface ArchivoClasificado {
  file: File;
  tipo: TipoDocumentoDetectado;
  confianza: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  preview?: string;
}

interface SmartDropZoneProps {
  onFilesClassified: (archivos: ArchivoClasificado[]) => void;
  className?: string;
}

const TIPO_LABELS: Record<TipoDocumentoDetectado, { label: string; icon: typeof FileText }> = {
  factura_comercial: { label: 'Factura Comercial', icon: FileText },
  documento_transporte: { label: 'Documento de Transporte', icon: FileSpreadsheet },
  manifiesto: { label: 'Manifiesto', icon: FileSpreadsheet },
  packing_list: { label: 'Packing List', icon: FileText },
  imagen: { label: 'Imagen / Escáner', icon: Image },
  desconocido: { label: 'Sin Clasificar', icon: FileSearch },
};

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls';
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function preclasificarArchivo(file: File): { tipo: TipoDocumentoDetectado; confianza: number } {
  const nombre = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls') || mime.includes('spreadsheet')) {
    if (nombre.includes('manifest') || nombre.includes('manifiesto')) return { tipo: 'manifiesto', confianza: 95 };
    if (nombre.includes('packing') || nombre.includes('empaque')) return { tipo: 'packing_list', confianza: 90 };
    return { tipo: 'manifiesto', confianza: 75 };
  }

  if (mime.startsWith('image/')) return { tipo: 'imagen', confianza: 85 };

  if (mime === 'application/pdf' || nombre.endsWith('.pdf')) {
    if (nombre.includes('invoice') || nombre.includes('factura') || nombre.includes('commercial')) return { tipo: 'factura_comercial', confianza: 92 };
    if (nombre.includes('bill of lading') || nombre.includes('bl') || nombre.includes('conocimiento') || nombre.includes('bol')) return { tipo: 'documento_transporte', confianza: 90 };
    if (nombre.includes('awb') || nombre.includes('airway') || nombre.includes('carta de porte') || nombre.includes('guia')) return { tipo: 'documento_transporte', confianza: 88 };
    if (nombre.includes('packing') || nombre.includes('empaque') || nombre.includes('lista')) return { tipo: 'packing_list', confianza: 85 };
    if (nombre.includes('manifest') || nombre.includes('manifiesto')) return { tipo: 'manifiesto', confianza: 85 };
    return { tipo: 'factura_comercial', confianza: 55 };
  }

  return { tipo: 'desconocido', confianza: 0 };
}

export function SmartDropZone({ onFilesClassified, className }: SmartDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoClasificado[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesarArchivos = useCallback(async (files: File[]) => {
    const nuevos: ArchivoClasificado[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) continue;
      const { tipo, confianza } = preclasificarArchivo(file);
      const archivo: ArchivoClasificado = { file, tipo, confianza, status: 'pending', progress: 0 };
      if (file.type.startsWith('image/')) archivo.preview = URL.createObjectURL(file);
      nuevos.push(archivo);
    }

    setArchivos(prev => [...prev, ...nuevos.map(a => ({ ...a, status: 'processing' as const }))]);

    for (const archivo of nuevos) {
      for (let i = 0; i <= 60; i += 15) {
        await new Promise(r => setTimeout(r, 80));
        setArchivos(prev => prev.map(a => a.file === archivo.file ? { ...a, progress: i } : a));
      }
      for (let i = 60; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 120));
        setArchivos(prev => prev.map(a => a.file === archivo.file ? { ...a, progress: i } : a));
      }
      setArchivos(prev => prev.map(a => a.file === archivo.file ? { ...a, status: 'done', progress: 100 } : a));
    }

    setArchivos(prev => {
      const todosListos = prev.filter(a => a.status === 'done');
      onFilesClassified(todosListos);
      return prev;
    });
  }, [onFilesClassified]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) procesarArchivos(files);
  }, [procesarArchivos]);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) procesarArchivos(files);
    e.target.value = '';
  }, [procesarArchivos]);

  const removeArchivo = useCallback((index: number) => {
    setArchivos(prev => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      const updated = prev.filter((_, i) => i !== index);
      onFilesClassified(updated.filter(a => a.status === 'done'));
      return updated;
    });
  }, [onFilesClassified]);

  const archivosEnProceso = archivos.filter(a => a.status === 'processing');
  const archivosProcesados = archivos.filter(a => a.status === 'done');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'drop-zone p-8 text-center cursor-pointer',
          isDragging && 'drop-zone-active'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            isDragging ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Upload className={cn('w-5 h-5', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Suelte los documentos aquí' : 'Deposite la documentación para análisis LEXIS'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG, XLSX — Máx. 20MB por archivo
            </p>
          </div>
        </div>
      </div>

      {/* Processing indicator */}
      {archivosEnProceso.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">
                Procesando {archivosEnProceso.length} archivo(s)...
              </span>
            </div>
            {archivosEnProceso.map((archivo, idx) => (
              <div key={`processing-${idx}`} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{archivo.file.name}</p>
                  <Progress value={archivo.progress} className="h-1 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Classified files */}
      {archivosProcesados.length > 0 && (
        <ScrollArea className="max-h-56">
          <div className="space-y-2">
            {archivosProcesados.map((archivo, idx) => {
              const tipoInfo = TIPO_LABELS[archivo.tipo];
              const Icon = tipoInfo.icon;
              return (
                <div
                  key={`done-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card animate-fade-in"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
                    {archivo.preview ? (
                      <img src={archivo.preview} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{archivo.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{tipoInfo.label}</Badge>
                      <span className={cn(
                        'text-[10px] font-medium',
                        archivo.confianza >= 80 ? 'text-success' : archivo.confianza >= 50 ? 'text-warning' : 'text-destructive'
                      )}>
                        Confianza: {archivo.confianza}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {archivo.confianza < 60 && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeArchivo(idx); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Secure bulk upload */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-4 h-4" />
        Subida Masiva Segura — LEXIS
      </Button>
    </div>
  );
}
