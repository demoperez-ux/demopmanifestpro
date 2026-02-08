// ============================================
// CONNECTOR CORE DASHBOARD
// Semáforo de Conectividad + Cola de Transmisión
// Panel integrado en SIGA Gateway
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Wifi, WifiOff, Activity, Clock, RotateCcw, X,
  Send, CheckCircle2, AlertTriangle, Loader2,
  RefreshCw, Shield, Zap, ArrowRight, Timer,
  CircleDot, Ban, Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  monitorConectividad,
  type ConnectivitySnapshot,
  type ServiceStatus,
} from '@/lib/gateway/ConnectivityMonitor';
import {
  colaTransmision,
  type TransmissionItem,
  type QueueStats,
  type QueueEvent,
} from '@/lib/gateway/TransmissionQueue';
import { convertirATradeNetXML, type ZenithPayload } from '@/lib/gateway/ProtocolConverter';

// ── Status Helpers ──────────────────────────

const STATUS_CONFIG: Record<ServiceStatus, {
  label: string;
  emoji: string;
  className: string;
  bgClassName: string;
  icon: typeof Wifi;
}> = {
  online: {
    label: 'Online',
    emoji: '🟢',
    className: 'text-success',
    bgClassName: 'bg-success-light border-success/30',
    icon: Wifi,
  },
  latency_high: {
    label: 'Latency High',
    emoji: '🟡',
    className: 'text-warning',
    bgClassName: 'bg-warning-light border-warning/30',
    icon: Activity,
  },
  maintenance: {
    label: 'Maintenance',
    emoji: '🔴',
    className: 'text-destructive',
    bgClassName: 'bg-destructive-light border-destructive/30',
    icon: Server,
  },
  offline: {
    label: 'Offline',
    emoji: '🔴',
    className: 'text-destructive',
    bgClassName: 'bg-destructive-light border-destructive/30',
    icon: WifiOff,
  },
};

const TX_STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Send }> = {
  pending: { label: 'En Cola', className: 'bg-muted text-muted-foreground', icon: Clock },
  sending: { label: 'Enviando', className: 'bg-primary/10 text-primary', icon: Loader2 },
  success: { label: 'Exitoso', className: 'bg-success-light text-success', icon: CheckCircle2 },
  retrying: { label: 'Reintentando', className: 'bg-warning-light text-warning', icon: RotateCcw },
  failed: { label: 'Fallido', className: 'bg-destructive-light text-destructive', icon: AlertTriangle },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground', icon: Ban },
};

// ── Semáforo de Conectividad ────────────────

function SemaforoConectividad() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot>(() => monitorConectividad.getSnapshot());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsub = monitorConectividad.onUpdate(setSnapshot);
    monitorConectividad.iniciarPolling(30_000);
    return () => {
      unsub();
      monitorConectividad.detenerPolling();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setChecking(true);
    setTimeout(() => {
      const result = monitorConectividad.ejecutarHealthCheck();
      setSnapshot(result);
      setChecking(false);
      toast.success('Health check completado', {
        description: `${result.serviciosOnline}/${result.serviciosTotal} servicios online — ${result.latenciaPromedio}ms promedio`,
      });
    }, 1500);
  }, []);

  const globalConfig = STATUS_CONFIG[snapshot.saludGlobal];

  return (
    <div className="space-y-4">
      {/* Global Status Banner */}
      <Card className={cn('card-elevated border-l-4', {
        'border-l-success': snapshot.saludGlobal === 'online',
        'border-l-warning': snapshot.saludGlobal === 'latency_high',
        'border-l-destructive': snapshot.saludGlobal === 'maintenance' || snapshot.saludGlobal === 'offline',
      })}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center border',
                globalConfig.bgClassName
              )}>
                <span className="text-2xl">{globalConfig.emoji}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Conexión con Servidores de la ANA:{' '}
                  <span className={globalConfig.className}>
                    {snapshot.saludGlobal === 'online' ? 'ESTABLE' :
                     snapshot.saludGlobal === 'latency_high' ? 'LATENCIA ALTA' :
                     snapshot.saludGlobal === 'maintenance' ? 'EN MANTENIMIENTO' : 'FUERA DE LÍNEA'}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {snapshot.serviciosOnline}/{snapshot.serviciosTotal} servicios online · 
                  Latencia promedio: {snapshot.latenciaPromedio}ms · 
                  Último check: {new Date(snapshot.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleRefresh}
              disabled={checking}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', checking && 'animate-spin')} />
              {checking ? 'Verificando...' : 'Health Check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Semaphore Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {snapshot.servicios.map(svc => {
          const config = STATUS_CONFIG[svc.status];
          const Icon = config.icon;
          return (
            <Card key={svc.id} className={cn('p-3 border transition-all', config.bgClassName)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{config.emoji}</span>
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide', config.className)}>
                    {config.label}
                  </span>
                </div>
                {svc.latenciaMs > 0 && (
                  <Badge variant="outline" className="text-[9px] font-mono h-4">
                    {svc.latenciaMs}ms
                  </Badge>
                )}
              </div>
              <p className="text-xs font-medium leading-tight mb-1">{svc.nombre}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{svc.descripcion}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-[9px] text-muted-foreground">
                  Uptime: {svc.uptimePercent.toFixed(1)}%
                </span>
                <span className="text-[9px] text-muted-foreground">
                  Errores: {svc.erroresRecientes}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legal Footer */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
        <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Cumpliendo con los protocolos de seguridad de{' '}
          <strong className="text-foreground">CrimsonLogic</strong> y la{' '}
          <strong className="text-foreground">Autoridad Nacional de Aduanas</strong>.
          Interoperabilidad certificada conforme al estándar WCO Data Model 3.x.
        </p>
      </div>
    </div>
  );
}

// ── Cola de Transmisión ─────────────────────

function PanelColaTransmision() {
  const [items, setItems] = useState<TransmissionItem[]>([]);
  const [historial, setHistorial] = useState<TransmissionItem[]>([]);
  const [stats, setStats] = useState<QueueStats>(colaTransmision.getStats());

  const refresh = useCallback(() => {
    setItems(colaTransmision.getItemsEnCola());
    setHistorial(colaTransmision.getHistorial().slice(-15));
    setStats(colaTransmision.getStats());
  }, []);

  useEffect(() => {
    const unsub = colaTransmision.onEvent((_event: QueueEvent) => {
      refresh();
    });
    refresh();
    return unsub;
  }, [refresh]);

  const handleEnviarDemo = async () => {
    const payload: ZenithPayload = {
      declaracionId: `DEC-${Date.now().toString(36).toUpperCase()}`,
      tipoDeclaracion: ['DUA', 'DSI', 'DRT'][Math.floor(Math.random() * 3)],
      codigoRegimen: ['10', '20', '40'][Math.floor(Math.random() * 3)],
      consignatario: {
        nombre: ['Global Trade Corp S.A.', 'Farma Plus International', 'TechImport Panamá'][Math.floor(Math.random() * 3)],
        ruc: `155700${Math.floor(Math.random() * 999)}-1-2026`,
      },
      corredor: { licencia: `ANA-${Math.floor(Math.random() * 9000 + 1000)}`, nombre: 'Corredor Demo' },
      transporte: { modo: 'aereo', buqueVuelo: `CM${Math.floor(Math.random() * 900 + 100)}`, mawb: `230-${Math.floor(Math.random() * 90000000 + 10000000)}` },
      mercancia: {
        descripcion: 'Productos varios para importación',
        clasificacionHTS: `${Math.floor(Math.random() * 9000 + 1000)}.${Math.floor(Math.random() * 90 + 10)}.00`,
        paisOrigen: 'US',
        paisProcedencia: 'US',
        bultos: Math.floor(Math.random() * 50 + 1),
        pesoNeto: Math.round(Math.random() * 500 + 10),
        pesoBruto: Math.round(Math.random() * 600 + 15),
      },
      valoracion: {
        fob: Math.round(Math.random() * 50000 + 500),
        flete: Math.round(Math.random() * 3000 + 200),
        seguro: Math.round(Math.random() * 500 + 50),
        cif: 0,
        moneda: 'USD',
      },
      impuestos: { dai: 0, isc: 0, itbm: 0, tasaServicio: 3, total: 0 },
    };
    payload.valoracion.cif = payload.valoracion.fob + payload.valoracion.flete + payload.valoracion.seguro;
    payload.impuestos.dai = Math.round(payload.valoracion.cif * 0.10);
    payload.impuestos.isc = Math.round((payload.valoracion.cif + payload.impuestos.dai) * 0.05);
    payload.impuestos.itbm = Math.round((payload.valoracion.cif + payload.impuestos.dai + payload.impuestos.isc) * 0.07);
    payload.impuestos.total = payload.impuestos.dai + payload.impuestos.isc + payload.impuestos.itbm + 3;

    const result = await convertirATradeNetXML(payload);

    colaTransmision.encolar({
      declaracionId: payload.declaracionId,
      tipoDeclaracion: payload.tipoDeclaracion,
      consignatario: payload.consignatario.nombre,
      destino: 'SIGA Declaraciones',
      xmlPayload: result.xml,
      hashIntegridad: result.hash,
    });

    toast.info('Declaración encolada', {
      description: `${payload.declaracionId} → Cola de transmisión SIGA`,
    });
  };

  const allItems = [...items, ...historial].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'En Cola', value: stats.totalEnCola, icon: Clock, cls: 'text-primary' },
          { label: 'Enviando', value: stats.enviando, icon: Loader2, cls: 'text-primary' },
          { label: 'Exitosos', value: stats.exitosos, icon: CheckCircle2, cls: 'text-success' },
          { label: 'Reintentando', value: stats.reintentando, icon: RotateCcw, cls: 'text-warning' },
          { label: 'Fallidos', value: stats.fallidos, icon: AlertTriangle, cls: 'text-destructive' },
          { label: 'Tasa Éxito', value: `${stats.tasaExito}%`, icon: Zap, cls: 'text-success' },
          { label: 'Latencia Prom.', value: `${stats.latenciaPromedio}ms`, icon: Timer, cls: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <Card key={label} className="p-2.5 text-center card-elevated">
            <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', cls)} />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" className="text-xs gap-1.5" onClick={handleEnviarDemo}>
            <Send className="w-3.5 h-3.5" />
            Encolar Declaración Demo
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={refresh}>
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3 text-success" />
          Zod verifica integridad antes del envío
        </div>
      </div>

      {/* Retry Logic Info */}
      <Card className="p-3 card-elevated">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold">Lógica de Reintentos Automáticos</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>Máx. intentos: <strong className="text-foreground">5</strong></span>
          <ArrowRight className="w-3 h-3" />
          <span>Intervalo base: <strong className="text-foreground">5 min</strong></span>
          <ArrowRight className="w-3 h-3" />
          <span>Factor exponencial: <strong className="text-foreground">1.5x</strong></span>
          <ArrowRight className="w-3 h-3" />
          <span>Concurrencia máx: <strong className="text-foreground">3</strong></span>
        </div>
        <Progress value={stats.tasaExito} className="h-1.5 mt-2" />
      </Card>

      {/* Queue Table */}
      {allItems.length > 0 ? (
        <Card className="card-elevated p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">ID</TableHead>
                <TableHead className="text-[10px]">Declaración</TableHead>
                <TableHead className="text-[10px]">Consignatario</TableHead>
                <TableHead className="text-[10px]">Destino</TableHead>
                <TableHead className="text-[10px]">Estado</TableHead>
                <TableHead className="text-[10px] text-center">Intentos</TableHead>
                <TableHead className="text-[10px]">Latencia</TableHead>
                <TableHead className="text-[10px]">Zod</TableHead>
                <TableHead className="text-[10px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.slice(0, 20).map(item => {
                const cfg = TX_STATUS_CONFIG[item.status] || TX_STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-[10px]">{item.id}</TableCell>
                    <TableCell className="text-[10px]">
                      <div>
                        <span className="font-medium">{item.declaracionId}</span>
                        <span className="text-muted-foreground ml-1">({item.tipoDeclaracion})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] max-w-[120px] truncate">{item.consignatario}</TableCell>
                    <TableCell className="text-[10px]">{item.destino}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-[9px] gap-1', cfg.className)}>
                        <Icon className={cn('w-2.5 h-2.5', item.status === 'sending' && 'animate-spin')} />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-[10px] font-mono">
                      {item.intentos}/{item.maxIntentos}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono">
                      {item.latenciaMs ? `${item.latenciaMs}ms` : '—'}
                    </TableCell>
                    <TableCell>
                      {item.zodVerificado
                        ? <Shield className="w-3 h-3 text-success" />
                        : <CircleDot className="w-3 h-3 text-muted-foreground" />
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(item.status === 'failed' || item.status === 'retrying') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[9px] gap-0.5"
                            onClick={() => {
                              colaTransmision.reintentarManual(item.id);
                              toast.info('Reintento manual iniciado');
                            }}
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Reintentar
                          </Button>
                        )}
                        {(item.status === 'pending' || item.status === 'retrying') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[9px] text-destructive"
                            onClick={() => {
                              colaTransmision.cancelar(item.id);
                              toast.warning('Transmisión cancelada');
                            }}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="card-elevated p-8 text-center">
          <Send className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cola de transmisión vacía</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Encola una declaración para iniciar la transmisión al SIGA
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Main Export ──────────────────────────────

export default function ConnectorCoreDashboard() {
  return (
    <div className="space-y-6">
      {/* Connectivity Semaphore */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Semáforo de Conectividad — Web Services ANA</h2>
        </div>
        <SemaforoConectividad />
      </div>

      {/* Transmission Queue */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Cola de Transmisión — Retry Logic</h2>
        </div>
        <PanelColaTransmision />
      </div>
    </div>
  );
}
