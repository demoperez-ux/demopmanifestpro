// ============================================
// Página: Red de Cumplimiento LEXIS
// Órganos Anuentes, Base Legal, Defensa, VUCE
// ============================================

import React from 'react';
import { PanelAnuentesUNCAP } from '@/components/zenith/PanelAnuentesUNCAP';
import { ExpedienteDefensaPanel } from '@/components/zenith/ExpedienteDefensa';
import { PanelVUCE } from '@/components/zenith/PanelVUCE';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Scale, Building2, Leaf } from 'lucide-react';

export default function RedCumplimientoUNCAP() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Red de Cumplimiento LEXIS
            </h1>
            <p className="text-sm text-muted-foreground">
              Órganos Anuentes · Base Legal · Expediente de Defensa · VUCE/MICI
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="anuentes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="anuentes" className="gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              Órganos Anuentes
            </TabsTrigger>
            <TabsTrigger value="defensa" className="gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Expediente de Defensa
            </TabsTrigger>
            <TabsTrigger value="vuce" className="gap-1.5">
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
      </div>
    </div>
  );
}
