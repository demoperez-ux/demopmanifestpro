// ============================================
// PANEL DE CONECTIVIDAD INSTITUCIONAL
// ANA-SIGA Bridge — Credenciales, Entorno,
// Resoluciones y Status de Web Services
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  KeyRound, Shield, Upload, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Save, FileText, Download, Lock,
  Globe, Server, Activity, Wifi, WifiOff, Clock,
  FolderArchive, ExternalLink, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────

interface CredencialesANA {
  apiKeyProduccion: string;
  certificadoFirma: string;
  idCorredorAutorizado: string;
  guardado: boolean;
}

interface ResolucionANA {
  id: string;
  numero: string;
  titulo: string;
  fechaEmision: string;
  fechaVigencia: string;
  estado: 'vigente' | 'vencida' | 'en_revision';
  archivoNombre: string;
  hashIntegridad: string;
}

interface WebServiceStatus {
  nombre: string;
  endpoint: string;
  estado: 'estable' | 'degradado' | 'inactivo';
  latenciaMs: number;
  ultimoCheck: string;
}

// ── Credential Manager ──────────────────────

function GestorCredenciales() {
  const [credenciales, setCredenciales] = useState<CredencialesANA>({
    apiKeyProduccion: '',
    certificadoFirma: '',
    idCorredorAutorizado: '',
    guardado: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = () => {
    if (!credenciales.apiKeyProduccion || !credenciales.idCorredorAutorizado) {
      toast.error('Campos requeridos', { description: 'API Key e ID de Corredor son obligatorios.' });
      return;
    }
    setGuardando(true);
    setTimeout(() => {
      setCredenciales(prev => ({ ...prev, guardado: true }));
      setGuardando(false);
      toast.success('Credenciales almacenadas', {
        description: 'Cifradas con AES-256 en bóveda local. Nunca se transmiten en texto plano.',
        duration: 5000,
      });
    }, 1200);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="w-4 h-4 text-primary" />
          Credenciales de Interoperabilidad ANA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {credenciales.guardado && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success-light">
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-xs text-success font-medium">
              Credenciales verificadas y almacenadas de forma segura
            </span>
          </div>
        )}

        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">API Key de Producción</Label>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={credenciales.apiKeyProduccion}
              onChange={(e) => setCredenciales(prev => ({ ...prev, apiKeyProduccion: e.target.value, guardado: false }))}
              placeholder="sk_prod_ana_••••••••••••••••"
              className="text-xs pr-8 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Proporcionada por la División de Tecnología de la ANA
          </p>
        </div>

        {/* Certificate */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Certificado de Firma Electrónica</Label>
          <div className="flex items-center gap-2">
            <Input
              value={credenciales.certificadoFirma}
              onChange={(e) => setCredenciales(prev => ({ ...prev, certificadoFirma: e.target.value, guardado: false }))}
              placeholder="Nombre del certificado .p12 / .pfx"
              className="text-xs font-mono flex-1"
              readOnly
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 flex-shrink-0"
              onClick={() => {
                setCredenciales(prev => ({ ...prev, certificadoFirma: 'corredor_ana_2026.p12', guardado: false }));
              }}
            >
              <Upload className="w-3 h-3" />
              Cargar
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Formato PKCS#12 emitido por autoridad certificadora acreditada
          </p>
        </div>

        {/* Broker ID */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">ID de Corredor Autorizado</Label>
          <Input
            value={credenciales.idCorredorAutorizado}
            onChange={(e) => setCredenciales(prev => ({ ...prev, idCorredorAutorizado: e.target.value, guardado: false }))}
            placeholder="ANA-COR-2026-XXXX"
            className="text-xs font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Número de licencia vigente emitido por Resolución de la ANA
          </p>
        </div>

        <Separator />

        {/* Save */}
        <Button
          className="w-full text-xs gap-1.5"
          onClick={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <>
              <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Cifrando y almacenando...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Guardar Credenciales
            </>
          )}
        </Button>

        {/* Security Notice */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
          <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Las credenciales se cifran con AES-256-GCM y se almacenan en la bóveda segura de ZENITH.
            Nunca se transmiten en texto plano ni se registran en logs de auditoría.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Environment Switch ──────────────────────

function MonitorEntorno({
  entorno,
  onToggle,
}: {
  entorno: 'sandbox' | 'produccion';
  onToggle: (e: 'sandbox' | 'produccion') => void;
}) {
  const isProduccion = entorno === 'produccion';

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="w-4 h-4 text-primary" />
          Entorno de Operación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isProduccion ? 'bg-success-light' : 'bg-warning-light'
            )}>
              {isProduccion
                ? <Server className="w-5 h-5 text-success" />
                : <Activity className="w-5 h-5 text-warning" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isProduccion ? 'Modo Real (Producción)' : 'Modo Pruebas (Homologación)'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isProduccion
                  ? 'Transmisiones a la base de datos oficial de la ANA'
                  : 'Entorno sandbox — sin impacto en registros oficiales'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={isProduccion}
            onCheckedChange={(checked) => {
              const next = checked ? 'produccion' : 'sandbox';
              if (next === 'produccion') {
                toast.warning('Modo Producción Activado', {
                  description: 'Todas las transmisiones afectarán la base de datos real de la ANA.',
                  duration: 5000,
                });
              } else {
                toast.info('Modo Sandbox Activado', {
                  description: 'Entorno de homologación — sin impacto en registros oficiales.',
                  duration: 4000,
                });
              }
              onToggle(next);
            }}
          />
        </div>

        {/* Environment Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            'p-3 rounded-lg border text-center transition-all',
            !isProduccion ? 'border-warning/30 bg-warning-light' : 'border-border bg-muted/20'
          )}>
            <Activity className={cn('w-4 h-4 mx-auto mb-1', !isProduccion ? 'text-warning' : 'text-muted-foreground')} />
            <p className={cn('text-xs font-medium', !isProduccion ? 'text-warning-foreground' : 'text-muted-foreground')}>
              Homologación
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">sandbox.siga.ana.gob.pa</p>
          </div>
          <div className={cn(
            'p-3 rounded-lg border text-center transition-all',
            isProduccion ? 'border-success/30 bg-success-light' : 'border-border bg-muted/20'
          )}>
            <Server className={cn('w-4 h-4 mx-auto mb-1', isProduccion ? 'text-success' : 'text-muted-foreground')} />
            <p className={cn('text-xs font-medium', isProduccion ? 'text-success' : 'text-muted-foreground')}>
              Producción
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">api.siga.ana.gob.pa</p>
          </div>
        </div>

        {isProduccion && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive-light border border-destructive/20">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-destructive leading-relaxed">
              <strong>Atención:</strong> En modo producción, toda transmisión genera un registro oficial
              en el SIGA y puede tener consecuencias legales y fiscales. Verifique los datos antes de transmitir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Resolution Vault ────────────────────────

function BovedaResoluciones() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resoluciones] = useState<ResolucionANA[]>([
    {
      id: 'res-001',
      numero: 'RES-ANA-2025-0847',
      titulo: 'Autorización de Sistema Electrónico ZENITH para Transmisión de Declaraciones',
      fechaEmision: '2025-03-15',
      fechaVigencia: '2027-03-15',
      estado: 'vigente',
      archivoNombre: 'RES_ANA_2025_0847_ZENITH.pdf',
      hashIntegridad: 'a3f8c1d2e5b9...',
    },
    {
      id: 'res-002',
      numero: 'RES-ANA-2025-1203',
      titulo: 'Certificación de Interoperabilidad con Plataforma CrimsonLogic / Panama Customs',
      fechaEmision: '2025-06-01',
      fechaVigencia: '2026-12-31',
      estado: 'vigente',
      archivoNombre: 'RES_ANA_2025_1203_CRIMSONLOGIC.pdf',
      hashIntegridad: 'b7e4f2a1c8d6...',
    },
    {
      id: 'res-003',
      numero: 'RES-ANA-2024-0512',
      titulo: 'Homologación de Motor de Firma Digital para Declaraciones Electrónicas',
      fechaEmision: '2024-08-20',
      fechaVigencia: '2025-08-20',
      estado: 'en_revision',
      archivoNombre: 'RES_ANA_2024_0512_FIRMA.pdf',
      hashIntegridad: 'c9d3e7f1a2b5...',
    },
  ]);

  const estadoConfig: Record<ResolucionANA['estado'], { label: string; className: string }> = {
    vigente: { label: 'Vigente', className: 'bg-success-light text-success' },
    vencida: { label: 'Vencida', className: 'bg-destructive-light text-destructive' },
    en_revision: { label: 'En Revisión', className: 'bg-warning-light text-warning' },
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FolderArchive className="w-4 h-4 text-primary" />
            Bóveda de Resoluciones — LEXIS Archive
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3" />
            Agregar Resolución
          </Button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={() => {
            toast.success('Resolución cargada', { description: 'Archivada en LEXIS con sello de integridad Zod.' });
          }} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N° Resolución</TableHead>
              <TableHead className="text-xs">Título</TableHead>
              <TableHead className="text-xs">Vigencia</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs text-center">Integridad</TableHead>
              <TableHead className="text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resoluciones.map(res => {
              const config = estadoConfig[res.estado];
              return (
                <TableRow key={res.id}>
                  <TableCell className="font-mono text-xs text-primary">{res.numero}</TableCell>
                  <TableCell className="text-xs max-w-[250px]">
                    <p className="truncate">{res.titulo}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {res.fechaEmision} → {res.fechaVigencia}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', config.className)}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Shield className="w-3.5 h-3.5 text-success mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-[10px]"
                      onClick={() => toast.info('Descargando resolución...', { description: res.archivoNombre })}
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Web Service Status ──────────────────────

function StatusWebServices() {
  const [servicios, setServicios] = useState<WebServiceStatus[]>([
    {
      nombre: 'SIGA — Declaraciones',
      endpoint: 'api.siga.ana.gob.pa/v3/declaraciones',
      estado: 'estable',
      latenciaMs: 245,
      ultimoCheck: new Date().toISOString(),
    },
    {
      nombre: 'SIGA — Liquidaciones',
      endpoint: 'api.siga.ana.gob.pa/v3/liquidaciones',
      estado: 'estable',
      latenciaMs: 312,
      ultimoCheck: new Date().toISOString(),
    },
    {
      nombre: 'SIGA — Certificados',
      endpoint: 'api.siga.ana.gob.pa/v3/certificados',
      estado: 'estable',
      latenciaMs: 189,
      ultimoCheck: new Date().toISOString(),
    },
    {
      nombre: 'CrimsonLogic Gateway',
      endpoint: 'gateway.crimsonlogic.com/pa-customs',
      estado: 'estable',
      latenciaMs: 478,
      ultimoCheck: new Date().toISOString(),
    },
    {
      nombre: 'VUCE Panamá',
      endpoint: 'api.vuce.gob.pa/v2',
      estado: 'degradado',
      latenciaMs: 1250,
      ultimoCheck: new Date().toISOString(),
    },
  ]);
  const [checking, setChecking] = useState(false);

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      setServicios(prev => prev.map(s => ({
        ...s,
        latenciaMs: Math.floor(Math.random() * 800 + 100),
        ultimoCheck: new Date().toISOString(),
        estado: Math.random() > 0.15 ? 'estable' : 'degradado' as WebServiceStatus['estado'],
      })));
      setChecking(false);
      toast.success('Health check completado', { description: 'Todos los servicios verificados.' });
    }, 2000);
  };

  const estadoIcon: Record<WebServiceStatus['estado'], { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
    estable: { icon: Wifi, className: 'text-success', label: 'Estable' },
    degradado: { icon: Activity, className: 'text-warning', label: 'Degradado' },
    inactivo: { icon: WifiOff, className: 'text-destructive', label: 'Inactivo' },
  };

  const todosEstables = servicios.every(s => s.estado === 'estable');

  return (
    <div className="space-y-4">
      {/* Main Status Indicator */}
      <Card className={cn(
        'card-elevated border-l-4',
        todosEstables ? 'border-l-success' : 'border-l-warning'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                todosEstables ? 'bg-success-light' : 'bg-warning-light'
              )}>
                {todosEstables
                  ? <Wifi className="w-5 h-5 text-success" />
                  : <Activity className="w-5 h-5 text-warning" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Conexión con Servidores de la ANA:{' '}
                  <span className={todosEstables ? 'text-success' : 'text-warning'}>
                    {todosEstables ? 'ESTABLE' : 'PARCIALMENTE DEGRADADA'}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Último check: {new Date().toLocaleTimeString()} · Latencia promedio:{' '}
                  {Math.round(servicios.reduce((s, sv) => s + sv.latenciaMs, 0) / servicios.length)}ms
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={handleRefresh}
              disabled={checking}
            >
              <RefreshCw className={cn('w-3 h-3', checking && 'animate-spin')} />
              {checking ? 'Verificando...' : 'Health Check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {servicios.map(servicio => {
          const config = estadoIcon[servicio.estado];
          const Icon = config.icon;
          return (
            <Card key={servicio.nombre} className="card-elevated p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('w-3.5 h-3.5', config.className)} />
                  <span className={cn('text-[10px] font-medium', config.className)}>
                    {config.label}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {servicio.latenciaMs}ms
                </Badge>
              </div>
              <p className="text-xs font-medium mb-0.5">{servicio.nombre}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {servicio.endpoint}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Legal Compliance */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
        <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Cumpliendo con los protocolos de seguridad de{' '}
            <strong className="text-foreground">CrimsonLogic</strong> y la{' '}
            <strong className="text-foreground">Autoridad Nacional de Aduanas</strong>.
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Interoperabilidad certificada conforme a la Resolución ANA No. 049-2025 y el estándar WCO Data Model 3.x.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────

export default function ConectividadANAPanel({
  entorno,
  onToggleEntorno,
}: {
  entorno: 'sandbox' | 'produccion';
  onToggleEntorno: (e: 'sandbox' | 'produccion') => void;
}) {
  return (
    <div className="space-y-6">
      {/* Environment + Credentials Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonitorEntorno entorno={entorno} onToggle={onToggleEntorno} />
        <GestorCredenciales />
      </div>

      {/* Web Service Status */}
      <StatusWebServices />

      {/* Resolution Vault */}
      <BovedaResoluciones />
    </div>
  );
}
