// ============================================
// Página: Dashboard de Licenciamiento ACA (SOP-ACA-001)
// ============================================

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/manifest/Header';
import { CarpetaMaestraPanel } from '@/components/licenciamiento/CarpetaMaestraPanel';
import { AnexoCFormulario } from '@/components/licenciamiento/AnexoCFormulario';
import { SimuladorExamenTecnico } from '@/components/licenciamiento/SimuladorExamenTecnico';
import { KPILicenciamientoWidget } from '@/components/licenciamiento/KPILicenciamientoWidget';
import { StellaNotificacionesPanel } from '@/components/licenciamiento/StellaNotificacionesPanel';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Award, FolderOpen, Shield, BookOpen, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  zodAuditarVigenciaDocumentos,
  stellaGenerarNotificacionesFase,
  type ZodDocumentAudit,
} from '@/lib/licenciamiento/MotorLicenciamientoACA';
import { ETAPAS_SOP, type ProcesoOnboarding } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// Demo Data
// ============================================
const DEMO_PROCESO: ProcesoOnboarding = {
  id: 'lic-001',
  corredorNombre: 'Carlos A. Méndez Rivera',
  corredorCedula: '8-888-2345',
  corredorEmail: 'cmendez@logistica.pa',
  corredorTelefono: '+507-6789-0123',
  empresaNombre: 'Logística Integral Panamá, S.A.',
  empresaRuc: '155678901-2-2024',
  etapaActual: 3,
  estado: 'en_progreso',
  montoFianza: 50000,
  tipoFianza: 'Fianza de Corredor (Art. 80 DL 1)',
  estadoFianza: 'pendiente',
  documentCompletenessScore: 55,
  riskScore: 30,
  controlPoints: {
    'CP-0': { id: 'CP-0', etapa: 0, nombre: 'Solicitud', descripcion: '', requisitos: [], estado: 'aprobado' },
    'CP-1': { id: 'CP-1', etapa: 1, nombre: 'Identidad', descripcion: '', requisitos: [], estado: 'aprobado' },
    'CP-2': { id: 'CP-2', etapa: 2, nombre: 'Idoneidad', descripcion: '', requisitos: [], estado: 'aprobado' },
    'CP-3': { id: 'CP-3', etapa: 3, nombre: 'Fianza', descripcion: '', requisitos: [], estado: 'pendiente' },
  },
  slaTimestamps: {
    0: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    1: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    2: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    3: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  createdBy: 'demo-user',
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEMO_DOCUMENTOS = [
  { id: 'doc-001', nombre: 'Formulario KYC', tipo: 'formulario_kyc', fechaEmision: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), estado: 'vigente' },
  { id: 'doc-002', nombre: 'Cédula de Identidad', tipo: 'cedula_identidad', fechaEmision: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), estado: 'vigente' },
  { id: 'doc-003', nombre: 'Récord Policivo', tipo: 'antecedentes_penales', fechaEmision: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), estado: 'vencido' },
  { id: 'doc-004', nombre: 'Foto Carnet', tipo: 'foto_carnet', fechaEmision: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), estado: 'vigente' },
  { id: 'doc-005', nombre: 'Certificado de Idoneidad ANA', tipo: 'certificado_idoneidad', fechaEmision: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), estado: 'vigente' },
  { id: 'doc-006', nombre: 'Curriculum Vitae', tipo: 'curriculum_vitae', estado: 'vigente' },
];

const DEMO_PROCESOS_HISTORICOS: ProcesoOnboarding[] = [
  DEMO_PROCESO,
  {
    ...DEMO_PROCESO,
    id: 'lic-002',
    corredorNombre: 'Ana B. Delgado Pérez',
    corredorCedula: '3-777-1234',
    etapaActual: 8,
    estado: 'aprobado',
    documentCompletenessScore: 100,
    riskScore: 10,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    slaTimestamps: {
      0: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      1: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      2: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      3: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      4: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      5: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      6: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      7: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      8: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    ...DEMO_PROCESO,
    id: 'lic-003',
    corredorNombre: 'Roberto C. Fernández',
    corredorCedula: '6-555-9876',
    etapaActual: 5,
    estado: 'en_progreso',
    documentCompletenessScore: 72,
    riskScore: 45,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    slaTimestamps: {
      0: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      1: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      2: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      3: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      4: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      5: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
];

const DEMO_AUDIT_LOGS = [
  { procesoId: 'lic-002', accion: 'documento_rechazado', fecha: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), etapa: 2 },
  { procesoId: 'lic-002', accion: 'subsanacion_completada', fecha: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), etapa: 2 },
];

export default function LicenciamientoACAPage() {
  const { role } = useAuth();
  const [selectedEtapa, setSelectedEtapa] = useState(DEMO_PROCESO.etapaActual);
  const [selectedFolder, setSelectedFolder] = useState(DEMO_PROCESO.etapaActual);
  const [anexoFirmado, setAnexoFirmado] = useState(false);

  const cpStatusMap = useMemo(() => {
    const map: Record<string, 'pendiente' | 'aprobado' | 'bloqueado'> = {};
    Object.entries(DEMO_PROCESO.controlPoints).forEach(([key, cp]) => {
      map[key] = cp.estado;
    });
    return map;
  }, []);

  // Zod Document Auditing
  const auditorias = useMemo(() => zodAuditarVigenciaDocumentos(DEMO_DOCUMENTOS), []);

  // Stella Notifications
  const notificaciones = useMemo(
    () => stellaGenerarNotificacionesFase(DEMO_PROCESO, auditorias),
    [auditorias]
  );

  // Documents by phase
  const documentosPorFase = useMemo(() => {
    const map: Record<number, { nombre: string; tipo: string; estado: string }[]> = {};
    for (const etapa of ETAPAS_SOP) {
      map[etapa.id] = DEMO_DOCUMENTOS
        .filter(d => etapa.documentosRequeridos.includes(d.tipo as any))
        .map(d => ({ nombre: d.nombre, tipo: d.tipo, estado: d.estado }));
    }
    return map;
  }, []);

  // Zod blocked phases
  const zodBloqueados = useMemo(() => {
    return auditorias.filter(a => a.bloqueaFase);
  }, [auditorias]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground tracking-wide">
                Licenciamiento ACA
              </h1>
              <p className="text-xs text-muted-foreground">
                SOP-ACA-001 · Gestión de Idoneidad · {DEMO_PROCESO.corredorNombre}
              </p>
            </div>
          </div>
          {zodBloqueados.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Shield className="w-3 h-3" />
              {zodBloqueados.length} documento(s) vencido(s)
            </Badge>
          )}
        </div>

        {/* Zod Blocking Alert */}
        {zodBloqueados.length > 0 && (
          <div className="glass-panel-zod p-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-zod" />
              <span className="text-sm font-semibold text-zod-light">Veredicto de Zod — Documentos Vencidos</span>
            </div>
            <div className="space-y-2">
              {zodBloqueados.map(audit => (
                <div key={audit.documentoId} className="text-sm text-foreground/80">
                  {audit.veredicto}
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="dashboard" className="gap-2 text-xs">
              <FolderOpen className="w-3.5 h-3.5" />
              Carpeta Maestra
            </TabsTrigger>
            <TabsTrigger value="anexo-c" className="gap-2 text-xs">
              <Shield className="w-3.5 h-3.5" />
              Anexo C
            </TabsTrigger>
            <TabsTrigger value="examen" className="gap-2 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Examen Técnico
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-2 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              KPIs
            </TabsTrigger>
          </TabsList>

          {/* Tab: Dashboard / Carpeta Maestra */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Stepper */}
              <div className="lg:col-span-3">
                <div className="card-elevated sticky top-6">
                  <OnboardingStepper
                    etapaActual={DEMO_PROCESO.etapaActual}
                    slaTimestamps={DEMO_PROCESO.slaTimestamps}
                    controlPointsStatus={cpStatusMap}
                    onSelectEtapa={(etapa) => {
                      setSelectedEtapa(etapa);
                      setSelectedFolder(etapa);
                    }}
                    selectedEtapa={selectedEtapa}
                  />
                </div>
              </div>

              {/* Center: Carpeta Maestra */}
              <div className="lg:col-span-5">
                <CarpetaMaestraPanel
                  etapaActual={DEMO_PROCESO.etapaActual}
                  auditorias={auditorias}
                  documentosPorFase={documentosPorFase}
                  onSelectFolder={setSelectedFolder}
                  selectedFolder={selectedFolder}
                />

                {/* Zod Audit Details for selected folder */}
                {auditorias.filter(a => a.faseAfectada === selectedFolder).length > 0 && (
                  <div className="mt-4 card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-zod" />
                      <span className="text-sm font-semibold text-foreground">
                        Auditoría Zod — Carpeta {String(selectedFolder).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {auditorias
                        .filter(a => a.faseAfectada === selectedFolder)
                        .map(audit => (
                          <div
                            key={audit.documentoId}
                            className={cn(
                              'p-3 rounded-lg border text-sm',
                              audit.estado === 'vencido' && 'border-destructive/30 bg-destructive/5 text-destructive',
                              audit.estado === 'por_vencer' && 'border-warning/30 bg-warning/5 text-warning',
                              audit.estado === 'vigente' && 'border-success/30 bg-success/5 text-success',
                            )}
                          >
                            <p className="font-medium">{audit.nombreDocumento}</p>
                            <p className="text-xs mt-1 opacity-80">
                              Emitido hace {audit.diasDesdeEmision} días · Límite: {audit.limiteVigenciaDias} días
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Stella */}
              <div className="lg:col-span-4">
                <div className="sticky top-6">
                  <StellaNotificacionesPanel
                    notificaciones={notificaciones}
                    onAccion={(id) => console.log('Acción Stella:', id)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Anexo C */}
          <TabsContent value="anexo-c">
            <div className="max-w-3xl mx-auto">
              <AnexoCFormulario
                procesoId={DEMO_PROCESO.id}
                corredorNombre={DEMO_PROCESO.corredorNombre}
                corredorCedula={DEMO_PROCESO.corredorCedula}
                onFirmado={(hash) => {
                  setAnexoFirmado(true);
                  console.log('[AUDIT] Anexo C firmado:', hash);
                }}
                firmado={anexoFirmado}
              />
            </div>
          </TabsContent>

          {/* Tab: Examen Técnico */}
          <TabsContent value="examen">
            <div className="max-w-3xl mx-auto">
              <SimuladorExamenTecnico />
            </div>
          </TabsContent>

          {/* Tab: KPIs */}
          <TabsContent value="kpis">
            <div className="max-w-4xl mx-auto">
              <KPILicenciamientoWidget
                procesos={DEMO_PROCESOS_HISTORICOS}
                auditLogs={DEMO_AUDIT_LOGS}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
