/**
 * ERP SYNC HISTORY — Log de Transmisión y Auditoría
 * Tabla de alta densidad con JSON Viewer y filtros inteligentes
 */

import { useState, useMemo } from 'react';
import {
  CloudUpload, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Search, Calendar, Filter, Eye, Shield, Sparkles, Clock,
  ChevronLeft, ChevronRight, Zap, FileJson, ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ERPSyncLogEntry, generateDemoLogs } from '@/lib/erp/erpSyncData';
import { ERPJsonViewer } from './ERPJsonViewer';

// ─── Status Helpers ─────────────────────────────────────

type SyncStatus = ERPSyncLogEntry['status'];

const STATUS_CONFIG: Record<SyncStatus, { label: string; variant: string; icon: React.ReactNode }> = {
  success: {
    label: 'Recibido por Sistema Externo',
    variant: 'bg-success/10 text-success border-success/20',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  pending: {
    label: 'En cola de transmisión',
    variant: 'bg-warning/10 text-warning border-warning/20',
    icon: <Clock className="w-3 h-3" />,
  },
  error: {
    label: 'Fallo de conexión',
    variant: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <XCircle className="w-3 h-3" />,
  },
};

// ─── Main Component ─────────────────────────────────────

const PAGE_SIZE = 25;

export default function ERPSyncHistoryDashboard() {
  const [logs] = useState<ERPSyncLogEntry[]>(() => generateDemoLogs(120));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stellaFilter, setStellaFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortLatency, setSortLatency] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ERPSyncLogEntry | null>(null);

  // Filtering
  const filtered = useMemo(() => {
    let result = logs;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.batchRef.toLowerCase().includes(q) ||
          l.profile.toLowerCase().includes(q) ||
          l.zodNote.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (stellaFilter) {
      result = result.filter((l) => l.stellaAlert);
    }

    if (dateFrom) {
      result = result.filter((l) => l.timestamp >= dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter((l) => l.timestamp <= end);
    }

    if (sortLatency) {
      result = [...result].sort((a, b) =>
        sortLatency === 'asc' ? a.latencyMs - b.latencyMs : b.latencyMs - a.latencyMs
      );
    }

    return result;
  }, [logs, search, statusFilter, stellaFilter, dateFrom, dateTo, sortLatency]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const success = logs.filter((l) => l.status === 'success').length;
    const pending = logs.filter((l) => l.status === 'pending').length;
    const errors = logs.filter((l) => l.status === 'error').length;
    const avgLatency = logs.length
      ? Math.round(logs.reduce((s, l) => s + l.latencyMs, 0) / logs.length)
      : 0;
    return { total: logs.length, success, pending, errors, avgLatency };
  }, [logs]);

  const handleRetry = (log: ERPSyncLogEntry) => {
    toast('Reintento de envío iniciado. Stella supervisará la transmisión.', {
      description: `Lote: ${log.batchRef} · Perfil: ${log.profile}`,
      duration: 4000,
      icon: <RefreshCw className="w-4 h-4 text-primary" />,
      className: 'border border-primary/20',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStellaFilter(false);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortLatency(null);
    setPage(0);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || stellaFilter || dateFrom || dateTo;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CloudUpload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">ERP Sync History</h1>
            <p className="text-sm text-muted-foreground">
              Log de Transmisión · {kpis.total} registros · Latencia promedio: {kpis.avgLatency}ms
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
          <Shield className="w-3 h-3 mr-1" />
          Zod Integrity — Supervisión Activa
        </Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <KPICard label="Total Transmisiones" value={kpis.total} icon={<CloudUpload className="w-3.5 h-3.5 text-primary" />} />
        <KPICard
          label="Exitosas"
          value={kpis.success}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />}
          onClick={() => { setStatusFilter('success'); setPage(0); }}
        />
        <KPICard
          label="Pendientes"
          value={kpis.pending}
          icon={<Clock className="w-3.5 h-3.5 text-warning" />}
          onClick={() => { setStatusFilter('pending'); setPage(0); }}
        />
        <KPICard
          label="Errores"
          value={kpis.errors}
          icon={<XCircle className="w-3.5 h-3.5 text-destructive" />}
          alert={kpis.errors > 0}
          onClick={() => { setStatusFilter('error'); setPage(0); }}
        />
        <KPICard
          label="Latencia Prom."
          value={`${kpis.avgLatency}ms`}
          icon={<Zap className="w-3.5 h-3.5 text-primary" />}
        />
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar referencia, perfil..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">✅ Exitosas</SelectItem>
                <SelectItem value="pending">⏳ Pendientes</SelectItem>
                <SelectItem value="error">❌ Errores</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', !dateFrom && 'text-muted-foreground')}>
                  <Calendar className="w-3 h-3" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', !dateTo && 'text-muted-foreground')}>
                  <Calendar className="w-3 h-3" />
                  {dateTo ? format(dateTo, 'dd/MM/yy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant={stellaFilter ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setStellaFilter(!stellaFilter); setPage(0); }}
            >
              <Sparkles className="w-3 h-3" />
              Alertas Stella
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-elevated overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] uppercase tracking-wider w-[160px]">Timestamp</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Referencia</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Perfil Operativo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Estado</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => setSortLatency((p) => (p === 'asc' ? 'desc' : p === 'desc' ? null : 'asc'))}
                  >
                    Latencia
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Zod</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((log) => {
                const cfg = STATUS_CONFIG[log.status];
                return (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground py-2">
                      {format(log.timestamp, 'dd/MM/yy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium text-foreground">{log.batchRef}</span>
                        {log.stellaAlert && (
                          <span title="Alerta Stella"><Sparkles className="w-3 h-3 text-primary" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                        {log.profile}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={cn('text-[10px] gap-1 border', cfg.variant)}>
                        {cfg.icon}
                        {log.status === 'success' ? 'OK' : log.status === 'pending' ? 'Pendiente' : 'Error'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={cn(
                        'text-xs font-mono',
                        log.latencyMs > 2000 ? 'text-destructive' : log.latencyMs > 800 ? 'text-warning' : 'text-success'
                      )}>
                        {log.latencyMs}ms
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-[10px] text-success flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        OK
                      </span>
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {log.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRetry(log)}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                    No se encontraron registros con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="sm:max-w-[520px] overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <FileJson className="w-4 h-4 text-primary" />
                  Detalle de Transmisión
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedLog.batchRef} · {format(selectedLog.timestamp, "dd/MM/yyyy HH:mm:ss", { locale: es })}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <MetaField label="Perfil Operativo" value={selectedLog.profile} />
                  <MetaField label="Latencia" value={`${selectedLog.latencyMs}ms`} />
                  <MetaField label="Formato" value={selectedLog.format.toUpperCase()} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estado</p>
                    <Badge className={cn('text-[10px] gap-1 border', STATUS_CONFIG[selectedLog.status].variant)}>
                      {STATUS_CONFIG[selectedLog.status].icon}
                      {STATUS_CONFIG[selectedLog.status].label}
                    </Badge>
                  </div>
                </div>

                {/* Zod Integrity Note */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
                  <Shield className="w-4 h-4 text-success flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{selectedLog.zodNote}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Hash: {selectedLog.zodHash}</p>
                  </div>
                </div>

                {/* Stella Alert */}
                {selectedLog.stellaAlert && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-foreground">{selectedLog.stellaAlertMessage}</p>
                  </div>
                )}

                <Separator />

                {/* Payload Sent */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <CloudUpload className="w-3.5 h-3.5 text-primary" />
                    Payload Enviado
                  </h4>
                  <ERPJsonViewer data={selectedLog.payloadSent} />
                </div>

                <Separator />

                {/* External Response */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-primary" />
                    Respuesta del Sistema Externo
                  </h4>
                  <ERPJsonViewer data={selectedLog.externalResponse} />
                </div>

                {/* Retry for errors */}
                {selectedLog.status === 'error' && (
                  <>
                    <Separator />
                    <Button
                      variant="default"
                      className="w-full gap-2"
                      onClick={() => {
                        handleRetry(selectedLog);
                        setSelectedLog(null);
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reintentar Envío
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <p className="text-[9px] text-muted-foreground/40 text-center">
        Systemic DNA by Demostenes Perez Castillero | v2.0.26 · ZENITH — Powered by Orion Freight System
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  alert,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'card-elevated transition-colors',
        alert && 'border-destructive/30 bg-destructive/5',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">{value}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
