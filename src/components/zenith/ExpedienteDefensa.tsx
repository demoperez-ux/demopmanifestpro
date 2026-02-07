// ============================================
// Expediente de Defensa — Modo Tribunal
// Agrupación de pruebas para apelación
// ============================================

import React, { useState } from 'react';
import {
  Scale, Plus, FileText, Image, CheckCircle2, Trash2,
  Upload, Shield, Sparkles, Calendar, BookOpen, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type TipoPrueba = 'foto_gs1' | 'factura_auditada' | 'certificado_mici' | 'dictamen_tecnico' | 'comunicacion_ana' | 'otro';

interface Prueba {
  id: string;
  tipo: TipoPrueba;
  titulo: string;
  descripcion: string;
  archivo?: string;
  fechaCarga: string;
  zodSello?: string;
}

interface ExpedienteDefensa {
  id: string;
  titulo: string;
  numeroCaso: string;
  tipoRecurso: 'reconsideracion' | 'apelacion';
  instancia: string;
  fechaCreacion: string;
  fechaLimite: string;
  fundamentoLegal: string;
  argumentos: string;
  pruebas: Prueba[];
  estado: 'borrador' | 'en_preparacion' | 'listo' | 'presentado';
}

const TIPO_PRUEBA_LABELS: Record<TipoPrueba, string> = {
  foto_gs1: 'Fotografía GS1 (GTIN/GLN)',
  factura_auditada: 'Factura Comercial Auditada',
  certificado_mici: 'Certificado MICI / VUCE',
  dictamen_tecnico: 'Dictamen Técnico de Clasificación',
  comunicacion_ana: 'Comunicación Oficial ANA',
  otro: 'Otro Documento',
};

const DEMO_EXPEDIENTE: ExpedienteDefensa = {
  id: 'EXP-2026-001',
  titulo: 'Reclasificación partida 8528.71 — Monitores LED',
  numeroCaso: 'TAT-2026-0042',
  tipoRecurso: 'apelacion',
  instancia: 'Tribunal Administrativo Tributario',
  fechaCreacion: '2026-01-15',
  fechaLimite: '2026-02-15',
  fundamentoLegal: 'Ley 2 de 2016, Art. 23 — Recurso de Apelación',
  argumentos: 'Se impugna la clasificación arancelaria bajo partida 8528.72 asignada por la ANA, argumentando que el producto corresponde a monitores de video de uso industrial (partida 8528.71) según Consulta Clasificatoria ANA-RES-050-2026.',
  estado: 'en_preparacion',
  pruebas: [
    {
      id: 'P1',
      tipo: 'dictamen_tecnico',
      titulo: 'Dictamen de Clasificación — Consulta ANA-RES-050-2026',
      descripcion: 'Resolución de la ANA confirmando que monitores LED industriales se clasifican bajo 8528.71',
      fechaCarga: '2026-01-20',
      zodSello: 'a3f8c2d1...',
    },
    {
      id: 'P2',
      tipo: 'foto_gs1',
      titulo: 'Foto GTIN del Producto — Monitor LG 27MK600M',
      descripcion: 'Fotografía con código de barras GTIN visible para verificación GS1',
      fechaCarga: '2026-01-22',
      zodSello: 'b7e9d4f2...',
    },
    {
      id: 'P3',
      tipo: 'factura_auditada',
      titulo: 'Factura Comercial N.° INV-2026-3847',
      descripcion: 'Factura con desglose de ítems, concordante con BL y packing list',
      fechaCarga: '2026-01-22',
      zodSello: 'c1a5e8g3...',
    },
  ],
};

export const ExpedienteDefensaPanel: React.FC = () => {
  const [expediente, setExpediente] = useState<ExpedienteDefensa>(DEMO_EXPEDIENTE);
  const [showAddPrueba, setShowAddPrueba] = useState(false);
  const [newPrueba, setNewPrueba] = useState<Partial<Prueba>>({
    tipo: 'otro',
    titulo: '',
    descripcion: '',
  });

  const handleAddPrueba = () => {
    if (!newPrueba.titulo?.trim()) return;
    const prueba: Prueba = {
      id: `P${Date.now()}`,
      tipo: newPrueba.tipo as TipoPrueba,
      titulo: newPrueba.titulo || '',
      descripcion: newPrueba.descripcion || '',
      fechaCarga: new Date().toISOString().split('T')[0],
      zodSello: `${Math.random().toString(16).substring(2, 10)}...`,
    };
    setExpediente(prev => ({
      ...prev,
      pruebas: [...prev.pruebas, prueba],
    }));
    setNewPrueba({ tipo: 'otro', titulo: '', descripcion: '' });
    setShowAddPrueba(false);
  };

  const handleRemovePrueba = (id: string) => {
    setExpediente(prev => ({
      ...prev,
      pruebas: prev.pruebas.filter(p => p.id !== id),
    }));
  };

  const diasRestantes = Math.max(0,
    Math.ceil((new Date(expediente.fechaLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel-zod p-4">
        <div className="flex items-center gap-3 mb-3">
          <Scale className="w-5 h-5 text-warning" />
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Expediente de Defensa — Modo Tribunal
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Ley 2 de 2016, Arts. 22-23 · Agrupación de pruebas para recurso
            </p>
          </div>
        </div>
      </div>

      {/* Expediente Info */}
      <div className="card-elevated p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-foreground">{expediente.titulo}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Caso: {expediente.numeroCaso} · {expediente.instancia}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={expediente.estado === 'listo' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {expediente.estado.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Scale className="w-3 h-3" /> Tipo Recurso
            </p>
            <p className="text-xs font-medium text-foreground capitalize">{expediente.tipoRecurso}</p>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Fecha Límite
            </p>
            <p className={cn('text-xs font-medium', diasRestantes <= 3 ? 'text-destructive' : 'text-foreground')}>
              {expediente.fechaLimite}
            </p>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" /> Pruebas
            </p>
            <p className="text-xs font-medium text-foreground">{expediente.pruebas.length}</p>
          </div>
          <div className={cn(
            'p-2 rounded',
            diasRestantes <= 3 ? 'bg-destructive/10' : diasRestantes <= 7 ? 'bg-warning/10' : 'bg-success/10'
          )}>
            <p className="text-[10px] text-muted-foreground">Días Restantes</p>
            <p className={cn(
              'text-lg font-bold font-display',
              diasRestantes <= 3 ? 'text-destructive' : diasRestantes <= 7 ? 'text-warning' : 'text-success'
            )}>
              {diasRestantes}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Fundamento Legal
          </p>
          <p className="text-xs text-primary font-medium">{expediente.fundamentoLegal}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Argumentos</p>
          <p className="text-xs text-foreground leading-relaxed">{expediente.argumentos}</p>
        </div>
      </div>

      {/* Pruebas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Pruebas del Expediente ({expediente.pruebas.length})
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddPrueba(!showAddPrueba)}
            className="gap-1"
          >
            <Plus className="w-3 h-3" />
            Agregar Prueba
          </Button>
        </div>

        {/* Add Prueba Form */}
        {showAddPrueba && (
          <div className="card-elevated p-4 mb-3 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Tipo de Prueba</Label>
                <Select
                  value={newPrueba.tipo}
                  onValueChange={(v) => setNewPrueba(prev => ({ ...prev, tipo: v as TipoPrueba }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_PRUEBA_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={newPrueba.titulo}
                  onChange={e => setNewPrueba(prev => ({ ...prev, titulo: e.target.value }))}
                  className="mt-1"
                  placeholder="Título descriptivo de la prueba"
                />
              </div>
            </div>
            <div className="mb-3">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={newPrueba.descripcion}
                onChange={e => setNewPrueba(prev => ({ ...prev, descripcion: e.target.value }))}
                className="mt-1 h-16"
                placeholder="Relevancia de esta prueba para el caso..."
              />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="sm" className="gap-1">
                <Upload className="w-3 h-3" />
                Adjuntar Archivo
              </Button>
              <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG · Max 10MB</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddPrueba(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="btn-primary" onClick={handleAddPrueba}>
                Agregar al Expediente
              </Button>
            </div>
          </div>
        )}

        {/* Pruebas List */}
        <div className="space-y-2">
          {expediente.pruebas.map((prueba, idx) => (
            <div key={prueba.id} className="card-elevated p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-muted-foreground font-mono">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-[9px]">
                    {TIPO_PRUEBA_LABELS[prueba.tipo]}
                  </Badge>
                  {prueba.zodSello && (
                    <Badge variant="outline" className="text-[9px] border-zod/30 text-zod">
                      <Shield className="w-2 h-2 mr-0.5" />
                      Sello Zod
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{prueba.titulo}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{prueba.descripcion}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Cargado: {prueba.fechaCarga}
                  {prueba.zodSello && ` · Hash: ${prueba.zodSello}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePrueba(prueba.id)}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
