/**
 * Data Integrity Shield — Dashboard de Protección de Datos
 * 
 * Módulos:
 * 1. Sanitización de inputs (demo)
 * 2. Validación matemática de liquidaciones
 * 3. Verificación de HS Codes
 * 4. Visor de eventos de seguridad
 * 5. Modal de Alerta Roja
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Search,
  Lock, Eye, FileWarning, Zap, ShieldAlert, Activity,
  Bug, Calculator, Hash, Bell, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DataIntegrityEngine,
  type SanitizationResult,
  type HSCodeValidation,
  type ManifestTaxValidation,
} from '@/lib/security/DataIntegrityEngine';

// ─── Sanitization Tab ────────────────────────────────

function SanitizationPanel() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SanitizationResult | null>(null);

  const runSanitization = () => {
    const res = DataIntegrityEngine.sanitizeInput(input);
    setResult(res);
  };

  const demoInjections = [
    "Robert'; DROP TABLE students;--",
    "1 OR 1=1 UNION SELECT * FROM users",
    "<script>alert('xss')</script>Hello",
    "admin' AND 1=CAST((SELECT password FROM users) AS int)--",
    "Normal product description: iPhone 15 Pro Max 256GB",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bug className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold">Sanitización de Inputs — SQL Injection Prevention</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ingrese texto para sanitizar..."
          className="font-mono text-xs min-h-[80px]"
        />
        <div className="flex items-center gap-2">
          <Button onClick={runSanitization} size="sm" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Sanitizar
          </Button>
          <span className="text-[10px] text-muted-foreground">o pruebe un ejemplo:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {demoInjections.map((demo, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-[10px] h-6 font-mono"
              onClick={() => { setInput(demo); setResult(null); }}
            >
              Demo {i + 1}
            </Button>
          ))}
        </div>
      </div>

      {result && (
        <div className={cn(
          'p-4 rounded-lg border space-y-3',
          result.hadThreats ? 'border-destructive/50 bg-destructive/5' : 'border-success/50 bg-success/5'
        )}>
          <div className="flex items-center gap-2">
            {result.hadThreats ? (
              <><ShieldAlert className="w-4 h-4 text-destructive" /><span className="text-sm font-semibold text-destructive">AMENAZAS DETECTADAS Y NEUTRALIZADAS</span></>
            ) : (
              <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-sm font-semibold text-success">Input limpio — sin amenazas</span></>
            )}
          </div>

          {result.hadThreats && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Vectores de ataque detectados:</p>
              {result.threatsDetected.map((threat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                  <span className="font-mono text-destructive">{threat}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Output sanitizado:</p>
            <div className="p-2 rounded bg-background border border-border font-mono text-xs break-all">
              {result.clean || '(vacío después de sanitización)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HS Code Validation Tab ─────────────────────────

function HSCodePanel() {
  const [hsCode, setHsCode] = useState('');
  const [result, setResult] = useState<HSCodeValidation | null>(null);

  const validate = () => {
    const res = DataIntegrityEngine.validateHSCode(hsCode);
    setResult(res);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Validación de Partida Arancelaria (HS Code)</h3>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={hsCode}
          onChange={(e) => setHsCode(e.target.value)}
          placeholder="Ej: 8471300000 (10 dígitos)"
          className="font-mono text-xs max-w-xs"
        />
        <Button onClick={validate} size="sm" className="gap-1.5">
          <Search className="w-3.5 h-3.5" /> Validar
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['8471300000', '0402210000', '9999999999', '847130', '3004'].map(code => (
          <Button
            key={code}
            variant="outline"
            size="sm"
            className="text-[10px] h-6 font-mono"
            onClick={() => { setHsCode(code); setResult(null); }}
          >
            {code}
          </Button>
        ))}
      </div>

      {result && (
        <div className={cn(
          'p-4 rounded-lg border space-y-3',
          result.valid ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'
        )}>
          <div className="flex items-center gap-2">
            {result.valid ? (
              <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-sm font-semibold text-success">HS Code VÁLIDO</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm font-semibold text-destructive">HS Code INVÁLIDO</span></>
            )}
            <Badge variant="outline" className="font-mono text-xs">{result.code}</Badge>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                  <span className="text-destructive">{err}</span>
                </div>
              ))}
            </div>
          )}

          {result.arancelMatch && (
            <div className="p-3 rounded-md bg-background border border-border">
              <p className="text-xs font-semibold mb-2">Datos del Arancel Nacional 2026:</p>
              <p className="text-xs text-muted-foreground mb-2">{result.arancelMatch.descripcion}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">DAI</p>
                  <p className="text-sm font-bold">{result.arancelMatch.dai}%</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">ITBMS</p>
                  <p className="text-sm font-bold">{result.arancelMatch.itbms}%</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">ISC</p>
                  <p className="text-sm font-bold">{result.arancelMatch.isc}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Math Validation Tab ────────────────────────────

function MathValidationPanel() {
  const [result, setResult] = useState<ManifestTaxValidation | null>(null);

  const runDemo = () => {
    // Demo: HAWBs don't match manifest total
    const hawbTaxes = [15.20, 22.50, 8.75, 31.00, 12.55];
    const manifestTotal = 92.00; // Should be 90.00 — deliberate mismatch
    const res = DataIntegrityEngine.validateManifestTaxCoherence(hawbTaxes, manifestTotal);
    setResult(res);
  };

  const runCleanDemo = () => {
    const hawbTaxes = [15.20, 22.50, 8.75, 31.00, 12.55];
    const manifestTotal = 90.00;
    const res = DataIntegrityEngine.validateManifestTaxCoherence(hawbTaxes, manifestTotal);
    setResult(res);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold">Validación Matemática de Liquidación</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Regla: <code className="font-mono bg-muted px-1 rounded">IF Sum(HAWBs.Taxes) ≠ Manifest.TotalTaxes THEN FLAG_ERROR</code>
      </p>

      <div className="flex gap-2">
        <Button onClick={runDemo} size="sm" variant="destructive" className="gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Demo con Error
        </Button>
        <Button onClick={runCleanDemo} size="sm" variant="outline" className="gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Demo Limpio
        </Button>
      </div>

      {result && (
        <div className={cn(
          'p-4 rounded-lg border space-y-3',
          result.valid ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'
        )}>
          <div className="flex items-center gap-2">
            {result.valid ? (
              <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-sm font-semibold text-success">COHERENCIA VERIFICADA</span></>
            ) : (
              <><ShieldAlert className="w-4 h-4 text-destructive" /><span className="text-sm font-semibold text-destructive">ERROR DE COHERENCIA DETECTADO</span></>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded bg-background border border-border">
              <p className="text-[10px] text-muted-foreground">Sum(HAWBs)</p>
              <p className="text-sm font-bold font-mono">${result.hawbTotalTaxes.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded bg-background border border-border">
              <p className="text-[10px] text-muted-foreground">Manifest Total</p>
              <p className="text-sm font-bold font-mono">${result.manifestTotalTaxes.toFixed(2)}</p>
            </div>
            <div className={cn('p-2 rounded border', result.flagged ? 'bg-destructive/10 border-destructive/30' : 'bg-background border-border')}>
              <p className="text-[10px] text-muted-foreground">Diferencia</p>
              <p className={cn('text-sm font-bold font-mono', result.flagged && 'text-destructive')}>
                ${result.difference.toFixed(2)}
              </p>
            </div>
            <div className={cn('p-2 rounded border', result.flagged ? 'bg-destructive/10 border-destructive/30' : 'bg-background border-border')}>
              <p className="text-[10px] text-muted-foreground">% Desviación</p>
              <p className={cn('text-sm font-bold font-mono', result.flagged && 'text-destructive')}>
                {result.percentDiff.toFixed(2)}%
              </p>
            </div>
          </div>

          {result.flagged && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <p className="text-xs font-semibold text-destructive">⚠️ Acción requerida:</p>
              <p className="text-xs text-muted-foreground mt-1">
                La suma de impuestos individuales no coincide con el total del manifiesto. 
                Revise cada guía y recalcule antes de transmitir al SIGA.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Security Events Viewer ─────────────────────────

function SecurityEventsViewer() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setEvents(data);
      }
    } catch {
      // User may not have access
    }
    setLoading(false);
  };

  const SEVERITY_STYLES: Record<string, string> = {
    info: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/20 text-warning',
    critical: 'bg-destructive/20 text-destructive',
    emergency: 'bg-destructive text-destructive-foreground',
  };

  const filteredEvents = events.filter(e =>
    !filter ||
    e.event_type?.toLowerCase().includes(filter.toLowerCase()) ||
    e.description?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Security Events Log</h3>
          <Badge variant="outline" className="text-[10px]">{events.length} eventos</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadEvents} className="gap-1.5 text-xs">
          <Zap className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar eventos..."
        className="text-xs"
      />

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando eventos...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay eventos de seguridad registrados</p>
          <p className="text-xs text-muted-foreground mt-1">Los eventos aparecerán aquí cuando se detecten acciones de seguridad</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border max-h-[400px] overflow-auto">
          {filteredEvents.map(event => (
            <div key={event.id} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn('text-[9px] h-4', SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info)}>
                  {event.severity?.toUpperCase()}
                </Badge>
                <span className="text-xs font-mono font-semibold text-foreground">{event.event_type}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(event.created_at).toLocaleString('es-PA')}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground">{event.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                {event.device_fingerprint && (
                  <span className="font-mono">FP: {event.device_fingerprint}</span>
                )}
                {event.event_category && (
                  <Badge variant="secondary" className="text-[9px] h-4">{event.event_category}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Red Alert Modal ────────────────────────────────

function RedAlertModal({
  open,
  onClose,
  alerts,
}: {
  open: boolean;
  onClose: () => void;
  alerts: Array<{ type: string; message: string; severity: string; timestamp: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-destructive/50 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            ALERTA ROJA — Brecha de Seguridad Detectada
          </DialogTitle>
          <DialogDescription>
            Se han detectado anomalías críticas que requieren atención inmediata del administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-auto">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                'p-3 rounded-lg border',
                alert.severity === 'emergency' ? 'border-destructive bg-destructive/10' : 'border-warning bg-warning/10'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={cn(
                  'w-4 h-4',
                  alert.severity === 'emergency' ? 'text-destructive' : 'text-warning'
                )} />
                <span className="text-xs font-semibold">{alert.type}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{alert.timestamp}</span>
              </div>
              <p className="text-xs text-muted-foreground">{alert.message}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={onClose}>
            <Eye className="w-3.5 h-3.5" /> Investigar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ─────────────────────────────────

export default function DataIntegrityShield() {
  const { role } = useAuth();
  const [redAlertOpen, setRedAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sanitization');

  const demoAlerts = [
    {
      type: 'INJECTION_ATTEMPT',
      message: 'Se detectó un intento de SQL Injection en el campo de búsqueda de consignatarios. El ataque fue neutralizado y el input sanitizado.',
      severity: 'emergency',
      timestamp: new Date().toLocaleString('es-PA'),
    },
    {
      type: 'INTEGRITY_BREACH',
      message: 'Discrepancia masiva: Sum(HAWBs.Taxes) difiere del Manifest.TotalTaxes en 15.3%. Se bloqueó la transmisión al SIGA.',
      severity: 'emergency',
      timestamp: new Date(Date.now() - 300000).toLocaleString('es-PA'),
    },
    {
      type: 'DLP_VIOLATION',
      message: 'Usuario rol "operador" intentó exportar masivamente los datos de Identificación Fiscal de 200+ clientes.',
      severity: 'critical',
      timestamp: new Date(Date.now() - 900000).toLocaleString('es-PA'),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Data Integrity Shield</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">ENTERPRISE</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Sanitización · Validación Matemática · HS Code Verification · Security Events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md border border-border">
            <Lock className="w-3 h-3 text-success" />
            <span className="text-[10px] font-mono text-muted-foreground">AES-256 · RLS Active</span>
          </div>
          {(role === 'admin' || role === 'auditor') && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setRedAlertOpen(true)}
            >
              <Bell className="w-3.5 h-3.5" />
              Alerta Roja Demo
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sanitización', icon: Bug, status: 'Activa', color: 'text-success' },
          { label: 'RLS', icon: Lock, status: 'Enforced', color: 'text-success' },
          { label: 'AES-256', icon: Shield, status: 'Habilitado', color: 'text-success' },
          { label: 'Events Log', icon: Activity, status: 'Recording', color: 'text-primary' },
        ].map(item => (
          <div key={item.label} className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={cn('w-4 h-4', item.color)} />
              <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
            </div>
            <p className={cn('text-sm font-bold', item.color)}>{item.status}</p>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="sanitization" className="text-xs gap-1.5">
            <Bug className="w-3.5 h-3.5" /> Sanitización
          </TabsTrigger>
          <TabsTrigger value="hscode" className="text-xs gap-1.5">
            <Hash className="w-3.5 h-3.5" /> HS Code
          </TabsTrigger>
          <TabsTrigger value="math" className="text-xs gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> Matemáticas
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Events
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 card-elevated p-6">
          <TabsContent value="sanitization" className="mt-0">
            <SanitizationPanel />
          </TabsContent>
          <TabsContent value="hscode" className="mt-0">
            <HSCodePanel />
          </TabsContent>
          <TabsContent value="math" className="mt-0">
            <MathValidationPanel />
          </TabsContent>
          <TabsContent value="events" className="mt-0">
            <SecurityEventsViewer />
          </TabsContent>
        </div>
      </Tabs>

      {/* Red Alert Modal */}
      <RedAlertModal
        open={redAlertOpen}
        onClose={() => setRedAlertOpen(false)}
        alerts={demoAlerts}
      />
    </div>
  );
}
