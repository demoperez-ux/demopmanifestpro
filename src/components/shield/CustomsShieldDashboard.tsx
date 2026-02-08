/**
 * CUSTOMS SHIELD — Dashboard de Seguridad y Anti-Fraude
 * 
 * Interfaz de los 4 pilares de detección:
 * 1. Narcóticos y Opioides
 * 2. GTIN/HS Mismatch
 * 3. Valoración Forense
 * 4. Armamento y Explosivos
 */

import { useState, useMemo } from 'react';
import {
  Shield, Biohazard, AlertTriangle, Scale, Crosshair,
  Download, FileWarning, Lock, Eye, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  CustomsShieldEngine,
  type ResultadoShield,
  type ResumenShield,
  type AlertaShield,
  type TipoAlertaShield,
  type SeveridadShield,
} from '@/lib/compliance/CustomsShieldEngine';
import { generarManifiestoDemo } from '@/lib/demo/StressTestEngine';

const TIPO_CONFIG: Record<TipoAlertaShield, { label: string; icon: typeof Shield; color: string }> = {
  narcotico: { label: 'Narcóticos / Opioides', icon: Biohazard, color: 'text-destructive' },
  gtin_mismatch: { label: 'GTIN/HS Mismatch', icon: AlertTriangle, color: 'text-zod' },
  valoracion_forense: { label: 'Valoración Forense', icon: Scale, color: 'text-warning' },
  armamento: { label: 'Armamento / Explosivos', icon: Crosshair, color: 'text-destructive' },
};

const SEVERIDAD_BADGE: Record<SeveridadShield, { label: string; className: string }> = {
  critico: { label: 'CRÍTICO', className: 'bg-destructive text-destructive-foreground' },
  alto: { label: 'ALTO', className: 'bg-zod text-zod-foreground' },
  medio: { label: 'MEDIO', className: 'bg-warning text-warning-foreground' },
  bajo: { label: 'BAJO', className: 'bg-muted text-muted-foreground' },
};

export default function CustomsShieldDashboard() {
  const [resultados, setResultados] = useState<ResultadoShield[]>([]);
  const [resumen, setResumen] = useState<ResumenShield | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoAlertaShield | 'all'>('all');
  const [expandedAlerta, setExpandedAlerta] = useState<string | null>(null);

  const ejecutarScan = async () => {
    setEjecutando(true);
    setResultados([]);
    setResumen(null);

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 600));

    // Generate demo manifest with some injected security threats
    const guias = generarManifiestoDemo(689);

    // Inject security-sensitive items for demo
    const threats = [
      { desc: 'Pill Press Machine Industrial Grade', val: 2500 },
      { desc: 'Fentanyl Test Strips 100pk', val: 15 },
      { desc: 'Piperidine Reagent Grade 500ml', val: 45 },
      { desc: 'Lower Receiver AR-15 Assembly', val: 120 },
      { desc: 'Electronic Detonator Timer Module', val: 35 },
      { desc: 'Silencer Adapter 9mm Thread', val: 85 },
      { desc: 'Whisky Johnnie Walker 1L', val: 8, hs: '8471.30' },
      { desc: 'Vodka Absolut 750ml', val: 5, hs: '8517.12' },
      { desc: 'Night Vision Scope Gen3', val: 1200 },
      { desc: 'Synthetic Cannabinoid Research', val: 50 },
      { desc: 'Body Armor Plate Level IV', val: 300 },
      { desc: 'Cigarette Bulk 100 Cartons', val: 12, hs: '3926.90' },
    ];

    threats.forEach((t, i) => {
      const idx = Math.min(i * 50 + 10, guias.length - 1);
      guias[idx] = {
        ...guias[idx],
        description: t.desc,
        valueUSD: t.val,
        hsCode: (t as any).hs || guias[idx].hsCode,
      };
    });

    // Also inject some low-value heavy items for forensic valuation
    for (let i = 0; i < 8; i++) {
      const idx = 100 + i * 60;
      if (idx < guias.length) {
        guias[idx] = {
          ...guias[idx],
          description: 'Miscellaneous Goods Unspecified',
          valueUSD: 3 + Math.random() * 5,
          weight: 15 + Math.random() * 20, // 15-35 lb = 7-16 kg
        };
      }
    }

    const { resultados: res, resumen: sum } = CustomsShieldEngine.analizarManifiesto(guias);
    setResultados(res);
    setResumen(sum);
    setEjecutando(false);
  };

  const alertasConAmenaza = useMemo(() => {
    const conAlerta = resultados.filter(r => r.alertas.length > 0);
    if (filtroTipo === 'all') return conAlerta;
    return conAlerta.filter(r => r.alertas.some(a => a.tipo === filtroTipo));
  }, [resultados, filtroTipo]);

  const descargarReporte = () => {
    if (!resumen) return;
    const reporte = CustomsShieldEngine.generarReporteSeguridad(resumen.reporteSeguridad);
    const blob = new Blob([reporte], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CUSTOMS_SHIELD_SECURITY_REPORT_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-destructive" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Customs Shield</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">ANTI-FRAUDE</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Protocolos de seguridad: Narcóticos · GTIN/HS Mismatch · Valoración Forense · Armamento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md border border-border">
            <Lock className="w-3 h-3 text-success" />
            <span className="text-[10px] font-mono text-muted-foreground">Entorno Seguro ANA</span>
          </div>
          <Button onClick={ejecutarScan} disabled={ejecutando} className="gap-2 font-semibold">
            <Shield className="w-4 h-4" />
            {ejecutando ? 'Escaneando...' : 'Ejecutar Scan de Seguridad'}
          </Button>
        </div>
      </div>

      {/* Resumen de Pilares */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
          {(Object.keys(TIPO_CONFIG) as TipoAlertaShield[]).map(tipo => {
            const config = TIPO_CONFIG[tipo];
            const Icon = config.icon;
            const count = resumen.porTipo[tipo];
            const active = filtroTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(active ? 'all' : tipo)}
                className={cn(
                  'card-elevated p-4 text-left transition-all hover:shadow-md',
                  active && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', config.color)} />
                  <span className="text-xs font-semibold text-muted-foreground">{config.label}</span>
                </div>
                <p className={cn('text-2xl font-bold', count > 0 ? config.color : 'text-muted-foreground')}>
                  {count}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">alertas detectadas</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Resumen de Severidad */}
      {resumen && (
        <div className="flex items-center gap-4 card-elevated p-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Resultados:</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span>{resumen.totalAnalizadas} guías escaneadas</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-destructive font-semibold">{resumen.porSeveridad.critico} CRÍTICAS</span>
            <span className="text-zod font-semibold">{resumen.porSeveridad.alto} ALTAS</span>
            <span className="text-warning font-semibold">{resumen.porSeveridad.medio} MEDIAS</span>
            <span>{resumen.totalBloqueadas} liquidaciones bloqueadas</span>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={descargarReporte}>
              <Download className="w-3.5 h-3.5" />
              Reporte ANA
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Alertas */}
      {alertasConAmenaza.length > 0 && (
        <div className="card-elevated animate-slide-up">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Alertas de Seguridad ({alertasConAmenaza.length})
            </h2>
            {filtroTipo !== 'all' && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFiltroTipo('all')}>
                Mostrar todas
              </Button>
            )}
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-auto scrollbar-thin">
            {alertasConAmenaza.map(r => (
              <AlertaRow
                key={r.guia.id}
                resultado={r}
                expanded={expandedAlerta === r.guia.id}
                onToggle={() => setExpandedAlerta(expandedAlerta === r.guia.id ? null : r.guia.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {resumen && alertasConAmenaza.length === 0 && filtroTipo !== 'all' && (
        <div className="card-elevated p-8 text-center">
          <p className="text-muted-foreground text-sm">No hay alertas de tipo "{TIPO_CONFIG[filtroTipo as TipoAlertaShield]?.label}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: AlertaRow ────────────────────────────

function AlertaRow({ resultado, expanded, onToggle }: {
  resultado: ResultadoShield;
  expanded: boolean;
  onToggle: () => void;
}) {
  const mainAlerta = resultado.alertas[0];
  const config = TIPO_CONFIG[mainAlerta.tipo];
  const Icon = config.icon;
  const sevBadge = SEVERIDAD_BADGE[mainAlerta.severidad];

  return (
    <div className={cn('transition-colors', resultado.bloqueado && 'bg-destructive-light/30')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-muted-foreground">{resultado.guia.trackingNumber}</span>
            <Badge className={cn('text-[9px] h-4', sevBadge.className)}>{sevBadge.label}</Badge>
            {resultado.bloqueado && (
              <Badge variant="outline" className="text-[9px] h-4 border-destructive/40 text-destructive gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                Bloqueado
              </Badge>
            )}
          </div>
          <p className="text-xs text-foreground truncate">{resultado.guia.description}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{mainAlerta.detalle}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-3 animate-fade-in">
          {resultado.alertas.map((alerta, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={cn('text-[9px]', SEVERIDAD_BADGE[alerta.severidad].className)}>
                  {TIPO_CONFIG[alerta.tipo].label}
                </Badge>
              </div>

              {/* Stella Message */}
              <div className="panel-stella p-3 rounded-md">
                <p className="text-xs font-semibold text-foreground mb-1">Stella — Compliance Alert</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{alerta.stellaMensaje}</p>
              </div>

              {/* Legal & Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                <div className="bg-muted/50 p-2 rounded">
                  <p className="font-semibold text-foreground mb-0.5">Fundamento Legal</p>
                  <p className="text-muted-foreground">{alerta.fundamentoLegal}</p>
                </div>
                <div className={cn('p-2 rounded', alerta.bloqueaLiquidacion ? 'bg-destructive-light' : 'bg-warning-light')}>
                  <p className="font-semibold text-foreground mb-0.5">Acción Requerida</p>
                  <p className="text-muted-foreground">{alerta.accionRequerida}</p>
                </div>
              </div>

              {/* Keywords */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[9px] text-muted-foreground">Keywords:</span>
                {alerta.keywordsDetectadas.map((kw, j) => (
                  <Badge key={j} variant="secondary" className="text-[9px] h-4 font-mono">{kw}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
