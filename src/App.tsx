import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Historial from "./pages/Historial";
import DashboardManifiesto from "./pages/DashboardManifiesto";
import TestDeteccion from "./pages/TestDeteccion";
import BuscadorAranceles from "./pages/BuscadorAranceles";
import StellaInbox from "./pages/StellaInbox";
import HorizonteCarga from "./pages/HorizonteCarga";
import ConsultasClasificatoriasPage from "./pages/ConsultasClasificatorias";
import OnboardingCorredor from "./pages/OnboardingCorredor";
import LicenciamientoACA from "./pages/LicenciamientoACA";
import RedCumplimientoUNCAP from "./pages/RedCumplimientoUNCAP";
import PortalCorredorPage from "./pages/PortalCorredorPage";
import ZenithPulsePage from "./pages/ZenithPulsePage";
import ClientePortalPage from "./pages/ClientePortalPage";
import TaxSimulatorPage from "./pages/TaxSimulatorPage";
import LexisLogicEnginePage from "./pages/LexisLogicEnginePage";
import TLCKnowledgeBasePage from "./pages/TLCKnowledgeBasePage";
import CaucaRecaucaPage from "./pages/CaucaRecaucaPage";
import FlujoCourierPage from "./pages/FlujoCourierPage";
import LexisIngressPage from "./pages/LexisIngressPage";
import CourierHubPage from "./pages/CourierHubPage";
import EnterpriseBillingPage from "./pages/EnterpriseBillingPage";
import StressTestPage from "./pages/StressTestPage";
import CustomsShieldPage from "./pages/CustomsShieldPage";
import AboutZenithPage from "./pages/AboutZenithPage";
import ERPSyncHistoryPage from "./pages/ERPSyncHistoryPage";
import SIGAGatewayPage from "./pages/SIGAGatewayPage";
import SecurityAdminPage from "./pages/SecurityAdminPage";
import DataIntegrityPage from "./pages/DataIntegrityPage";
import IdentityCommandPage from "./pages/IdentityCommandPage";
import SystemHealthPage from "./pages/SystemHealthPage";
import NotFound from "./pages/NotFound";
import { ProtectorDatos } from "@/lib/seguridad/encriptacion";

const queryClient = new QueryClient();

function ProtectedWithLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App: React.FC = () => {
  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      try {
        if (mounted) {
          await ProtectorDatos.inicializarSesion();
        }
      } catch (error) {
        console.warn('Error inicializando sesión de seguridad');
      }
    };
    initSession();
    return () => {
      mounted = false;
      ProtectorDatos.limpiarSesion();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      ProtectorDatos.limpiarSesion();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              {/* Dashboard — acceso para todos los roles autenticados */}
              <Route path="/" element={<ProtectedWithLayout><Index /></ProtectedWithLayout>} />
              
              {/* Operaciones — master_admin, senior_broker, asistente */}
              <Route path="/horizonte-carga" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><HorizonteCarga /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/lexis-ingress" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><LexisIngressPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/courier-hub" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><CourierHubPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/flujo-courier" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><FlujoCourierPage /></AppLayout>
                </ProtectedRoute>
              } />
              
              {/* SIGA Gateway — Solo corredor y admin */}
              <Route path="/siga-gateway" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><SIGAGatewayPage /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Inteligencia — operaciones + lectura */}
              <Route path="/lexis-engine" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><LexisLogicEnginePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/aranceles" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><BuscadorAranceles /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tax-simulator" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker', 'asistente']}>
                  <AppLayout><TaxSimulatorPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cauca-recauca" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><CaucaRecaucaPage /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Auditoría — admin, it_security, senior_broker */}
              <Route path="/customs-shield" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security', 'senior_broker']}>
                  <AppLayout><CustomsShieldPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/data-integrity" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security']}>
                  <AppLayout><DataIntegrityPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/erp-sync-history" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security', 'senior_broker']}>
                  <AppLayout><ERPSyncHistoryPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/historial" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security', 'senior_broker']}>
                  <AppLayout><Historial /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/consultas-clasificatorias" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security', 'senior_broker']}>
                  <AppLayout><ConsultasClasificatoriasPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/stress-test" element={
                <ProtectedRoute allowedRoles={['master_admin']}>
                  <AppLayout><StressTestPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/system-health" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security']}>
                  <AppLayout><SystemHealthPage /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Gestión */}
              <Route path="/enterprise-billing" element={
                <ProtectedRoute allowedRoles={['master_admin']}>
                  <AppLayout><EnterpriseBillingPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/licenciamiento-aca" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><LicenciamientoACA /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/about" element={<ProtectedWithLayout><AboutZenithPage /></ProtectedWithLayout>} />

              {/* Administración */}
              <Route path="/onboarding-corredor" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><OnboardingCorredor /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/red-cumplimiento" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><RedCumplimientoUNCAP /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/portal-corredor" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><PortalCorredorPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tlc-knowledge" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><TLCKnowledgeBasePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/zenith-pulse" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><ZenithPulsePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/security-admin" element={
                <ProtectedRoute allowedRoles={['master_admin', 'it_security']}>
                  <AppLayout><SecurityAdminPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/identity-command" element={
                <ProtectedRoute allowedRoles={['master_admin']}>
                  <AppLayout><IdentityCommandPage /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Misc — acceso general */}
              <Route path="/stella-inbox" element={<ProtectedWithLayout><StellaInbox /></ProtectedWithLayout>} />
              <Route path="/dashboard/:manifiestoId" element={<ProtectedWithLayout><DashboardManifiesto /></ProtectedWithLayout>} />
              <Route path="/test-deteccion" element={
                <ProtectedRoute allowedRoles={['master_admin', 'senior_broker']}>
                  <AppLayout><TestDeteccion /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cliente-portal" element={<ProtectedWithLayout><ClientePortalPage /></ProtectedWithLayout>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
