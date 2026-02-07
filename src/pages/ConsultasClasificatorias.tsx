/**
 * Consultas Clasificatorias — Resoluciones Anticipadas
 * Art. 3 AFC (OMC) — Transparencia
 */

import { Header } from '@/components/manifest/Header';
import { ConsultasClasificatorias } from '@/components/zenith/ConsultasClasificatorias';

export default function ConsultasClasificatoriasPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <ConsultasClasificatorias />
      </main>
    </div>
  );
}
