import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Shield } from 'lucide-react';
import StressTestControlTower from '@/components/demo/StressTestControlTower';
import SovereigntyStressTest from '@/components/demo/SovereigntyStressTest';

export default function StressTestPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Tabs defaultValue="sovereignty">
        <TabsList>
          <TabsTrigger value="sovereignty" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Stress Test de Soberanía
          </TabsTrigger>
          <TabsTrigger value="classic" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Auditoría Masiva Clásica
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sovereignty" className="mt-6">
          <SovereigntyStressTest />
        </TabsContent>
        <TabsContent value="classic" className="mt-6">
          <StressTestControlTower />
        </TabsContent>
      </Tabs>
    </div>
  );
}
