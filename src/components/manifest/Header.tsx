import { Plane, MapPin } from 'lucide-react';
import { COMPANY_INFO, DEVELOPER_INFO } from '@/lib/companyConfig';

export function Header() {
  return (
    <header className="border-b border-border bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{COMPANY_INFO.shortName}</h1>
              <p className="text-sm text-muted-foreground">
                Sistema de Gestión de Manifiestos de Carga Aérea
              </p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{COMPANY_INFO.location}</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Desarrollado por {DEVELOPER_INFO.name} • v{DEVELOPER_INFO.version}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
