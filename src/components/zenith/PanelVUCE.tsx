// ============================================
// Panel VUCE — Preparación de datos para MICI
// Certificados de Origen y sincronización VUCE
// ============================================

import React, { useState } from 'react';
import {
  Building2, Globe, FileText, Send, CheckCircle2, Clock,
  ArrowRight, Shield, Info, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ServicioVUCE, TLCS_PANAMA, type SolicitudVUCE } from '@/lib/compliance/ServicioVUCE';
import { useToast } from '@/hooks/use-toast';

export const PanelVUCE: React.FC = () => {
  const { toast } = useToast();
  const [solicitud, setSolicitud] = useState<SolicitudVUCE | null>(null);
  const [xmlPreview, setXmlPreview] = useState<string>('');
  
  const [form, setForm] = useState({
    hsCode: '',
    descripcion: '',
    paisOrigen: '',
    valorFOB: '',
    pesoKg: '',
    importadorRuc: '',
    importadorNombre: '',
    exportadorNombre: '',
  });

  const detectedTLC = form.paisOrigen ? ServicioVUCE.detectarTLC(form.paisOrigen) : null;

  const handleGenerar = () => {
    if (!form.hsCode || !form.descripcion || !form.paisOrigen) {
      toast({ title: 'Campos incompletos', description: 'Complete HS Code, descripción y país de origen.', variant: 'destructive' });
      return;
    }

    const sol = ServicioVUCE.prepararSolicitudOrigen({
      hsCode: form.hsCode,
      descripcion: form.descripcion,
      paisOrigen: form.paisOrigen,
      valorFOB: parseFloat(form.valorFOB) || 0,
      pesoKg: parseFloat(form.pesoKg) || 0,
      importadorRuc: form.importadorRuc,
      importadorNombre: form.importadorNombre,
      exportadorNombre: form.exportadorNombre,
      corredorId: 'ZENITH-USER',
      corredorNombre: 'Corredor ZENITH',
    });

    setSolicitud(sol);
    setXmlPreview(ServicioVUCE.generarXMLVUCE(sol));
    toast({ title: 'Solicitud VUCE generada', description: `ID: ${sol.id}` });
  };

  const handleCopyXML = () => {
    navigator.clipboard.writeText(xmlPreview);
    toast({ title: 'XML copiado', description: 'Payload VUCE copiado al portapapeles.' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-elevated p-4 border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              VUCE — Ventanilla Única de Comercio Exterior
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Ministerio de Comercio e Industrias (MICI) · Ley 2 de 2016, Art. 38
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <Info className="w-3 h-3 flex-shrink-0" />
          <span>ZENITH prepara los datos en formato XML estándar VUCE. La transmisión requiere integración directa con el portal MICI.</span>
        </div>
      </div>

      {/* TLCs Available */}
      <div className="card-elevated p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          TLCs Vigentes de Panamá ({TLCS_PANAMA.filter(t => t.vigente).length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {TLCS_PANAMA.filter(t => t.vigente).map(tlc => (
            <Badge
              key={tlc.id}
              variant="outline"
              className={cn(
                'text-[10px]',
                detectedTLC?.id === tlc.id && 'border-success/50 bg-success/10 text-success'
              )}
            >
              {tlc.nombre}
            </Badge>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="card-elevated p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Preparar Solicitud de Certificado de Origen
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-xs">Código SA / HS Code *</Label>
            <Input
              value={form.hsCode}
              onChange={e => setForm(p => ({ ...p, hsCode: e.target.value }))}
              placeholder="8528.71"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">País de Origen *</Label>
            <Input
              value={form.paisOrigen}
              onChange={e => setForm(p => ({ ...p, paisOrigen: e.target.value }))}
              placeholder="US, MX, CO..."
              className="mt-1"
            />
            {detectedTLC && (
              <p className="text-[10px] text-success mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                TLC detectado: {detectedTLC.nombre}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Descripción de Mercancía *</Label>
            <Textarea
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción completa de la mercancía..."
              className="mt-1 h-16"
            />
          </div>
          <div>
            <Label className="text-xs">Valor FOB (USD)</Label>
            <Input
              value={form.valorFOB}
              onChange={e => setForm(p => ({ ...p, valorFOB: e.target.value }))}
              placeholder="0.00"
              type="number"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Peso Bruto (KG)</Label>
            <Input
              value={form.pesoKg}
              onChange={e => setForm(p => ({ ...p, pesoKg: e.target.value }))}
              placeholder="0.00"
              type="number"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">RUC Importador</Label>
            <Input
              value={form.importadorRuc}
              onChange={e => setForm(p => ({ ...p, importadorRuc: e.target.value }))}
              placeholder="155678901-2-2024"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Nombre Importador</Label>
            <Input
              value={form.importadorNombre}
              onChange={e => setForm(p => ({ ...p, importadorNombre: e.target.value }))}
              placeholder="Empresa S.A."
              className="mt-1"
            />
          </div>
        </div>

        <Button onClick={handleGenerar} className="btn-primary gap-2 w-full">
          <Send className="w-4 h-4" />
          Generar Payload VUCE
        </Button>
      </div>

      {/* Result */}
      {solicitud && (
        <div className="space-y-3 animate-fade-in">
          <div className="card-elevated p-4 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">Solicitud Generada</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">{solicitud.id}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium text-foreground">{solicitud.tipo.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">TLC:</span>
                <p className="font-medium text-foreground">{solicitud.tlcAplicable || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">HS Code:</span>
                <p className="font-medium text-foreground font-mono">{solicitud.hsCode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="secondary" className="text-[10px]">
                  <Clock className="w-3 h-3 mr-1" />
                  {solicitud.estado}
                </Badge>
              </div>
            </div>
          </div>

          {/* XML Preview */}
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Payload XML VUCE</span>
              <Button variant="outline" size="sm" onClick={handleCopyXML} className="gap-1 text-xs">
                <Copy className="w-3 h-3" />
                Copiar
              </Button>
            </div>
            <pre className="text-[10px] text-muted-foreground bg-background p-3 rounded-lg border border-border overflow-x-auto max-h-64 scrollbar-thin font-mono">
              {xmlPreview}
            </pre>
          </div>

          {/* Zod Seal */}
          <div className="glass-panel-zod p-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-zod" />
            <div>
              <p className="text-xs font-semibold text-zod-light">Sello de Integridad Zod</p>
              <p className="text-[10px] text-muted-foreground">
                Datos validados y preparados para transmisión VUCE — Formato XML estándar MICI
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
