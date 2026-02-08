// ============================================
// SIGA GATEWAY DASHBOARD
// Nodo de Comunicación con el Sistema Integrado
// de Gestión Aduanera — Panel Unificado
// ============================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, FileKey2, Archive, Radio } from 'lucide-react';
import MonitorTransmisionSIGA from './MonitorTransmisionSIGA';
import FirmaElectronicaPanel from './FirmaElectronicaPanel';
import BovedaBoletasSIGA from './BovedaBoletasSIGA';

export default function SIGAGatewayDashboard() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SIGA Gateway</h1>
              <p className="text-xs text-muted-foreground">
                Nodo de Comunicación — Sistema Integrado de Gestión Aduanera
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 border-success/30 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Conexión Activa
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            OMA Standard v3.2
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="transmision" className="w-full">
        <TabsList className="h-9 w-full md:w-auto">
          <TabsTrigger value="transmision" className="text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Transmisión
          </TabsTrigger>
          <TabsTrigger value="firma" className="text-xs gap-1.5">
            <FileKey2 className="w-3.5 h-3.5" />
            Firma Digital
          </TabsTrigger>
          <TabsTrigger value="boletas" className="text-xs gap-1.5">
            <Archive className="w-3.5 h-3.5" />
            Bóveda de Boletas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transmision" className="mt-4">
          <MonitorTransmisionSIGA />
        </TabsContent>

        <TabsContent value="firma" className="mt-4">
          <div className="max-w-md">
            <FirmaElectronicaPanel />
          </div>
        </TabsContent>

        <TabsContent value="boletas" className="mt-4">
          <BovedaBoletasSIGA />
        </TabsContent>
      </Tabs>
    </div>
  );
}
