// ============================================
// Document Dropzone con AI Processing (Stella)
// OCR + Document Completeness Score
// ============================================

import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Shield, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TIPO_DOCUMENTO_LABELS, type TipoDocumento } from '@/types/onboarding';
import { generarSelloIntegridad } from '@/lib/onboarding/MotorOnboardingCorredor';

interface DocumentDropzoneProps {
  etapa: number;
  tiposRequeridos: TipoDocumento[];
  documentosCargados: {
    tipoDocumento: string;
    nombreDocumento: string;
    aiConfidence: number;
    zodValidado: boolean;
    requiereRevisionManual: boolean;
  }[];
  onDocumentUpload: (file: File, tipo: TipoDocumento) => void;
  onRequestManualReview: (docId: string) => void;
}

interface UploadingFile {
  file: File;
  tipo: TipoDocumento;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  aiScore?: number;
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  etapa,
  tiposRequeridos,
  documentosCargados,
  onDocumentUpload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento>(tiposRequeridos[0] || 'otro');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const simulateAIProcessing = useCallback(async (file: File, tipo: TipoDocumento) => {
    const uploadFile: UploadingFile = {
      file,
      tipo,
      progress: 0,
      status: 'uploading',
    };

    setUploadingFiles(prev => [...prev, uploadFile]);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 200));
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: i } : f)
      );
    }

    // AI Processing phase
    setUploadingFiles(prev =>
      prev.map(f => f.file === file ? { ...f, status: 'processing', progress: 0 } : f)
    );

    for (let i = 0; i <= 100; i += 15) {
      await new Promise(r => setTimeout(r, 300));
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: i } : f)
      );
    }

    // Generate AI confidence score
    const aiScore = 85 + Math.random() * 15; // 85-100%

    setUploadingFiles(prev =>
      prev.map(f =>
        f.file === file ? { ...f, status: 'done', progress: 100, aiScore } : f
      )
    );

    onDocumentUpload(file, tipo);
  }, [onDocumentUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(f => simulateAIProcessing(f, selectedTipo));
    },
    [selectedTipo, simulateAIProcessing]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => simulateAIProcessing(f, selectedTipo));
      e.target.value = '';
    },
    [selectedTipo, simulateAIProcessing]
  );

  const completenessScore = tiposRequeridos.length > 0
    ? (documentosCargados.filter(d => tiposRequeridos.includes(d.tipoDocumento as TipoDocumento) && d.zodValidado).length / tiposRequeridos.length) * 100
    : 100;

  return (
    <div className="space-y-4">
      {/* Completeness Score */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stella" />
            <span className="text-sm font-medium text-foreground">Document Completeness Score</span>
          </div>
          <span className={cn(
            'text-lg font-bold font-display',
            completenessScore === 100 ? 'text-success' : completenessScore >= 50 ? 'text-warning' : 'text-destructive'
          )}>
            {completenessScore.toFixed(0)}%
          </span>
        </div>
        <Progress value={completenessScore} className="h-2" />
      </div>

      {/* Required docs checklist */}
      {tiposRequeridos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tiposRequeridos.map(tipo => {
            const doc = documentosCargados.find(d => d.tipoDocumento === tipo);
            const isUploaded = !!doc;
            const isValidated = doc?.zodValidado;

            return (
              <button
                key={tipo}
                onClick={() => setSelectedTipo(tipo)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm',
                  selectedTipo === tipo && 'border-primary bg-accent/50',
                  !selectedTipo && 'border-border',
                  isValidated && 'border-success/30 bg-success-light/30'
                )}
              >
                {isValidated ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                ) : isUploaded ? (
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={cn('truncate block', isValidated ? 'text-success' : 'text-foreground')}>
                    {TIPO_DOCUMENTO_LABELS[tipo]}
                  </span>
                  {doc && (
                    <span className="text-[10px] text-muted-foreground">
                      IA: {doc.aiConfidence.toFixed(0)}%
                      {doc.requiereRevisionManual && ' · Revisión requerida'}
                    </span>
                  )}
                </div>
                {isValidated && (
                  <Shield className="w-3 h-3 text-zod flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'drop-zone p-8 text-center cursor-pointer',
          isDragging && 'drop-zone-active'
        )}
      >
        <input
          type="file"
          id={`doc-upload-${etapa}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          multiple
          onChange={handleFileSelect}
        />
        <label htmlFor={`doc-upload-${etapa}`} className="cursor-pointer">
          <Upload className={cn('w-10 h-10 mx-auto mb-3', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-sm font-medium text-foreground mb-1">
            {isDragging ? 'Soltar documentos aquí' : 'Arrastra documentos o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-muted-foreground">
            Stella ejecutará OCR + validación automática
          </p>
          <Badge variant="outline" className="mt-2 text-[10px]">
            Cargando como: {TIPO_DOCUMENTO_LABELS[selectedTipo]}
          </Badge>
        </label>
      </div>

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf, idx) => (
            <div key={idx} className="card-elevated p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{uf.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {uf.status === 'uploading' && 'Subiendo...'}
                    {uf.status === 'processing' && (
                      <span className="flex items-center gap-1 text-stella">
                        <Sparkles className="w-3 h-3" />
                        Stella analizando...
                      </span>
                    )}
                    {uf.status === 'done' && (
                      <span className="text-success">
                        IA: {uf.aiScore?.toFixed(0)}%
                      </span>
                    )}
                    {uf.status === 'error' && <span className="text-destructive">Error</span>}
                  </span>
                </div>
                <Progress value={uf.progress} className="h-1" />
              </div>
              {uf.status === 'processing' && (
                <Loader2 className="w-4 h-4 animate-spin text-stella flex-shrink-0" />
              )}
              {uf.status === 'done' && (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
