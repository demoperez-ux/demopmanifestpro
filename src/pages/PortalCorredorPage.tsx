import { Header } from '@/components/manifest/Header';
import { DashboardCorredorAprobaciones } from '@/components/zenith/DashboardCorredorAprobaciones';
import { ReporteAuditoriaZod } from '@/components/zenith/ReporteAuditoriaZod';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, ClipboardList, Shield } from 'lucide-react';

export default function PortalCorredorPage() {
  const { role } = useAuth();
  const esCorredor = role === 'revisor' || role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!esCorredor && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Acceso restringido al Portal del Corredor
              </p>
              <p className="text-xs text-muted-foreground">
                Esta sección requiere el rol de Corredor de Aduana (Validador). 
                Tu rol actual es: <Badge variant="outline" className="ml-1">{role || 'Sin rol'}</Badge>
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="aprobaciones">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="aprobaciones" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Aprobaciones
            </TabsTrigger>
            <TabsTrigger value="auditoria-zod" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Auditoría Zod
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aprobaciones">
            <DashboardCorredorAprobaciones />
          </TabsContent>

          <TabsContent value="auditoria-zod">
            <ReporteAuditoriaZod />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-display tracking-wide">ZENITH — Copiloto de Inteligencia Aduanera</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Fase 10% — Veredicto Profesional del Corredor — Powered by Orion Freight System
          </p>
        </div>
      </footer>
    </div>
  );
}
