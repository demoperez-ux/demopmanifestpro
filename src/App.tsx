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
              
              <Route path="/" element={<ProtectedWithLayout><Index /></ProtectedWithLayout>} />
              <Route path="/historial" element={<ProtectedWithLayout><Historial /></ProtectedWithLayout>} />
              <Route path="/test-deteccion" element={
                <ProtectedRoute allowedRoles={['admin', 'revisor']}>
                  <AppLayout><TestDeteccion /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/:manifiestoId" element={<ProtectedWithLayout><DashboardManifiesto /></ProtectedWithLayout>} />
              <Route path="/aranceles" element={<ProtectedWithLayout><BuscadorAranceles /></ProtectedWithLayout>} />
              <Route path="/stella-inbox" element={<ProtectedWithLayout><StellaInbox /></ProtectedWithLayout>} />
              <Route path="/horizonte-carga" element={<ProtectedWithLayout><HorizonteCarga /></ProtectedWithLayout>} />
              <Route path="/consultas-clasificatorias" element={<ProtectedWithLayout><ConsultasClasificatoriasPage /></ProtectedWithLayout>} />
              <Route path="/onboarding-corredor" element={<ProtectedWithLayout><OnboardingCorredor /></ProtectedWithLayout>} />
              <Route path="/licenciamiento-aca" element={<ProtectedWithLayout><LicenciamientoACA /></ProtectedWithLayout>} />
              <Route path="/red-cumplimiento" element={<ProtectedWithLayout><RedCumplimientoUNCAP /></ProtectedWithLayout>} />
              <Route path="/portal-corredor" element={
                <ProtectedRoute allowedRoles={['revisor', 'admin']}>
                  <AppLayout><PortalCorredorPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/zenith-pulse" element={<ProtectedWithLayout><ZenithPulsePage /></ProtectedWithLayout>} />
              <Route path="/cliente-portal" element={<ProtectedWithLayout><ClientePortalPage /></ProtectedWithLayout>} />
              <Route path="/tax-simulator" element={<ProtectedWithLayout><TaxSimulatorPage /></ProtectedWithLayout>} />
              <Route path="/lexis-engine" element={<ProtectedWithLayout><LexisLogicEnginePage /></ProtectedWithLayout>} />
              <Route path="/tlc-knowledge" element={
                <ProtectedRoute allowedRoles={['revisor', 'admin']}>
                  <AppLayout><TLCKnowledgeBasePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cauca-recauca" element={<ProtectedWithLayout><CaucaRecaucaPage /></ProtectedWithLayout>} />
              <Route path="/lexis-ingress" element={<ProtectedWithLayout><LexisIngressPage /></ProtectedWithLayout>} />
              <Route path="/flujo-courier" element={<ProtectedWithLayout><FlujoCourierPage /></ProtectedWithLayout>} />
              <Route path="/courier-hub" element={<ProtectedWithLayout><CourierHubPage /></ProtectedWithLayout>} />
              <Route path="/enterprise-billing" element={<ProtectedWithLayout><EnterpriseBillingPage /></ProtectedWithLayout>} />
              <Route path="/stress-test" element={<ProtectedWithLayout><StressTestPage /></ProtectedWithLayout>} />
              <Route path="/customs-shield" element={<ProtectedWithLayout><CustomsShieldPage /></ProtectedWithLayout>} />
              <Route path="/about" element={<ProtectedWithLayout><AboutZenithPage /></ProtectedWithLayout>} />
              <Route path="/erp-sync-history" element={<ProtectedWithLayout><ERPSyncHistoryPage /></ProtectedWithLayout>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
