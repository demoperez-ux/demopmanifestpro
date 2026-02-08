import { Header } from '@/components/manifest/Header';
import { ZenithPulseDashboard } from '@/components/zenith/ZenithPulseDashboard';

export default function ZenithPulsePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <ZenithPulseDashboard />
      </main>
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-display tracking-wide">ZENITH — Copiloto de Inteligencia Aduanera</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Zenith Pulse — Panel Financiero y Operativo — Powered by Orion Freight System
          </p>
        </div>
      </footer>
    </div>
  );
}
