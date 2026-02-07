// ============================================
// Página: Red de Cumplimiento UNCAP
// Órganos Anuentes, Base Legal, Defensa, VUCE
// ============================================

import React, { useState } from 'react';
import { Header } from '@/components/manifest/Header';
import { PanelAnuentesUNCAP } from '@/components/zenith/PanelAnuentesUNCAP';
import { ExpedienteDefensaPanel } from '@/components/zenith/ExpedienteDefensa';
import { PanelVUCE } from '@/components/zenith/PanelVUCE';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Scale, Building2, Leaf } from 'lucide-react';

export default function RedCumplimientoUNCAP() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground tracking-wide">
              Red de Cumplimiento UNCAP
            </h1>
            <p className="text-xs text-muted-foreground">
              Órganos Anuentes · Base Legal · Expediente de Defensa · VUCE/MICI
            </p>
          </div>
        </div>

        <Tabs defaultValue="anuentes" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="anuentes" className="gap-1.5 data-[state=active]:bg-primary/10">
              <Leaf className="w-3.5 h-3.5" />
              Órganos Anuentes
            </TabsTrigger>
            <TabsTrigger value="defensa" className="gap-1.5 data-[state=active]:bg-warning/10">
              <Scale className="w-3.5 h-3.5" />
              Expediente de Defensa
            </TabsTrigger>
            <TabsTrigger value="vuce" className="gap-1.5 data-[state=active]:bg-primary/10">
              <Building2 className="w-3.5 h-3.5" />
              VUCE / MICI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anuentes">
            <PanelAnuentesUNCAP />
          </TabsContent>

          <TabsContent value="defensa">
            <ExpedienteDefensaPanel />
          </TabsContent>

          <TabsContent value="vuce">
            <PanelVUCE />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
