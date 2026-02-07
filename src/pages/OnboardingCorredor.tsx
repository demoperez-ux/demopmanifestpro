// ============================================
// Página principal: Onboarding de Corredor (SOP-ACA-001)
// ============================================

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/manifest/Header';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { ControlCenterDashboard } from '@/components/onboarding/ControlCenterDashboard';
import { EtapaDetailPanel } from '@/components/onboarding/EtapaDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type ProcesoOnboarding, 
  type TipoDocumento,
  ETAPAS_SOP 
} from '@/types/onboarding';
import {
  calcularCompletenessScore,
  calcularRiskScore,
} from '@/lib/onboarding/MotorOnboardingCorredor';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// Demo data for initial render
// ============================================
const DEMO_PROCESO: ProcesoOnboarding = {
  id: 'demo-001',
  corredorNombre: 'Carlos A. Méndez Rivera',
  corredorCedula: '8-888-2345',
  corredorEmail: 'cmendez@logistica.pa',
  corredorTelefono: '+507-6789-0123',
  empresaNombre: 'Logística Integral Panamá, S.A.',
  empresaRuc: '155678901-2-2024',
  etapaActual: 2,
  estado: 'en_progreso',
  montoFianza: 50000,
  tipoFianza: 'Fianza de Corredor (Art. 80 DL 1)',
  estadoFianza: 'pendiente',
  documentCompletenessScore: 45,
  riskScore: 35,
  controlPoints: {
    'CP-0': { id: 'CP-0', etapa: 0, nombre: 'Solicitud', descripcion: '', requisitos: [], estado: 'aprobado' },
    'CP-1': { id: 'CP-1', etapa: 1, nombre: 'Identidad', descripcion: '', requisitos: [], estado: 'aprobado' },
    'CP-2': { id: 'CP-2', etapa: 2, nombre: 'Idoneidad', descripcion: '', requisitos: [], estado: 'pendiente' },
  },
  slaTimestamps: {
    0: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    1: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    2: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  createdBy: 'demo-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEMO_DOCUMENTOS = [
  { tipoDocumento: 'formulario_kyc', nombreDocumento: 'KYC_CMendez.pdf', aiConfidence: 98, zodValidado: true, requiereRevisionManual: false },
  { tipoDocumento: 'cedula_identidad', nombreDocumento: 'Cedula_8-888-2345.pdf', aiConfidence: 96, zodValidado: true, requiereRevisionManual: false },
  { tipoDocumento: 'antecedentes_penales', nombreDocumento: 'Antecedentes_Penales.pdf', aiConfidence: 91, zodValidado: false, requiereRevisionManual: true },
  { tipoDocumento: 'foto_carnet', nombreDocumento: 'Foto_Carnet.jpg', aiConfidence: 99, zodValidado: true, requiereRevisionManual: false },
  { tipoDocumento: 'certificado_idoneidad', nombreDocumento: 'Idoneidad_ANA.pdf', aiConfidence: 87, zodValidado: false, requiereRevisionManual: true },
];

export default function OnboardingCorredor() {
  const { role } = useAuth();
  const [selectedEtapa, setSelectedEtapa] = useState(2);
  const [proceso, setProceso] = useState<ProcesoOnboarding>(DEMO_PROCESO);
  const [documentos, setDocumentos] = useState(DEMO_DOCUMENTOS);
  const [showNewForm, setShowNewForm] = useState(false);

  const pendingReviews = useMemo(
    () => documentos.filter(d => d.requiereRevisionManual).length,
    [documentos]
  );

  const cpStatusMap = useMemo(() => {
    const map: Record<string, 'pendiente' | 'aprobado' | 'bloqueado'> = {};
    Object.entries(proceso.controlPoints).forEach(([key, cp]) => {
      map[key] = cp.estado;
    });
    return map;
  }, [proceso.controlPoints]);

  const handleApproveCP = (cpId: string, motivo: string) => {
    const etapaIdx = parseInt(cpId.replace('CP-', ''));
    setProceso(prev => ({
      ...prev,
      etapaActual: etapaIdx + 1,
      controlPoints: {
        ...prev.controlPoints,
        [cpId]: {
          ...prev.controlPoints[cpId],
          id: cpId,
          etapa: etapaIdx,
          nombre: ETAPAS_SOP[etapaIdx]?.nombre || '',
          descripcion: '',
          requisitos: [],
          estado: 'aprobado' as const,
        },
        [`CP-${etapaIdx + 1}`]: {
          id: `CP-${etapaIdx + 1}`,
          etapa: etapaIdx + 1,
          nombre: ETAPAS_SOP[etapaIdx + 1]?.nombre || '',
          descripcion: '',
          requisitos: [],
          estado: 'pendiente' as const,
        },
      },
      slaTimestamps: {
        ...prev.slaTimestamps,
        [etapaIdx + 1]: new Date().toISOString(),
      },
    }));
    setSelectedEtapa(etapaIdx + 1);
    console.log(`[AUDIT] CP ${cpId} aprobado. Motivo: ${motivo}`);
  };

  const handleDocumentUpload = (file: File, tipo: TipoDocumento) => {
    const aiScore = 85 + Math.random() * 15;
    const needsReview = aiScore < 95;
    setDocumentos(prev => [
      ...prev,
      {
        tipoDocumento: tipo,
        nombreDocumento: file.name,
        aiConfidence: aiScore,
        zodValidado: !needsReview,
        requiereRevisionManual: needsReview,
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground tracking-wide">
                Onboarding de Corredor
              </h1>
              <p className="text-xs text-muted-foreground">
                SOP-ACA-001 · Control Center
              </p>
            </div>
          </div>
          {(role === 'admin' || role === 'revisor') && (
            <Button
              onClick={() => setShowNewForm(!showNewForm)}
              className="btn-primary gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proceso
            </Button>
          )}
        </div>

        {/* New Process Form (simplified) */}
        {showNewForm && (
          <div className="card-elevated p-6 mb-6 animate-fade-in">
            <h3 className="text-sm font-semibold mb-4">Iniciar Nuevo Proceso de Onboarding</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Nombre del Corredor</Label>
                <Input placeholder="Nombre completo" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Cédula / Pasaporte</Label>
                <Input placeholder="8-888-8888" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="correo@ejemplo.com" className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="btn-primary" onClick={() => setShowNewForm(false)}>
                Crear Proceso
              </Button>
            </div>
          </div>
        )}

        {/* Main Layout: Stepper + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Vertical Stepper */}
          <div className="lg:col-span-3">
            <div className="card-elevated sticky top-6">
              <OnboardingStepper
                etapaActual={proceso.etapaActual}
                slaTimestamps={proceso.slaTimestamps}
                controlPointsStatus={cpStatusMap}
                onSelectEtapa={setSelectedEtapa}
                selectedEtapa={selectedEtapa}
              />
            </div>
          </div>

          {/* Center: Etapa Detail */}
          <div className="lg:col-span-5">
            <EtapaDetailPanel
              etapaId={selectedEtapa}
              proceso={proceso}
              documentos={documentos}
              onApproveCP={handleApproveCP}
              onDocumentUpload={handleDocumentUpload}
            />
          </div>

          {/* Right: Control Center Dashboard */}
          <div className="lg:col-span-4">
            <div className="sticky top-6">
              <ControlCenterDashboard
                proceso={proceso}
                documentCount={documentos.length}
                pendingReviews={pendingReviews}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
