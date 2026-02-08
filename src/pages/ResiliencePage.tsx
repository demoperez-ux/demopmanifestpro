import { Header } from '@/components/manifest/Header';
import ResilienceDashboard from '@/components/resilience/ResilienceDashboard';

export default function ResiliencePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <ResilienceDashboard />
      </main>
    </div>
  );
}
