import { useState, useEffect, useMemo } from 'react';
import {
  Home, History, Anchor, BookOpen, UserPlus, Award,
  ShieldCheck, FileSignature, TrendingUp, Search, Moon, Sun,
  ChevronLeft, ChevronRight, Calculator, Brain, Scale, Truck, Zap, Receipt,
  Radar, ShieldAlert, FolderInput, Info, ChevronDown, Settings,
  Sparkles, Shield, Lightbulb, Activity, CloudUpload
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { COMPANY_INFO, PLATFORM_INFO } from '@/lib/companyConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Navigation Groups ─────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operations',
    label: 'Operaciones',
    icon: Anchor,
    items: [
      { label: 'Horizonte de Carga', to: '/horizonte-carga', icon: Anchor },
      { label: 'LEXIS Ingress', to: '/lexis-ingress', icon: FolderInput },
      { label: 'Universal Gateway', to: '/courier-hub', icon: Zap },
      { label: 'Operations Flow', to: '/flujo-courier', icon: Truck },
    ],
  },
  {
    id: 'intelligence',
    label: 'Inteligencia',
    icon: Brain,
    items: [
      { label: 'LEXIS Engine', to: '/lexis-engine', icon: Brain },
      { label: 'Aranceles', to: '/aranceles', icon: Search },
      { label: 'Simulador Fiscal', to: '/tax-simulator', icon: Calculator },
      { label: 'CAUCA/RECAUCA', to: '/cauca-recauca', icon: Scale },
    ],
  },
  {
    id: 'audit',
    label: 'Auditoría',
    icon: ShieldAlert,
    items: [
      { label: 'Customs Shield', to: '/customs-shield', icon: ShieldAlert },
      { label: 'ERP Sync History', to: '/erp-sync-history', icon: CloudUpload },
      { label: 'Historial', to: '/historial', icon: History },
      { label: 'Consultas', to: '/consultas-clasificatorias', icon: BookOpen },
      { label: 'ROI Demo', to: '/stress-test', icon: Radar },
    ],
  },
  {
    id: 'management',
    label: 'Gestión',
    icon: Settings,
    items: [
      { label: 'Facturación', to: '/enterprise-billing', icon: Receipt },
      { label: 'Licenciamiento', to: '/licenciamiento-aca', icon: Award },
      { label: 'About ZENITH', to: '/about', icon: Info },
    ],
  },
];

const NAV_QUICK: NavItem[] = [
  { label: 'Inicio', to: '/', icon: Home },
];

const NAV_ADMIN: (NavItem & { roles?: string[] })[] = [
  { label: 'Onboarding', to: '/onboarding-corredor', icon: UserPlus },
  { label: 'Red LEXIS', to: '/red-cumplimiento', icon: ShieldCheck },
  { label: 'Portal Corredor', to: '/portal-corredor', icon: FileSignature, roles: ['revisor', 'admin'] },
  { label: 'TLC Knowledge', to: '/tlc-knowledge', icon: BookOpen, roles: ['revisor', 'admin'] },
  { label: 'Pulse', to: '/zenith-pulse', icon: TrendingUp },
];

// ─── AI Status Component ────────────────────────────────

function AIStatusIndicator({ collapsed }: { collapsed: boolean }) {
  // Simulated AI engine states
  const [zodAlert, setZodAlert] = useState(false);
  const [stellaInsight, setStellaInsight] = useState(false);

  useEffect(() => {
    // Simulate periodic AI status changes
    const zodInterval = setInterval(() => {
      setZodAlert(Math.random() > 0.7);
    }, 8000);
    const stellaInterval = setInterval(() => {
      setStellaInsight(Math.random() > 0.6);
    }, 12000);
    return () => {
      clearInterval(zodInterval);
      clearInterval(stellaInterval);
    };
  }, []);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2">
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-500',
          zodAlert ? 'bg-warning animate-pulse' : 'bg-success'
        )} title={zodAlert ? 'Zod: Risk Detected' : 'Zod: Clear'} />
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-500',
          stellaInsight ? 'bg-primary animate-pulse' : 'bg-success'
        )} title={stellaInsight ? 'Stella: Insight Available' : 'Stella: Standby'} />
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 font-medium mb-1.5">
        AI Status
      </p>
      <div className="flex items-center gap-2 px-1.5 py-1 rounded-md bg-sidebar-accent/50">
        <Shield className={cn(
          'w-3 h-3 flex-shrink-0 transition-colors duration-500',
          zodAlert ? 'text-warning' : 'text-success'
        )} />
        {zodAlert && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />}
        <span className="text-[10px] text-sidebar-foreground/70">
          Zod {zodAlert ? '— Risk Detected' : '— Clear'}
        </span>
      </div>
      <div className="flex items-center gap-2 px-1.5 py-1 rounded-md bg-sidebar-accent/50">
        <Sparkles className={cn(
          'w-3 h-3 flex-shrink-0 transition-colors duration-500',
          stellaInsight ? 'text-primary' : 'text-success'
        )} />
        {stellaInsight && (
          <Lightbulb className="w-3 h-3 text-primary animate-pulse flex-shrink-0" />
        )}
        <span className="text-[10px] text-sidebar-foreground/70">
          Stella {stellaInsight ? '— Insight' : '— Standby'}
        </span>
      </div>
    </div>
  );
}

// ─── Accordion Group ────────────────────────────────────

function SidebarAccordionGroup({
  group,
  collapsed,
  currentPath,
}: {
  group: NavGroup;
  collapsed: boolean;
  currentPath: string;
}) {
  const hasActiveItem = group.items.some(item => currentPath === item.to);
  const [open, setOpen] = useState(hasActiveItem);

  // Auto-open when navigating to an item in this group
  useEffect(() => {
    if (hasActiveItem && !open) setOpen(true);
  }, [hasActiveItem]);

  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {group.items.map(item => {
          const Icon = item.icon;
          const active = currentPath === item.to;
          return (
            <Link key={item.to} to={item.to}>
              <div
                className={cn(
                  'flex items-center justify-center px-2 py-1.5 rounded-md transition-colors',
                  active
                    ? 'bg-sidebar-primary/15 text-sidebar-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
          hasActiveItem
            ? 'text-sidebar-primary'
            : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
        )}
      >
        <GroupIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left uppercase tracking-wider text-[10px]">{group.label}</span>
        <ChevronDown className={cn(
          'w-3 h-3 transition-transform duration-200 text-sidebar-foreground/30',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="ml-3 pl-2.5 border-l border-sidebar-border/50 space-y-0.5">
          {group.items.map(item => {
            const Icon = item.icon;
            const active = currentPath === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <div
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                    active
                      ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar ───────────────────────────────────────

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

  const currentPath = location.pathname;

  const filteredAdminItems = useMemo(() => {
    return NAV_ADMIN.filter(item => !item.roles || item.roles.includes(role || ''));
  }, [role]);

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-3 h-14 border-b border-sidebar-border flex-shrink-0', collapsed && 'justify-center px-2')}>
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sidebar-primary-foreground">Z</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground tracking-wider">ZENITH</span>
              <p className="text-[9px] text-sidebar-foreground/40 truncate">{COMPANY_INFO.tagline}</p>
            </div>
          )}
        </Link>
      </div>

      {/* AI Status */}
      <AIStatusIndicator collapsed={collapsed} />

      <Separator className="bg-sidebar-border mx-2" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-1 scrollbar-thin">
        {/* Quick Access */}
        <div className="space-y-0.5 mb-1">
          {NAV_QUICK.map(item => {
            const Icon = item.icon;
            const active = currentPath === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md text-xs transition-colors',
                    collapsed ? 'justify-center px-2 py-1.5' : 'px-2.5 py-1.5',
                    active
                      ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        <Separator className="bg-sidebar-border/50 mx-1" />

        {/* Accordion Groups */}
        <div className="space-y-1 py-1">
          {NAV_GROUPS.map(group => (
            <SidebarAccordionGroup
              key={group.id}
              group={group}
              collapsed={collapsed}
              currentPath={currentPath}
            />
          ))}
        </div>

        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <>
            <Separator className="bg-sidebar-border/50 mx-1" />
            <div className="space-y-0.5 pt-1">
              {!collapsed && (
                <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 font-medium px-2.5 mb-1">
                  Administración
                </p>
              )}
              {filteredAdminItems.map(item => {
                const Icon = item.icon;
                const active = currentPath === item.to;
                return (
                  <Link key={item.to} to={item.to}>
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-md text-xs transition-colors',
                        collapsed ? 'justify-center px-2 py-1.5' : 'px-2.5 py-1.5',
                        active
                          ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer — Preferences */}
      <div className="border-t border-sidebar-border p-1.5 space-y-0.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            'w-full gap-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 text-[11px]',
            collapsed ? 'justify-center px-0' : 'justify-start px-2'
          )}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {!collapsed && <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full gap-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 text-[11px]',
            collapsed ? 'justify-center px-0' : 'justify-start px-2'
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!collapsed && <span>Colapsar</span>}
        </Button>

        {!collapsed && (
          <p className="text-[9px] text-sidebar-foreground/25 text-center py-0.5">
            v{PLATFORM_INFO.version} · ZENITH
          </p>
        )}
      </div>
    </aside>
  );
}
