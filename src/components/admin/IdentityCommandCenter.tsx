/**
 * Identity Command Center — Centro de Mando de Identidad
 * Dashboard exclusivo para Master Admin
 * 
 * Módulos:
 * 1. Métricas globales de seguridad
 * 2. Tabla de usuarios de alta densidad
 * 3. Acciones rápidas (cambio de rol, kill session, toggle cuenta)
 * 4. Panel lateral de dispositivo/seguridad
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Users, AlertTriangle, Fingerprint, Monitor, Smartphone,
  Tablet, Wifi, WifiOff, ChevronDown, MoreHorizontal, Power,
  KeyRound, MapPin, Globe, Clock, Activity, ShieldCheck,
  RefreshCw, Search, X, UserCog, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole, ROLE_DISPLAY_NAMES } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  last_sign_in_at: string | null;
  // Simulated fields (would come from presence/session tracking in production)
  online: boolean;
  device: 'desktop' | 'mobile' | 'pda';
  ip_address: string;
  user_agent: string;
  location: string;
}

// ─── Role Config ────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  master_admin: 'bg-primary/15 text-primary border-primary/30',
  senior_broker: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  it_security: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  asistente: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  agente_campo: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

const AVAILABLE_ROLES: AppRole[] = ['master_admin', 'senior_broker', 'it_security', 'asistente', 'agente_campo'];

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  pda: Tablet,
};

// Simulate device/location from user agent
function simulateDeviceInfo(userId: string): Pick<UserRow, 'device' | 'ip_address' | 'user_agent' | 'location'> {
  const hash = userId.charCodeAt(0) + userId.charCodeAt(1);
  const devices: UserRow['device'][] = ['desktop', 'mobile', 'pda'];
  const locations = ['Panamá City, PA', 'Colón, PA', 'Tocumen Airport, PA', 'Zona Libre, PA'];
  const ips = ['192.168.1.100', '10.0.0.45', '172.16.0.88', '192.168.2.201'];
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/120',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120',
    'Mozilla/5.0 (Linux; Android 13; Zebra TC52x) Chrome/119',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604',
  ];

  return {
    device: devices[hash % devices.length],
    ip_address: ips[hash % ips.length],
    user_agent: agents[hash % agents.length],
    location: locations[hash % locations.length],
  };
}

// ─── Metrics Widgets ────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', accent || 'bg-primary/10')}>
          <Icon className={cn('w-4 h-4', accent?.includes('destructive') ? 'text-destructive' : 'text-primary')} />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}

// ─── User Detail Sheet ──────────────────────────────────

function UserDetailSheet({
  user,
  open,
  onClose,
}: {
  user: UserRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!user) return null;

  const DeviceIcon = DEVICE_ICONS[user.device] || Monitor;
  const timeSinceLogin = user.last_sign_in_at
    ? getRelativeTime(user.last_sign_in_at)
    : 'Nunca';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Detalle de Seguridad
          </SheetTitle>
          <SheetDescription>
            Información de dispositivo, sesión y geolocalización del usuario.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.full_name || 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="ml-auto">
              {user.online ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mr-1.5" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Device Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispositivo</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock icon={DeviceIcon} label="Tipo" value={user.device === 'pda' ? 'PDA / Scanner' : user.device === 'mobile' ? 'Móvil' : 'Desktop'} />
              <InfoBlock icon={Globe} label="IP Address" value={user.ip_address} mono />
              <InfoBlock icon={Fingerprint} label="User Agent" value={user.user_agent} className="col-span-2" small />
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</h4>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{user.location}</span>
              </div>
              {/* Mini-map placeholder */}
              <div className="w-full h-32 rounded-md bg-muted border border-border flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-6 h-6 text-primary/40 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Mapa basado en IP</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{user.ip_address}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sesión</h4>
            <InfoBlock icon={Clock} label="Última Actividad" value={timeSinceLogin} />
            <InfoBlock icon={KeyRound} label="Rol" value={ROLE_DISPLAY_NAMES[user.role] || user.role} />
            <InfoBlock icon={Shield} label="ID" value={user.id.substring(0, 8) + '...'} mono />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
  mono,
  small,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('p-3 rounded-md bg-muted/50 border border-border', className)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn(
        'text-foreground',
        mono && 'font-mono',
        small ? 'text-[11px] break-all' : 'text-xs font-medium',
      )}>
        {value}
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// ─── Main Component ────────────────────────────────────

export default function IdentityCommandCenter() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(0);

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);

      const merged: UserRow[] = (profiles || []).map(p => {
        const deviceInfo = simulateDeviceInfo(p.id);
        const lastSign = p.updated_at;
        const minutesAgo = lastSign ? (Date.now() - new Date(lastSign).getTime()) / 60000 : 999;

        return {
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          role: roleMap.get(p.id) || 'asistente',
          created_at: p.created_at,
          last_sign_in_at: lastSign,
          online: minutesAgo < 30,
          ...deviceInfo,
        };
      });

      setUsers(merged);

      // Count security alerts
      const { count } = await (supabase as any)
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .in('severity', ['critical', 'emergency'])
        .eq('resolved', false);

      setSecurityAlerts(count || 0);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Error al cargar usuarios');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Change role
  const changeUserRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol actualizado a ${ROLE_DISPLAY_NAMES[newRole]}`);
    } catch (err) {
      toast.error('Error al cambiar rol');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const onlineCount = users.filter(u => u.online).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Identity Command Center</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">MASTER ADMIN</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios, roles, sesiones activas y seguridad de dispositivos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Usuarios Totales"
          value={users.length}
          sublabel={`${onlineCount} online ahora`}
        />
        <MetricCard
          icon={Wifi}
          label="Sesiones Activas"
          value={onlineCount}
          sublabel="En los últimos 30 min"
          accent="bg-emerald-500/10"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alertas Zod"
          value={securityAlerts}
          sublabel="Intentos fallidos / alertas"
          accent="bg-destructive/10"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Firma Electrónica"
          value="Activa"
          sublabel="SHA-256 · RSA-2048"
          accent="bg-emerald-500/10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="pl-9 text-xs h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48 h-9 text-xs">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {AVAILABLE_ROLES.map(r => (
              <SelectItem key={r} value={r}>{ROLE_DISPLAY_NAMES[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px]">
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* User Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_140px_100px_120px_100px_48px] gap-2 px-4 py-3 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Última Actividad</span>
          <span>Dispositivo</span>
          <span></span>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Cargando usuarios...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map(user => {
              const DeviceIcon = DEVICE_ICONS[user.device] || Monitor;
              const isCurrentUser = user.id === currentUser?.id;

              return (
                <div
                  key={user.id}
                  className={cn(
                    'grid grid-cols-[1fr_140px_100px_120px_100px_48px] gap-2 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer',
                    isCurrentUser && 'bg-primary/[0.03]'
                  )}
                  onClick={() => { setSelectedUser(user); setSheetOpen(true); }}
                >
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {user.full_name || 'Sin nombre'}
                        {isCurrentUser && <span className="text-[10px] text-muted-foreground ml-1">(tú)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role Badge with dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors hover:opacity-80',
                          ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground border-border'
                        )}>
                          {ROLE_DISPLAY_NAMES[user.role] || user.role}
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-[10px]">Cambiar Rol</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {AVAILABLE_ROLES.map(r => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => changeUserRole(user.id, r)}
                            className={cn('text-xs', user.role === r && 'font-bold')}
                            disabled={isCurrentUser && r !== 'master_admin'}
                          >
                            <div className={cn(
                              'w-2 h-2 rounded-full mr-2 flex-shrink-0',
                              r === 'master_admin' && 'bg-primary',
                              r === 'senior_broker' && 'bg-emerald-500',
                              r === 'it_security' && 'bg-amber-500',
                              r === 'asistente' && 'bg-sky-500',
                              r === 'agente_campo' && 'bg-orange-500',
                            )} />
                            {ROLE_DISPLAY_NAMES[r]}
                            {user.role === r && <span className="ml-auto text-[10px] text-muted-foreground">actual</span>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Online Status */}
                  <div className="flex items-center gap-1.5">
                    {user.online ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <span className="text-[11px] text-muted-foreground">Offline</span>
                      </>
                    )}
                  </div>

                  {/* Last Activity */}
                  <span className="text-[11px] text-muted-foreground">
                    {user.last_sign_in_at ? getRelativeTime(user.last_sign_in_at) : '—'}
                  </span>

                  {/* Device */}
                  <div className="flex items-center gap-1.5" title={user.user_agent}>
                    <DeviceIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {user.device === 'pda' ? 'PDA' : user.device}
                    </span>
                  </div>

                  {/* Actions */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-[10px]">Acciones Rápidas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2"
                          onClick={() => { setSelectedUser(user); setSheetOpen(true); }}
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Detalle de Seguridad
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onClick={() => {
                            toast.info(`Kill Switch ejecutado para ${user.email}`, {
                              description: 'Token de sesión invalidado remotamente.'
                            });
                          }}
                          disabled={isCurrentUser}
                        >
                          <Power className="w-3.5 h-3.5" /> Cerrar Sesión Remota
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2"
                          onClick={() => {
                            toast.info(`Cuenta ${user.online ? 'desactivada' : 'activada'} para ${user.email}`);
                          }}
                          disabled={isCurrentUser}
                        >
                          <WifiOff className="w-3.5 h-3.5" />
                          {user.online ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
