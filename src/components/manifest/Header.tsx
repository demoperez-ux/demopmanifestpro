import { Anchor, BookOpen, History, Home, Inbox, Shield, Sparkles, UserPlus, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { COMPANY_INFO, PLATFORM_INFO } from '@/lib/companyConfig';
import { Button } from '@/components/ui/button';

export function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isHistorial = location.pathname === '/historial';
  const isInbox = location.pathname === '/stella-inbox';
  const isHorizonte = location.pathname === '/horizonte-carga';
  const isConsultas = location.pathname === '/consultas-clasificatorias';
  const isOnboarding = location.pathname === '/onboarding-corredor';
  const isCumplimiento = location.pathname === '/red-cumplimiento';

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md shadow-lg zenith-border-glow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-4 group">
              {/* ZENITH Logo Mark */}
              <div className="relative">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary/20 via-background to-warning/20 border border-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 zenith-glow">
                  <span className="text-2xl md:text-3xl font-bold font-display text-gradient">Z</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <Shield className="w-3 h-3" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold font-display text-gradient tracking-wider">ZENITH</span>
                <span className="text-xs font-medium text-muted-foreground tracking-wide">{COMPANY_INFO.tagline}</span>
                <span className="text-[10px] text-muted-foreground/50 tracking-wider">{PLATFORM_INFO.role}</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-2 ml-6 border-l border-border pl-6">
              <Link to="/">
                <Button 
                  variant={isHome ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Button>
              </Link>
              <Link to="/horizonte-carga">
                <Button 
                  variant={isHorizonte ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <Anchor className="h-4 w-4" />
                  Horizonte
                </Button>
              </Link>
              <Link to="/stella-inbox">
                <Button 
                  variant={isInbox ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <Inbox className="h-4 w-4" />
                  Stella's Inbox
                </Button>
              </Link>
              <Link to="/historial">
                <Button 
                  variant={isHistorial ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Historial
                </Button>
              </Link>
              <Link to="/consultas-clasificatorias">
                <Button 
                  variant={isConsultas ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Consultas
                </Button>
              </Link>
              <Link to="/onboarding-corredor">
                <Button 
                  variant={isOnboarding ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Onboarding
                </Button>
              </Link>
              <Link to="/red-cumplimiento">
                <Button 
                  variant={isCumplimiento ? 'default' : 'ghost'} 
                  size="sm" 
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  UNCAP
                </Button>
              </Link>
            </nav>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            {/* Engine indicators */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3 h-3 text-stella" />
                <span className="text-stella-light font-medium">Stella — Consultora Normativa</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20">
                <Shield className="w-3 h-3 text-zod" />
                <span className="text-zod-light font-medium">Zod — Blindaje Legal</span>
              </div>
            </div>
            <div className="flex flex-col items-end text-right border-l border-border pl-4">
              <p className="text-xs text-muted-foreground">
                v{PLATFORM_INFO.version}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}