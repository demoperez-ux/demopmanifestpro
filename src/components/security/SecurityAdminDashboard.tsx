// ============================================
// SecurityAdminDashboard - Panel de Administración de Seguridad
// Enterprise Security Layer: User/Client/Vendor management + Audit Logs
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useSystemAudit } from '@/hooks/useSystemAudit';
import { DLPProtectedView } from './DLPProtectedView';
import { 
  Shield, Users, Building2, Globe, FileText, AlertTriangle,
  Search, RefreshCw, Eye, Lock, Unlock, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_role: AppRole | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
  severity: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-info-light text-info',
  warning: 'bg-warning-light text-warning',
  critical: 'bg-destructive-light text-destructive',
  security: 'bg-destructive text-destructive-foreground',
};

export const SecurityAdminDashboard: React.FC = () => {
  const { role: currentRole } = useAuth();
  const { logDataAccess } = useSystemAudit();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (roles && profiles) {
        const merged = roles.map(r => {
          const profile = profiles.find(p => p.id === r.user_id);
          return {
            id: r.user_id,
            email: profile?.email || 'N/A',
            full_name: profile?.full_name || 'Sin nombre',
            role: r.role as AppRole,
            created_at: r.created_at,
          };
        });
        setUsers(merged);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    logDataAccess('sys_audit_logs');
    try {
      let query = (supabase as any)
        .from('sys_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data } = await query;
      if (data) setAuditLogs(data as AuditLog[]);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(l =>
    searchTerm === '' ||
    l.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabel: Record<string, string> = {
    master_admin: 'Master Admin',
    senior_broker: 'Senior Broker',
    it_security: 'IT / Security',
    asistente: 'Asistente',
    agente_campo: 'Agente Campo',
    operador: 'Analista',
    revisor: 'Corredor',
    auditor: 'Auditor',
    admin: 'Administrador',
  };

  const roleBadgeClass: Record<string, string> = {
    master_admin: 'bg-destructive-light text-destructive',
    senior_broker: 'bg-success-light text-success',
    it_security: 'bg-warning-light text-warning',
    asistente: 'bg-info-light text-info',
    agente_campo: 'bg-muted text-muted-foreground',
    operador: 'bg-info-light text-info',
    revisor: 'bg-success-light text-success',
    auditor: 'bg-warning-light text-warning',
    admin: 'bg-destructive-light text-destructive',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Shield className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Security & Identity Core</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios, entidades y auditoría forense
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Usuarios</span>
            </div>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Eventos Hoy</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {auditLogs.filter(l => {
                const today = new Date().toDateString();
                return new Date(l.created_at).toDateString() === today;
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Alertas Seguridad</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {auditLogs.filter(l => l.severity === 'security' || l.severity === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">DLP Activo</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">✓</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Usuarios & Roles
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Auditoría Forense
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'users' ? 'Buscar usuario...' : 'Buscar en logs...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {activeTab === 'audit' && (
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="security">Seguridad</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => activeTab === 'users' ? loadUsers() : loadAuditLogs()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Usuarios RBAC</CardTitle>
              <CardDescription>
                Flujo 90/10: Analistas preparan, Corredores validan y firman
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Registrado</TableHead>
                      {isAdmin && <TableHead>Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={roleBadgeClass[user.role]}>
                            {roleLabel[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(v) => handleRoleChange(user.id, v as AppRole)}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="operador">Analista</SelectItem>
                                <SelectItem value="revisor">Corredor</SelectItem>
                                <SelectItem value="auditor">Auditor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <DLPProtectedView
            disableCopy={true}
            showWatermark={true}
            antiScreenshot={true}
            resourceLabel="audit_logs"
          >
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  System Audit Log — Insert-Only (Inmutable)
                </CardTitle>
                <CardDescription>
                  Registro forense de todas las acciones del sistema. No puede ser modificado ni eliminado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Timestamp</TableHead>
                        <TableHead>Severidad</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge className={SEVERITY_COLORS[log.severity] || 'bg-muted text-muted-foreground'}>
                              {log.severity.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.action_type}</TableCell>
                          <TableCell className="text-sm">{log.resource_type}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.description || '—'}
                          </TableCell>
                          <TableCell>
                            {log.user_role && (
                              <Badge variant="outline" className="text-xs">
                                {roleLabel[log.user_role] || log.user_role}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay registros de auditoría
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </DLPProtectedView>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityAdminDashboard;
