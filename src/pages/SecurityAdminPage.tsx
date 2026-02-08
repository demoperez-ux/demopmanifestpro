// ============================================
// SecurityAdminPage - Página de Administración de Seguridad
// Enterprise Security Layer
// ============================================

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityAdminDashboard } from '@/components/security/SecurityAdminDashboard';
import { MFASetup } from '@/components/security/MFASetup';
import { Shield, Lock } from 'lucide-react';

const SecurityAdminPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1">
            <Shield className="h-3.5 w-3.5" /> Panel de Seguridad
          </TabsTrigger>
          <TabsTrigger value="mfa" className="gap-1">
            <Lock className="h-3.5 w-3.5" /> MFA Personal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <SecurityAdminDashboard />
        </TabsContent>

        <TabsContent value="mfa" className="mt-6">
          <MFASetup />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityAdminPage;
