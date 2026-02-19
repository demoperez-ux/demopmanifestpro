import { Header } from '@/components/manifest/Header';
import { ZenithPulseDashboard } from '@/components/zenith/ZenithPulseDashboard';
import { PreInvoiceTemplate } from '@/components/zenith/PreInvoiceTemplate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, FileText } from 'lucide-react';

export default function ZenithPulsePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="pulse">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="pulse" className="gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" /> Zenith Pulse
            </TabsTrigger>
            <TabsTrigger value="prefactura" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Pre-Factura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pulse">
            <ZenithPulseDashboard />
          </TabsContent>

          <TabsContent value="prefactura">
            <PreInvoiceTemplate />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-display tracking-wide">ZENITH — Copiloto de Inteligencia Aduanera</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Zenith Pulse — Panel Financiero y Operativo
          </p>
        </div>
      </footer>
    </div>
  );
}
