import {
  Home, Inbox, History, Anchor, BookOpen, UserPlus, Award,
  ShieldCheck, FileSignature, TrendingUp, Search, Moon, Sun,
  ChevronLeft, ChevronRight, Calculator, Brain, DatabaseZap, Scale, Truck, Zap, Receipt
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { COMPANY_INFO, PLATFORM_INFO } from '@/lib/companyConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Inicio', to: '/', icon: Home },
  { label: 'Horizonte de Carga', to: '/horizonte-carga', icon: Anchor },
  { label: 'Bandeja de Entrada', to: '/stella-inbox', icon: Inbox },
  { label: 'Historial', to: '/historial', icon: History },
  { label: 'Consultas', to: '/consultas-clasificatorias', icon: BookOpen },
  { label: 'Aranceles', to: '/aranceles', icon: Search },
  { label: 'Tax Simulator', to: '/tax-simulator', icon: Calculator },
  { label: 'LEXIS Engine', to: '/lexis-engine', icon: Brain },
  { label: 'Flujo Courier', to: '/flujo-courier', icon: Truck },
  { label: 'Universal Gateway', to: '/courier-hub', icon: Zap },
  { label: 'Enterprise Billing', to: '/enterprise-billing', icon: Receipt },
];

const NAV_ADMIN = [
  { label: 'Onboarding', to: '/onboarding-corredor', icon: UserPlus },
  { label: 'Licenciamiento', to: '/licenciamiento-aca', icon: Award },
  { label: 'Red LEXIS', to: '/red-cumplimiento', icon: ShieldCheck },
  { label: 'Portal Corredor', to: '/portal-corredor', icon: FileSignature, roles: ['revisor', 'admin'] as string[] },
  { label: 'TLC Knowledge', to: '/tlc-knowledge', icon: DatabaseZap, roles: ['revisor', 'admin'] as string[] },
  { label: 'CAUCA/RECAUCA', to: '/cauca-recauca', icon: Scale },
  { label: 'Pulse', to: '/zenith-pulse', icon: TrendingUp },
];

export function AppSidebar() {
  const location = useLocation();
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('zenith-theme');
    if (stored === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('zenith-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('zenith-theme', 'light');
      }
      return next;
    });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-sidebar-primary-foreground">Z</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground tracking-wider">ZENITH</span>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{COMPANY_INFO.tagline}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        <p className={cn(
          'text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium mb-2',
          collapsed ? 'text-center' : 'px-2'
        )}>
          {collapsed ? '—' : 'Principal'}
        </p>

        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                  active
                    ? 'bg-sidebar-primary/15 text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}

        <Separator className="my-3 bg-sidebar-border" />

        <p className={cn(
          'text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium mb-2',
          collapsed ? 'text-center' : 'px-2'
        )}>
          {collapsed ? '—' : 'Gestión'}
        </p>

        {NAV_ADMIN.map(item => {
          if (item.roles && !item.roles.includes(role || '')) return null;
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                  active
                    ? 'bg-sidebar-primary/15 text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            'w-full gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'justify-center px-0' : 'justify-start'
          )}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'justify-center px-0' : 'justify-start'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Colapsar</span>}
        </Button>

        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 text-center py-1">
            v{PLATFORM_INFO.version}
          </p>
        )}
      </div>
    </aside>
  );
}
