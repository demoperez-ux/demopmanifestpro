import { Header } from '@/components/manifest/Header';
import { HorizonteCarga } from '@/components/zenith/HorizonteCarga';

export default function HorizonteCargaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <HorizonteCarga />
      </main>
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-display tracking-wide">ZENITH — Copiloto de Inteligencia Aduanera</p>
          <p className="text-xs text-muted-foreground/50 mt-1">ZENITH Customs Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
}
