import { Header } from '@/components/manifest/Header';
import ERPSyncHistoryDashboard from '@/components/erp/ERPSyncHistoryDashboard';

export default function ERPSyncHistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <ERPSyncHistoryDashboard />
      </main>
    </div>
  );
}
