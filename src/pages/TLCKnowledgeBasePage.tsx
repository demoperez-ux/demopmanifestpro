import { TLCKnowledgeBase } from '@/components/aranceles/TLCKnowledgeBase';

export default function TLCKnowledgeBasePage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Administración de Acuerdos Comerciales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargue y actualice la base de conocimiento de tratados de libre comercio para optimizar el motor de estrategia fiscal.
        </p>
      </div>
      <TLCKnowledgeBase />
    </div>
  );
}
