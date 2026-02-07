/**
 * PORTAL DEL CORREDOR — ZENITH Copiloto de Inteligencia Aduanera
 * 
 * Flujo Draft-to-Sign:
 * 1. "Preparado por ZENITH" (Draft) — Auditoría automática
 * 2. Revisión del corredor — Notas técnicas de Stella + Informe de Riesgo de Zod
 * 3. "Aprobado Final" — Firma digital del corredor licenciado
 * 4. Exportación a SIGA habilitada
 */

import { useState, useMemo } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Sparkles, FileCheck, Lock,
  ClipboardCheck, CheckCircle2, AlertTriangle, FileText, Stamp,
  ArrowRight, BookOpen, Scale, PenLine, Eye, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AuditoriaResponsabilidadSolidaria,
  InformeRiesgoLegal,
  DatosAuditoria,
} from '@/lib/compliance/AuditoriaResponsabilidadSolidaria';
import {
  BaseNormativaPanama,
  NotaTecnica,
  CategoriaLegal,
} from '@/lib/normativa/BaseNormativaPanama';

// ============ TIPOS ============

export type EstadoExpediente = 'borrador' | 'preparado' | 'en_revision' | 'aprobado' | 'rechazado';

interface Props {
  mawb: string;
  totalPaquetes: number;
  valorCIFTotal: number;
  paisOrigen: string;
  paquetes: DatosAuditoria['paquetes'];
  pesoDeclarado: number;
  pesoVerificado: number;
  onAprobado?: (hash: string) => void;
  onExportarSIGA?: () => void;
}

// ============ COMPONENTE ============

export function PortalCorredor({
  mawb,
  totalPaquetes,
  valorCIFTotal,
  paisOrigen,
  paquetes,
  pesoDeclarado,
  pesoVerificado,
  onAprobado,
  onExportarSIGA,
}: Props) {
  const [estado, setEstado] = useState<EstadoExpediente>('preparado');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  const [notasCorredorText, setNotasCorredorText] = useState('');
  const [categoriaNotas, setCategoriaNotas] = useState<CategoriaLegal>('liquidacion');

  // Ejecutar auditoría de responsabilidad solidaria
  const informeRiesgo = useMemo<InformeRiesgoLegal>(() => {
    return AuditoriaResponsabilidadSolidaria.ejecutar({
      mawb,
      paquetes,
      pesoDeclaradoTotal: pesoDeclarado,
      pesoVerificadoTotal: pesoVerificado,
      paisOrigen,
    });
  }, [mawb, paquetes, pesoDeclarado, pesoVerificado, paisOrigen]);

  // Notas técnicas de Stella
  const notasTecnicas = useMemo(() => {
    return BaseNormativaPanama.buscarNotas(categoriaNotas, 5);
  }, [categoriaNotas]);

  // TLC aplicable
  const tlcAplicable = useMemo(() => {
    return BaseNormativaPanama.obtenerTLCAplicable(paisOrigen);
  }, [paisOrigen]);

  // Nota de responsabilidad solidaria
  const notaResponsabilidad = useMemo(() => {
    return BaseNormativaPanama.obtenerNotaResponsabilidad();
  }, []);

  // Progress del flujo Draft-to-Sign
  const progresoDTS = useMemo(() => {
    switch (estado) {
      case 'borrador': return 0;
      case 'preparado': return 33;
      case 'en_revision': return 66;
      case 'aprobado': return 100;
      case 'rechazado': return 33;
    }
  }, [estado]);

  const handleIniciarRevision = () => {
    setEstado('en_revision');
  };

  const handleAprobar = () => {
    if (informeRiesgo.requiereFirmaCorredor) {
      setFirmaDialogOpen(true);
    } else {
      confirmarAprobacion();
    }
  };

  const confirmarAprobacion = () => {
    setEstado('aprobado');
    setFirmaDialogOpen(false);
    onAprobado?.(informeRiesgo.hashInforme);
  };

  const handleRechazar = () => {
    setEstado('rechazado');
  };

  const severidadColor = (severidad: string) => {
    switch (severidad) {
      case 'critico': return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'grave': return 'text-zod bg-warning/10 border-warning/30';
      default: return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  const estadoInfo = {
    borrador: { label: 'Borrador', color: 'text-muted-foreground', icon: FileText },
    preparado: { label: 'Preparado por ZENITH', color: 'text-primary', icon: Sparkles },
    en_revision: { label: 'En Revisión del Corredor', color: 'text-zod', icon: Eye },
    aprobado: { label: 'Aprobado — Listo para SIGA', color: 'text-success', icon: ShieldCheck },
    rechazado: { label: 'Rechazado — Requiere corrección', color: 'text-destructive', icon: XCircle },
  };

  const EstadoIcon = estadoInfo[estado].icon;

  return (
    <div className="space-y-6">
      {/* Header — Estado del Expediente */}
      <Card className="glass-panel border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                estado === 'aprobado' ? 'bg-success/10 border-success/30' :
                estado === 'rechazado' ? 'bg-destructive/10 border-destructive/30' :
                'bg-primary/10 border-primary/30'
              }`}>
                <EstadoIcon className={`w-7 h-7 ${estadoInfo[estado].color}`} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground tracking-wide">
                  Portal del Corredor de Aduanas
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`${estadoInfo[estado].color} border-current/30`}>
                    {estadoInfo[estado].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">MAWB: {mawb}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estado === 'preparado' && (
                <Button onClick={handleIniciarRevision} className="gap-2">
                  <Eye className="w-4 h-4" />
                  Iniciar Revisión
                </Button>
              )}
              {estado === 'en_revision' && (
                <>
                  <Button variant="outline" onClick={handleRechazar} className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <XCircle className="w-4 h-4" />
                    Devolver
                  </Button>
                  <Button onClick={handleAprobar} className="gap-2" disabled={informeRiesgo.nivelRiesgoGlobal === 'critico' && informeRiesgo.hallazgos.some(h => h.tipo === 'permiso_faltante')}>
                    <PenLine className="w-4 h-4" />
                    Dar Aprobado Final
                  </Button>
                </>
              )}
              {estado === 'aprobado' && (
                <Button onClick={onExportarSIGA} className="gap-2 bg-success/80 hover:bg-success text-success-foreground">
                  <Stamp className="w-4 h-4" />
                  Exportar a SIGA
                </Button>
              )}
              {estado === 'rechazado' && (
                <Button variant="outline" onClick={() => setEstado('preparado')} className="gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Volver a preparar
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar Draft-to-Sign */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Flujo Draft-to-Sign</span>
              <span>{progresoDTS}%</span>
            </div>
            <Progress value={progresoDTS} className="h-2" />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[10px] ${estado !== 'borrador' ? 'text-success' : 'text-muted-foreground'}`}>
                Preparado
              </span>
              <span className={`text-[10px] ${estado === 'en_revision' || estado === 'aprobado' ? 'text-success' : 'text-muted-foreground'}`}>
                En Revisión
              </span>
              <span className={`text-[10px] ${estado === 'aprobado' ? 'text-success' : 'text-muted-foreground'}`}>
                Aprobado
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Guías</p>
            <p className="text-2xl font-bold font-display text-foreground">{totalPaquetes}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Valor CIF Total</p>
            <p className="text-2xl font-bold font-display text-success">${valorCIFTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Hallazgos Zod</p>
            <p className={`text-2xl font-bold font-display ${
              informeRiesgo.totalHallazgos === 0 ? 'text-success' : 'text-zod'
            }`}>{informeRiesgo.totalHallazgos}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Riesgo Legal</p>
            <p className={`text-2xl font-bold font-display ${
              informeRiesgo.nivelRiesgoGlobal === 'critico' ? 'text-destructive' :
              informeRiesgo.nivelRiesgoGlobal === 'grave' ? 'text-zod' : 'text-success'
            }`}>{informeRiesgo.nivelRiesgoGlobal.toUpperCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal — Tabs */}
      <Tabs defaultValue="auditoria">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="auditoria" className="gap-2">
            <Shield className="w-4 h-4" />
            Informe de Riesgo
          </TabsTrigger>
          <TabsTrigger value="normativa" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Notas de Stella
          </TabsTrigger>
          <TabsTrigger value="resumen" className="gap-2">
            <Scale className="w-4 h-4" />
            Resumen Legal
          </TabsTrigger>
        </TabsList>

        {/* Informe de Riesgo (Zod) */}
        <TabsContent value="auditoria" className="space-y-4 mt-4">
          {/* Mensaje de Zod */}
          <Card className="glass-panel-zod">
            <CardContent className="pt-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-zod mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zod mb-1">Veredicto de Zod — Auditoría de Responsabilidad Solidaria</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{informeRiesgo.mensajeZod}</p>
              </div>
            </CardContent>
          </Card>

          {/* Mensaje de Stella */}
          <Card className="glass-panel-stella">
            <CardContent className="pt-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-stella mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-stella mb-1">Stella Help — Nota para el corredor</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{informeRiesgo.mensajeStella}</p>
              </div>
            </CardContent>
          </Card>

          {/* Hallazgos */}
          {informeRiesgo.hallazgos.length === 0 ? (
            <Card className="bg-card border-success/20">
              <CardContent className="pt-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm text-foreground">Sin hallazgos — El expediente cumple con los requisitos de la Ley 30 de 1984.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {informeRiesgo.hallazgos.map(h => (
                <Card key={h.id} className={`border ${severidadColor(h.severidad)}`}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.severidad === 'critico' ? (
                        <ShieldAlert className="w-4 h-4 text-destructive" />
                      ) : h.severidad === 'grave' ? (
                        <AlertTriangle className="w-4 h-4 text-zod" />
                      ) : (
                        <FileCheck className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm font-semibold text-foreground">{h.titulo}</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {h.severidad}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {h.paquetesAfectados} guías
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80">{h.descripcion}</p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">
                        📜 <span className="font-medium">{h.baseLegal}</span>
                      </p>
                    </div>
                    <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
                      <p className="text-xs text-destructive/80">
                        ⚖️ <span className="font-medium">Impacto en licencia:</span> {h.impactoLicencia}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary">
                        ✅ <span className="font-medium">Acción requerida:</span> {h.accionRequerida}
                      </p>
                    </div>
                    {h.guiasAfectadas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {h.guiasAfectadas.map(g => (
                          <Badge key={g} variant="outline" className="text-[10px] font-mono">{g}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Hash del informe */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-[10px] font-mono text-muted-foreground">
              Sello de Inexpugnabilidad — Informe ARS: {informeRiesgo.hashInforme.substring(0, 48)}...
            </p>
          </div>
        </TabsContent>

        {/* Notas Técnicas (Stella) */}
        <TabsContent value="normativa" className="space-y-4 mt-4">
          {/* Selector de categoría */}
          <div className="flex flex-wrap gap-2">
            {(['liquidacion', 'clasificacion', 'valoracion', 'origen', 'restriccion', 'responsabilidad', 'despacho', 'transporte'] as CategoriaLegal[]).map(cat => (
              <Button
                key={cat}
                variant={categoriaNotas === cat ? 'default' : 'outline'}
                size="sm"
                className="text-xs capitalize"
                onClick={() => setCategoriaNotas(cat)}
              >
                {cat.replace('_', ' ')}
              </Button>
            ))}
          </div>

          {/* TLC aplicable */}
          {tlcAplicable && (
            <Card className="glass-panel-stella">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-stella" />
                  <span className="text-sm font-medium text-stella">TLC Aplicable — Stella</span>
                </div>
                <p className="text-sm text-foreground/90 mb-2">{tlcAplicable.titulo}</p>
                <p className="text-xs text-foreground/70">{tlcAplicable.aplicacion}</p>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  {BaseNormativaPanama.citarBaseLegal(tlcAplicable)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notas técnicas */}
          {notasTecnicas.map(nota => (
            <Card key={nota.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{nota.titulo}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {nota.relevancia}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/80">{nota.resumen}</p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary mb-1 font-medium">📋 Aplicación práctica:</p>
                  <p className="text-xs text-foreground/70">{nota.aplicacion}</p>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  {BaseNormativaPanama.citarBaseLegal(nota)}
                </p>
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-center text-muted-foreground">
            Base normativa ZENITH: {BaseNormativaPanama.totalNotas} notas técnicas disponibles
          </p>
        </TabsContent>

        {/* Resumen Legal */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Scale className="w-5 h-5 text-primary" />
                Responsabilidad Solidaria del Corredor
              </CardTitle>
              <CardDescription>Ley 30 de 1984 — Marco Legal de Actuación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-foreground/90 leading-relaxed">{notaResponsabilidad.resumen}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Aplicación:</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{notaResponsabilidad.aplicacion}</p>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {BaseNormativaPanama.citarBaseLegal(notaResponsabilidad)}
              </p>
            </CardContent>
          </Card>

          {/* Notas del corredor */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <PenLine className="w-4 h-4 text-primary" />
                Notas del Corredor
              </CardTitle>
              <CardDescription>Observaciones que serán incluidas en el expediente</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notasCorredorText}
                onChange={(e) => setNotasCorredorText(e.target.value)}
                placeholder="Escriba aquí sus observaciones sobre el expediente..."
                className="min-h-[100px] bg-muted/30"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-center gap-6 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 text-stella" />
          <span>Consultoría Normativa por Stella Help</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3 text-zod" />
          <span>Blindaje Legal por Zod Integrity Engine</span>
        </div>
      </div>

      {/* Dialog de Firma */}
      <Dialog open={firmaDialogOpen} onOpenChange={setFirmaDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-panel-zod border-warning/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zod font-display">
              <Lock className="w-5 h-5" />
              Firma del Informe de Riesgo
            </DialogTitle>
            <DialogDescription>
              Conforme a la Ley 30 de 1984, Art. 12, su firma confirma que ha revisado los hallazgos
              y asume la responsabilidad solidaria sobre esta declaración.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-sm text-foreground/80">
                <strong>Hallazgos pendientes:</strong> {informeRiesgo.totalHallazgos} ({informeRiesgo.nivelRiesgoGlobal})
              </p>
              {informeRiesgo.hallazgos.filter(h => h.severidad !== 'advertencia').map(h => (
                <p key={h.id} className="text-xs text-muted-foreground mt-1">
                  • {h.titulo} ({h.severidad})
                </p>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-[10px] font-mono text-muted-foreground">
                Hash de auditoría: {informeRiesgo.hashInforme.substring(0, 48)}...
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic text-center">
              "Al firmar, declaro haber revisado el expediente y asumo la responsabilidad solidaria
              conforme al marco legal vigente."
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFirmaDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmarAprobacion}
              className="gap-2"
            >
              <PenLine className="w-4 h-4" />
              Firmar y Aprobar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
