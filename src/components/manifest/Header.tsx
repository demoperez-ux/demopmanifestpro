import { MapPin, History, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { COMPANY_INFO, DEVELOPER_INFO } from '@/lib/companyConfig';
import { Button } from '@/components/ui/button';
import logoPassarex from '@/assets/logo-pasarex.png';

export function Header() {
  const location = useLocation();
  const isHistorial = location.pathname === '/historial';

  return (
    <header className="border-b border-border bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img 
                src={logoPassarex} 
                alt="Pasarex - Logística de confianza" 
                className="h-10 md:h-12 w-auto"
              />
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link to="/">
                <Button 
                  variant={!isHistorial ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Button>
              </Link>
              <Link to="/historial">
                <Button 
                  variant={isHistorial ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Historial
                </Button>
              </Link>
            </nav>
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
