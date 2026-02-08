import { useState, useEffect, useMemo } from 'react';
import {
  Home, History, Anchor, BookOpen, UserPlus, Award,
  ShieldCheck, FileSignature, TrendingUp, Search, Moon, Sun,
  ChevronLeft, ChevronRight, Calculator, Brain, Scale, Truck, Zap, Receipt,
  Radar, ShieldAlert, FolderInput, Info, ChevronDown, Settings,
  Sparkles, Shield, Lightbulb, Activity, CloudUpload, Radio, Lock, Camera
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { COMPANY_INFO, PLATFORM_INFO } from '@/lib/companyConfig';
import { useAuth, type AppRole, ROLE_DISPLAY_NAMES } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Navigation Groups with role-based visibility ─────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: AppRole[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  allowedRoles?: AppRole[];
}

// Role sets for readability
const ALL_ROLES: AppRole[] = ['master_admin', 'senior_broker', 'it_security', 'asistente', 'agente_campo'];
const OPERATIONS_ROLES: AppRole[] = ['master_admin', 'senior_broker', 'asistente'];
const BROKER_PLUS: AppRole[] = ['master_admin', 'senior_broker'];
const ADMIN_SECURITY: AppRole[] = ['master_admin', 'it_security'];

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operations',
    label: 'Operaciones',
    icon: Anchor,
    allowedRoles: OPERATIONS_ROLES,
    items: [
      { label: 'Horizonte de Carga', to: '/horizonte-carga', icon: Anchor },
      { label: 'LEXIS Ingress', to: '/lexis-ingress', icon: FolderInput },
      { label: 'Universal Gateway', to: '/courier-hub', icon: Zap },
      { label: 'SIGA Gateway', to: '/siga-gateway', icon: Radio, allowedRoles: BROKER_PLUS },
      { label: 'Operations Flow', to: '/flujo-courier', icon: Truck },
    ],
  },
  {
    id: 'intelligence',
    label: 'Inteligencia',
    icon: Brain,
    allowedRoles: [...OPERATIONS_ROLES],
    items: [
      { label: 'LEXIS Engine', to: '/lexis-engine', icon: Brain },
      { label: 'Aranceles', to: '/aranceles', icon: Search },
      { label: 'Simulador Fiscal', to: '/tax-simulator', icon: Calculator },
      { label: 'CAUCA/RECAUCA', to: '/cauca-recauca', icon: Scale, allowedRoles: BROKER_PLUS },
    ],
  },
  {
    id: 'audit',
    label: 'Auditoría',
    icon: ShieldAlert,
    allowedRoles: [...ADMIN_SECURITY, 'senior_broker'],
    items: [
      { label: 'Customs Shield', to: '/customs-shield', icon: ShieldAlert },
      { label: 'Data Integrity', to: '/data-integrity', icon: Shield, allowedRoles: ADMIN_SECURITY },
      { label: 'ERP Sync History', to: '/erp-sync-history', icon: CloudUpload },
      { label: 'Historial', to: '/historial', icon: History },
      { label: 'Consultas', to: '/consultas-clasificatorias', icon: BookOpen },
      { label: 'ROI Demo', to: '/stress-test', icon: Radar, allowedRoles: ['master_admin'] },
    ],
  },
  {
    id: 'management',
    label: 'Gestión',
    icon: Settings,
    allowedRoles: ['master_admin', 'senior_broker'],
    items: [
      { label: 'Facturación', to: '/enterprise-billing', icon: Receipt, allowedRoles: ['master_admin'] },
      { label: 'Licenciamiento', to: '/licenciamiento-aca', icon: Award },
      { label: 'About ZENITH', to: '/about', icon: Info },
    ],
  },
];

const NAV_QUICK: NavItem[] = [
  { label: 'Inicio', to: '/', icon: Home },
];

const NAV_ADMIN: NavItem[] = [
  { label: 'Onboarding', to: '/onboarding-corredor', icon: UserPlus, allowedRoles: ['master_admin', 'senior_broker'] },
  { label: 'Red LEXIS', to: '/red-cumplimiento', icon: ShieldCheck, allowedRoles: ['master_admin', 'senior_broker'] },
  { label: 'Portal Corredor', to: '/portal-corredor', icon: FileSignature, allowedRoles: BROKER_PLUS },
  { label: 'TLC Knowledge', to: '/tlc-knowledge', icon: BookOpen, allowedRoles: BROKER_PLUS },
  { label: 'Pulse', to: '/zenith-pulse', icon: TrendingUp, allowedRoles: ['master_admin', 'senior_broker'] },
  { label: 'Security Core', to: '/security-admin', icon: Lock, allowedRoles: ADMIN_SECURITY },
  { label: 'Identity Center', to: '/identity-command', icon: UserPlus, allowedRoles: ['master_admin'] },
];

// ─── AI Status Component ────────────────────────────────

function AIStatusIndicator({ collapsed }: { collapsed: boolean }) {
  const [zodAlert, setZodAlert] = useState(false);
  const [stellaInsight, setStellaInsight] = useState(false);

  useEffect(() => {
    const zodInterval = setInterval(() => setZodAlert(Math.random() > 0.7), 8000);
    const stellaInterval = setInterval(() => setStellaInsight(Math.random() > 0.6), 12000);
    return () => { clearInterval(zodInterval); clearInterval(stellaInterval); };
  }, []);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2">
        <div className={cn('w-2 h-2 rounded-full transition-colors duration-500', zodAlert ? 'bg-warning animate-pulse' : 'bg-success')} title={zodAlert ? 'Zod: Risk Detected' : 'Zod: Clear'} />
        <div className={cn('w-2 h-2 rounded-full transition-colors duration-500', stellaInsight ? 'bg-primary animate-pulse' : 'bg-success')} title={stellaInsight ? 'Stella: Insight Available' : 'Stella: Standby'} />
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 font-medium mb-1.5">AI Status</p>
      <div className="flex items-center gap-2 px-1.5 py-1 rounded-md bg-sidebar-accent/50">
        <Shield className={cn('w-3 h-3 flex-shrink-0 transition-colors duration-500', zodAlert ? 'text-warning' : 'text-success')} />
        {zodAlert && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />}
        <span className="text-[10px] text-sidebar-foreground/70">Zod {zodAlert ? '— Risk Detected' : '— Clear'}</span>
      </div>
      <div className="flex items-center gap-2 px-1.5 py-1 rounded-md bg-sidebar-accent/50">
        <Sparkles className={cn('w-3 h-3 flex-shrink-0 transition-colors duration-500', stellaInsight ? 'text-primary' : 'text-success')} />
        {stellaInsight && <Lightbulb className="w-3 h-3 text-primary animate-pulse flex-shrink-0" />}
        <span className="text-[10px] text-sidebar-foreground/70">Stella {stellaInsight ? '— Insight' : '— Standby'}</span>
      </div>
    </div>
  );
}

// ─── Accordion Group ────────────────────────────────────

function SidebarAccordionGroup({
  group,
  collapsed,
  currentPath,
  userRole,
}: {
  group: NavGroup;
  collapsed: boolean;
  currentPath: string;
  userRole: string | null;
}) {
  // Filter items by role
  const visibleItems = useMemo(() =>
    group.items.filter(item =>
      !item.allowedRoles || (userRole && item.allowedRoles.includes(userRole as AppRole))
    ),
    [group.items, userRole]
  );

  const hasActiveItem = visibleItems.some(item => currentPath === item.to);
  const [open, setOpen] = useState(hasActiveItem);

  useEffect(() => {
    if (hasActiveItem && !open) setOpen(true);
  }, [hasActiveItem]);

  if (visibleItems.length === 0) return null;

  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = currentPath === item.to;
          return (
            <Link key={item.to} to={item.to}>
              <div className={cn(
                'flex items-center justify-center px-2 py-1.5 rounded-md transition-colors',
                active ? 'bg-sidebar-primary/15 text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )} title={item.label}>
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
          hasActiveItem ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
        )}
      >
        <GroupIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left uppercase tracking-wider text-[10px]">{group.label}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-200 text-sidebar-foreground/30', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-3 pl-2.5 border-l border-sidebar-border/50 space-y-0.5">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = currentPath === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <div className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  active ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}>
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

  // Filter groups by role
  const visibleGroups = useMemo(() =>
    NAV_GROUPS.filter(g => !g.allowedRoles || (role && g.allowedRoles.includes(role))),
    [role]
  );

  // Filter admin items by role
  const filteredAdminItems = useMemo(() =>
    NAV_ADMIN.filter(item => !item.allowedRoles || (role && item.allowedRoles.includes(role))),
    [role]
  );

  const roleLabel = role ? ROLE_DISPLAY_NAMES[role] || role : null;

  return (
    <aside className={cn(
      'h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    )}>
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

      {/* Role badge */}
      {!collapsed && roleLabel && (
        <div className="px-3 pt-2">
          <Badge variant="outline" className="text-[9px] w-full justify-center font-mono border-sidebar-border text-sidebar-foreground/60">
            {roleLabel}
          </Badge>
        </div>
      )}

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
                    active ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
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

        {/* Accordion Groups (role-filtered) */}
        <div className="space-y-1 py-1">
          {visibleGroups.map(group => (
            <SidebarAccordionGroup
              key={group.id}
              group={group}
              collapsed={collapsed}
              currentPath={currentPath}
              userRole={role}
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
                        active ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
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

      {/* Footer */}
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
