// ============================================
// Panel de Detalle de Etapa con Control Points
// ============================================

import React, { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Lock, Users, Clock, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DocumentDropzone } from './DocumentDropzone';
import { RevisionManualModal } from './RevisionManualModal';
import {
  ETAPAS_SOP,
  MATRIZ_RACI,
  type RolRaci,
  type TipoDocumento,
  type ProcesoOnboarding,
} from '@/types/onboarding';
import {
  validateControlPoint,
  canApproveControlPoint,
  getRaciLabel,
  type ControlPointValidation,
} from '@/lib/onboarding/MotorOnboardingCorredor';
import { useAuth } from '@/contexts/AuthContext';

interface EtapaDetailPanelProps {
  etapaId: number;
  proceso: ProcesoOnboarding;
  documentos: {
    tipoDocumento: string;
    nombreDocumento: string;
    aiConfidence: number;
    zodValidado: boolean;
    requiereRevisionManual: boolean;
  }[];
  onApproveCP: (cpId: string, motivo: string) => void;
  onDocumentUpload: (file: File, tipo: TipoDocumento) => void;
}

export const EtapaDetailPanel: React.FC<EtapaDetailPanelProps> = ({
  etapaId,
  proceso,
  documentos,
  onApproveCP,
  onDocumentUpload,
}) => {
  const { role } = useAuth();
  const etapa = ETAPAS_SOP[etapaId];
  const cpId = `CP-${etapaId}`;
  const raci = MATRIZ_RACI[cpId];
  const [motivo, setMotivo] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  if (!etapa) return null;

  const etapaDocs = documentos.filter(d =>
    etapa.documentosRequeridos.includes(d.tipoDocumento as TipoDocumento)
  );

  const validation = validateControlPoint(cpId, proceso, etapaDocs);
  const canApprove = role ? canApproveControlPoint(cpId, [role]) : false;
  const isCurrentOrPast = etapaId <= proceso.etapaActual;
  const isLocked = etapaId > proceso.etapaActual;
  const cpStatus = proceso.controlPoints[cpId]?.estado || 'pendiente';

  const pendingManualReviews = etapaDocs.filter(d => d.requiereRevisionManual);

  return (
    <div className="space-y-6">
      {/* Etapa Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono">
              Etapa {etapa.id}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              SLA: {etapa.slaHoras}h
            </Badge>
          </div>
          <h3 className="text-xl font-bold font-display text-foreground">{etapa.nombre}</h3>
          <p className="text-sm text-muted-foreground mt-1">{etapa.descripcion}</p>
        </div>
        {isLocked && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-xs">Bloqueado</span>
          </div>
        )}
      </div>

      {/* RACI Matrix */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Matriz RACI — {cpId}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {raci && (Object.entries(raci) as [RolRaci, 'R' | 'A' | 'C' | 'I'][]).map(
            ([raciRole, resp]) => (
              <div
                key={raciRole}
                className={cn(
                  'p-2 rounded-lg border text-center',
                  resp === 'R' && 'border-primary/30 bg-primary/5',
                  resp === 'A' && 'border-warning/30 bg-warning/5',
                  resp === 'C' && 'border-muted-foreground/20 bg-muted/20',
                  resp === 'I' && 'border-border bg-muted/10'
                )}
              >
                <span className={cn(
                  'text-lg font-bold font-display',
                  resp === 'R' && 'text-primary',
                  resp === 'A' && 'text-warning',
                  resp === 'C' && 'text-muted-foreground',
                  resp === 'I' && 'text-muted-foreground/60'
                )}>
                  {resp}
                </span>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                  {raciRole.replace('_', ' ')}
                </p>
                <p className="text-[9px] text-muted-foreground/70">{getRaciLabel(resp)}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Document Upload */}
      {isCurrentOrPast && etapa.documentosRequeridos.length > 0 && (
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Documentos Requeridos</span>
          </div>
          <DocumentDropzone
            etapa={etapaId}
            tiposRequeridos={etapa.documentosRequeridos}
            documentosCargados={documentos}
            onDocumentUpload={onDocumentUpload}
            onRequestManualReview={() => setShowReviewModal(true)}
          />
        </div>
      )}

      {/* Manual Review Alert */}
      {pendingManualReviews.length > 0 && (
        <div className="glass-panel-zod p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning">
              {pendingManualReviews.length} documento(s) requieren revisión manual
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Stella detectó campos críticos con confianza &lt; 95%. El AI Quality Lead debe verificar.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewModal(true)}
            className="border-warning/30 text-warning hover:bg-warning/10"
          >
            <Shield className="w-3 h-3 mr-1" />
            Iniciar Revisión Manual
          </Button>
        </div>
      )}

      {/* Control Point Validation */}
      <div className={cn(
        'card-elevated p-4',
        validation.passed ? 'border-success/20' : 'border-destructive/20'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className={cn('w-4 h-4', validation.passed ? 'text-success' : 'text-destructive')} />
          <span className="text-sm font-semibold text-foreground">
            Control Point {cpId}
          </span>
          <Badge
            variant={validation.passed ? 'default' : 'destructive'}
            className="text-[10px] ml-auto"
          >
            {cpStatus === 'aprobado' ? 'APROBADO' : validation.passed ? 'LISTO' : 'BLOQUEADO'}
          </Badge>
        </div>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-1 mb-3">
            {validation.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-1 mb-3">
            {validation.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Approve Button (RBAC controlled) */}
        {canApprove && validation.passed && cpStatus !== 'aprobado' && (
          <div className="space-y-3 mt-4 pt-4 border-t border-border">
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de aprobación (obligatorio para auditoría)..."
              className="text-sm h-20"
            />
            <Button
              onClick={() => {
                if (motivo.trim()) onApproveCP(cpId, motivo);
              }}
              disabled={!motivo.trim()}
              className="w-full btn-primary"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprobar {cpId} — Avanzar a siguiente etapa
            </Button>
          </div>
        )}

        {!canApprove && cpStatus !== 'aprobado' && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            Tu rol ({role || 'sin rol'}) no tiene permisos para aprobar este control point.
            {raci && ` Roles autorizados: ${
              (Object.entries(raci) as [RolRaci, string][])
                .filter(([, r]) => r === 'R' || r === 'A')
                .map(([role]) => role)
                .join(', ')
            }`}
          </p>
        )}

        {/* Zod Seal */}
        {cpStatus === 'aprobado' && (
          <div className="glass-panel-zod p-3 mt-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-zod" />
            <div>
              <p className="text-xs font-semibold text-zod-light">Sello de Integridad Zod</p>
              <p className="text-[10px] text-muted-foreground">
                Control Point verificado y aprobado — Registro inmutable generado
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Review Modal */}
      <RevisionManualModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onApprove={(correcciones) => {
          console.log('Correcciones aprobadas:', correcciones);
          setShowReviewModal(false);
        }}
        documentoNombre={pendingManualReviews[0]?.nombreDocumento || 'Documento'}
        camposCriticos={[
          { campo: 'Nombre Completo', valorExtraido: proceso.corredorNombre, confianza: 92 },
          { campo: 'Cédula', valorExtraido: proceso.corredorCedula, confianza: 88 },
          { campo: 'Monto Fianza', valorExtraido: `$${proceso.montoFianza?.toLocaleString() || '0'}`, confianza: 78 },
        ]}
      />
    </div>
  );
};
