// ============================================
// Panel de Órganos Anuentes UNCAP
// Perfiles de validación + Base Legal
// ============================================

import React, { useState } from 'react';
import {
  Shield, Leaf, Flame, Building2, Scale, Search, AlertTriangle,
  CheckCircle2, XCircle, ExternalLink, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PERFILES_ANUENTES,
  BASE_LEGAL_UNCAP,
  MotorAnuentesUNCAP,
  type OrganoAnuente,
  type VeredictoAnuente,
  type PerfilAnuente,
} from '@/lib/compliance/MotorAnuentesUNCAP';

const ICONO_ORGANO: Record<string, React.ReactNode> = {
  MI_AMBIENTE: <Leaf className="w-4 h-4" />,
  BOMBEROS_DINASEPI: <Flame className="w-4 h-4" />,
  MICI: <Building2 className="w-4 h-4" />,
  TRIBUNAL_ADUANERO: <Scale className="w-4 h-4" />,
};

const COLOR_ORGANO: Record<string, string> = {
  MI_AMBIENTE: 'text-success border-success/30 bg-success/5',
  BOMBEROS_DINASEPI: 'text-destructive border-destructive/30 bg-destructive/5',
  MICI: 'text-primary border-primary/30 bg-primary/5',
  TRIBUNAL_ADUANERO: 'text-warning border-warning/30 bg-warning/5',
};

export const PanelAnuentesUNCAP: React.FC = () => {
  const [selectedOrgano, setSelectedOrgano] = useState<OrganoAnuente | null>(null);
  const [testDescripcion, setTestDescripcion] = useState('');
  const [testHsCode, setTestHsCode] = useState('');
  const [veredictos, setVeredictos] = useState<VeredictoAnuente[]>([]);
  const [expandedLegal, setExpandedLegal] = useState<string | null>(null);

  const nuevosAnuentes = PERFILES_ANUENTES.filter(p =>
    ['MI_AMBIENTE', 'BOMBEROS_DINASEPI', 'MICI', 'TRIBUNAL_ADUANERO'].includes(p.id)
  );

  const handleEvaluarMercancia = () => {
    if (!testDescripcion.trim()) return;
    const resultado = MotorAnuentesUNCAP.evaluarMercancia({
      descripcion: testDescripcion,
      hsCode: testHsCode,
      solicitaCertificadoOrigen: testDescripcion.toLowerCase().includes('origen'),
    });
    setVeredictos(resultado);
  };

  return (
    <div className="space-y-6">
      {/* Perfiles de Órganos Anuentes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Perfiles de Órganos Anuentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nuevosAnuentes.map(perfil => (
            <PerfilCard
              key={perfil.id}
              perfil={perfil}
              isSelected={selectedOrgano === perfil.id}
              onSelect={() => setSelectedOrgano(selectedOrgano === perfil.id ? null : perfil.id)}
            />
          ))}
        </div>
      </div>

      {/* Detalle del órgano seleccionado */}
      {selectedOrgano && (
        <DetalleOrgano organo={selectedOrgano} />
      )}

      {/* Simulador de Evaluación */}
      <div className="card-elevated p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          Simulador de Evaluación UNCAP
        </h3>
        <div className="flex gap-3 mb-4">
          <Input
            value={testDescripcion}
            onChange={e => setTestDescripcion(e.target.value)}
            placeholder="Descripción de mercancía (ej: Refrigerante R-22 HCFC)"
            className="flex-1"
          />
          <Input
            value={testHsCode}
            onChange={e => setTestHsCode(e.target.value)}
            placeholder="HS Code"
            className="w-32"
          />
          <Button onClick={handleEvaluarMercancia} className="btn-primary" size="sm">
            Evaluar
          </Button>
        </div>

        {veredictos.length > 0 && (
          <div className="space-y-2">
            {veredictos.map((v, i) => (
              <div
                key={i}
                className={cn(
                  'p-3 rounded-lg border',
                  v.tipo === 'bloqueo' && 'glass-panel-zod border-destructive/30',
                  v.tipo === 'advertencia' && 'border-warning/30 bg-warning/5',
                  v.tipo === 'aprobacion' && 'border-success/30 bg-success/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {v.tipo === 'bloqueo' ? (
                    <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  ) : v.tipo === 'advertencia' ? (
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ICONO_ORGANO[v.organo]}
                      <Badge variant="outline" className={cn('text-[10px]', COLOR_ORGANO[v.organo])}>
                        {MotorAnuentesUNCAP.obtenerPerfil(v.organo)?.nombre || v.organo}
                      </Badge>
                      <Badge
                        variant={v.tipo === 'bloqueo' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {v.tipo.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground font-medium mb-1">{v.veredicto}</p>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      <span className="font-semibold">Base Legal:</span> {v.fundamentoLegal}
                    </p>
                    {v.documentoRequerido && (
                      <p className="text-[11px] text-warning">
                        <span className="font-semibold">Documento:</span> {v.documentoRequerido}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground italic mt-1">
                      {v.accionRequerida}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Base Legal UNCAP */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Base Legal UNCAP
        </h3>
        <div className="space-y-2">
          {BASE_LEGAL_UNCAP.map(norma => (
            <div key={norma.id} className="card-elevated overflow-hidden">
              <button
                onClick={() => setExpandedLegal(expandedLegal === norma.id ? null : norma.id)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {norma.tipo.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-foreground">{norma.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {norma.organoEmisor} · {norma.fechaEmision}
                    </p>
                  </div>
                </div>
                {expandedLegal === norma.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedLegal === norma.id && (
                <div className="border-t border-border p-3 space-y-2 bg-muted/10">
                  {norma.articulosRelevantes.map(art => (
                    <div key={art.numero} className="p-2 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{art.numero}</Badge>
                        <span className="text-xs font-medium text-foreground">{art.titulo}</span>
                        <Badge
                          variant={art.tipoAccion === 'bloqueo' ? 'destructive' : art.tipoAccion === 'sancion' ? 'secondary' : 'outline'}
                          className="text-[9px] ml-auto"
                        >
                          {art.tipoAccion}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{art.contenidoResumen}</p>
                      <div className="flex gap-1 mt-1">
                        {art.aplicaA.map(org => (
                          <Badge key={org} variant="outline" className={cn('text-[9px]', COLOR_ORGANO[org])}>
                            {org.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================
const PerfilCard: React.FC<{
  perfil: PerfilAnuente;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ perfil, isSelected, onSelect }) => (
  <button
    onClick={onSelect}
    className={cn(
      'p-4 rounded-lg border text-left transition-all',
      isSelected ? cn('border-2', COLOR_ORGANO[perfil.id]) : 'card-elevated hover:border-primary/30'
    )}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={cn('p-2 rounded-lg', COLOR_ORGANO[perfil.id])}>
        {ICONO_ORGANO[perfil.id]}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{perfil.nombre}</p>
        <p className="text-[10px] text-muted-foreground">{perfil.nombreCompleto}</p>
      </div>
    </div>
    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{perfil.competencia}</p>
    <div className="flex items-center gap-2 text-[10px]">
      <Badge variant="outline" className="text-[9px]">{perfil.fundamentoLegal.split(',')[0]}</Badge>
      <span className="text-muted-foreground">Resp: {perfil.tiempoRespuestaDias}d</span>
    </div>
  </button>
);

const DetalleOrgano: React.FC<{ organo: OrganoAnuente }> = ({ organo }) => {
  const perfil = MotorAnuentesUNCAP.obtenerPerfil(organo);
  const articulos = MotorAnuentesUNCAP.articulosPorOrgano(organo);
  if (!perfil) return null;

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', COLOR_ORGANO[perfil.id])}>
          {ICONO_ORGANO[perfil.id]}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{perfil.nombreCompleto}</p>
          <p className="text-xs text-muted-foreground">{perfil.fundamentoLegal}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{perfil.competencia}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2 rounded bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Tipo Control</p>
          <p className="text-xs font-medium text-foreground">{perfil.tiposControl.join(', ')}</p>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Tiempo Respuesta</p>
          <p className="text-xs font-medium text-foreground">{perfil.tiempoRespuestaDias} días hábiles</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Documentos Requeridos:</p>
        <ul className="space-y-1">
          {perfil.documentosRequeridos.map((doc, i) => (
            <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              {doc}
            </li>
          ))}
        </ul>
      </div>

      {articulos.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Artículos Aplicables:</p>
          <div className="space-y-1">
            {articulos.map((art, i) => (
              <div key={i} className="text-[11px] p-1.5 rounded bg-muted/20 border border-border/50">
                <span className="font-mono font-semibold text-primary">{art.numero}</span>
                <span className="text-muted-foreground"> — {art.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
