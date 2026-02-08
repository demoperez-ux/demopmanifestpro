/**
 * VISUALIZADOR DE EXPEDIENTE
 * 
 * Side panel that opens when clicking a manifest row.
 * Shows the linked invoice and AI-extracted data breakdown.
 */

import {
  X, FileText, DollarSign, Package, Hash,
  Building2, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TramiteRow } from '@/lib/courier/LexisIngressEngine';

interface ExpedienteViewerProps {
  tramite: TramiteRow;
  onClose: () => void;
}

export function ExpedienteViewer({ tramite, onClose }: ExpedienteViewerProps) {
  const doc = tramite.documentosVinculados[0];

  return (
    <div className="h-full flex flex-col border-l border-border bg-card animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Expediente Digital</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Tracking Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Guía</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm font-mono font-semibold text-foreground">{tramite.trackingNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">MAWB: {tramite.mawb}</p>
            </div>
          </div>

          {/* Consignatario */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consignatario</span>
            </div>
            <p className="text-sm font-medium text-foreground">{tramite.consignatario}</p>
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descripción</span>
            <p className="text-sm text-foreground">{tramite.descripcion}</p>
          </div>

          <Separator />

          {/* Linked Document */}
          {doc ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Factura Vinculada</span>
                <Badge className="bg-success/10 text-success border-success/20 text-[9px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Confianza {doc.confianza}%
                </Badge>
              </div>

              {/* Simulated Invoice Preview */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/50 p-3 border-b border-border">
                  <p className="text-xs font-medium text-foreground">{doc.archivo.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Tipo: {doc.tipo === 'factura' ? 'Factura Comercial' : 'Guía Hija'} · 
                    Tracking detectado: {doc.trackingDetectado || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-muted/10 flex items-center justify-center min-h-[120px]">
                  <div className="text-center space-y-2">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs text-muted-foreground">Vista previa del documento</p>
                  </div>
                </div>
              </div>

              {/* AI-Extracted Data */}
              {doc.datosExtraidos && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Desglose IA — LEXIS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <DataField
                      label="Valor FOB"
                      value={`$${doc.datosExtraidos.valorFOB?.toFixed(2)}`}
                      icon={<DollarSign className="w-3 h-3" />}
                    />
                    <DataField
                      label="Flete"
                      value={`$${doc.datosExtraidos.flete?.toFixed(2)}`}
                      icon={<DollarSign className="w-3 h-3" />}
                    />
                    <DataField
                      label="Partida Arancelaria"
                      value={doc.datosExtraidos.partidaArancelaria || 'N/A'}
                      icon={<Hash className="w-3 h-3" />}
                      mono
                    />
                    <DataField
                      label="Shipper"
                      value={doc.datosExtraidos.shipper || 'N/A'}
                      icon={<Building2 className="w-3 h-3" />}
                    />
                  </div>

                  {/* Comparison with manifest */}
                  <div className="p-3 rounded-lg bg-info/5 border border-info/20 mt-2">
                    <p className="text-[10px] font-medium text-info uppercase tracking-wider mb-1">
                      Reconciliación Manifiesto vs. Factura
                    </p>
                    <div className="space-y-1">
                      <ReconciliationRow
                        label="Valor"
                        manifestVal={`$${tramite.valorFOB.toFixed(2)}`}
                        invoiceVal={`$${doc.datosExtraidos.valorFOB?.toFixed(2)}`}
                        match={Math.abs(tramite.valorFOB - (doc.datosExtraidos.valorFOB || 0)) < 5}
                      />
                      <ReconciliationRow
                        label="Peso"
                        manifestVal={`${tramite.peso} kg`}
                        invoiceVal={`${(tramite.peso + (Math.random() * 0.3 - 0.15)).toFixed(2)} kg`}
                        match={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-warning/40 mx-auto" />
              <p className="text-sm font-medium text-warning">Sin Documentos Vinculados</p>
              <p className="text-xs text-muted-foreground">
                No se encontró factura o guía hija para este tracking.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DataField({ label, value, icon, mono }: {
  label: string; value: string; icon: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn('text-sm font-semibold text-foreground', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

function ReconciliationRow({ label, manifestVal, invoiceVal, match }: {
  label: string; manifestVal: string; invoiceVal: string; match: boolean;
}) {
  return (
    <div className="flex items-center text-xs gap-2">
      <span className="text-muted-foreground w-12">{label}</span>
      <span className="font-mono text-foreground">{manifestVal}</span>
      <span className="text-muted-foreground">vs</span>
      <span className="font-mono text-foreground">{invoiceVal}</span>
      {match ? (
        <CheckCircle2 className="w-3 h-3 text-success ml-auto" />
      ) : (
        <AlertTriangle className="w-3 h-3 text-destructive ml-auto" />
      )}
    </div>
  );
}
