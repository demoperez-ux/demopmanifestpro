/**
 * HORIZONTE DE CARGA — Dashboard de Arribos Inminentes
 * Vista de embarques recibidos desde Orion FF, ordenados por ETA
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Ship, Plane, Truck, Clock, Shield, Sparkles, RefreshCw,
  AlertTriangle, CheckCircle2, FileText, ChevronRight,
  Anchor, Timer, Package, DollarSign, Search, Filter, X,
  Scale, ExternalLink, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription,
  DrawerFooter, DrawerHeader, DrawerTitle
} from '@/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────
interface EmbarqueOrion {
  id: string;
  orion_shipment_id: string;
  referencia: string;
  tipo_documento: string;
  shipper: string | null;
  consignatario: string;
  consignatario_ruc: string | null;
  origin_country: string;
  destination_country: string;
  descripcion_carga: string | null;
  peso_bruto_kg: number | null;
  bultos: number | null;
  valor_fob: number | null;
  valor_cif: number | null;
  moneda: string;
  modo_transporte: string;
  recinto_destino: string | null;
  buque_vuelo: string | null;
  eta: string | null;
  estado: string;
  salud_documental: number;
  pre_liquidacion: Record<string, unknown> | null;
  zod_validado: boolean;
  zod_hallazgos: string[];
  zod_duplicado_detectado: boolean;
  stella_notas: string[];
  created_at: string;
}

// ── Transport icons ─────────────────────────────────
const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  aereo: Plane,
  maritimo: Ship,
  terrestre: Truck,
};

// ── Status config ───────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-warning/15 text-warning border-warning/30' },
  en_proceso: { label: 'En Proceso', class: 'bg-info/15 text-info border-info/30' },
  pre_liquidado: { label: 'Pre-Liquidado', class: 'bg-success/15 text-success border-success/30' },
  aprobado: { label: 'Aprobado', class: 'bg-primary/15 text-primary border-primary/30' },
  rechazado: { label: 'Rechazado', class: 'bg-destructive/15 text-destructive border-destructive/30' },
  descartado: { label: 'Descartado', class: 'bg-muted text-muted-foreground border-border' },
};

// ── Helpers ─────────────────────────────────────────
function hoursUntilETA(eta: string | null): number | null {
  if (!eta) return null;
  const diff = new Date(eta).getTime() - Date.now();
  return Math.max(0, diff / (1000 * 60 * 60));
}

function formatETA(eta: string | null): string {
  if (!eta) return '—';
  const hours = hoursUntilETA(eta);
  if (hours === null) return '—';
  if (hours <= 0) return 'Arribado';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function healthBg(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-destructive';
}

// ── Main Component ──────────────────────────────────
export function HorizonteCarga() {
  const [embarques, setEmbarques] = useState<EmbarqueOrion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmbarque, setSelectedEmbarque] = useState<EmbarqueOrion | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterTransporte, setFilterTransporte] = useState<string>('all');

  const fetchEmbarques = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('embarques_orion')
        .select('*')
        .neq('estado', 'descartado')
        .order('eta', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Cast the JSONB fields properly
      const typed = (data || []).map(row => ({
        ...row,
        zod_hallazgos: Array.isArray(row.zod_hallazgos) ? row.zod_hallazgos as string[] : [],
        stella_notas: Array.isArray(row.stella_notas) ? row.stella_notas as string[] : [],
        pre_liquidacion: row.pre_liquidacion as Record<string, unknown> | null,
      }));

      setEmbarques(typed);
    } catch (err) {
      console.error('Error fetching embarques:', err);
      toast.error('Error al cargar embarques de Orion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmbarques();
  }, []);

  const filtered = useMemo(() => {
    return embarques.filter(e => {
      if (filterEstado !== 'all' && e.estado !== filterEstado) return false;
      if (filterTransporte !== 'all' && e.modo_transporte !== filterTransporte) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          e.referencia.toLowerCase().includes(term) ||
          e.consignatario.toLowerCase().includes(term) ||
          (e.shipper || '').toLowerCase().includes(term) ||
          (e.descripcion_carga || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [embarques, filterEstado, filterTransporte, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const arriving4h = embarques.filter(e => {
      const h = hoursUntilETA(e.eta);
      return h !== null && h > 0 && h <= 4;
    }).length;
    const preLiquidados = embarques.filter(e => e.estado === 'pre_liquidado').length;
    const avgHealth = embarques.length > 0
      ? Math.round(embarques.reduce((sum, e) => sum + e.salud_documental, 0) / embarques.length)
      : 0;
    const zodAlerts = embarques.filter(e => e.zod_hallazgos.length > 0).length;

    return { arriving4h, preLiquidados, avgHealth, zodAlerts, total: embarques.length };
  }, [embarques]);

  const openDrawer = (emb: EmbarqueOrion) => {
    setSelectedEmbarque(emb);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-stella" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-wide text-gradient">
              Horizonte de Carga
            </h1>
            <p className="text-sm text-muted-foreground">
              Embarques entrantes desde Orion FF — {stats.total} activos
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchEmbarques}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Timer className="w-4 h-4 text-destructive" />
            <span className="stat-label">Arribo &lt;4h</span>
          </div>
          <span className="stat-value text-destructive">{stats.arriving4h}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="stat-label">Pre-Liquidados</span>
          </div>
          <span className="stat-value text-success">{stats.preLiquidados}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="w-4 h-4 text-stella" />
            <span className="stat-label">Salud Documental</span>
          </div>
          <span className={`stat-value ${healthColor(stats.avgHealth)}`}>{stats.avgHealth}%</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Shield className="w-4 h-4 text-zod" />
            <span className="stat-label">Alertas Zod</span>
          </div>
          <span className="stat-value text-zod">{stats.zodAlerts}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por referencia, consignatario..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="pre_liquidado">Pre-Liquidado</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTransporte} onValueChange={setFilterTransporte}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Transporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modos</SelectItem>
            <SelectItem value="aereo">✈️ Aéreo</SelectItem>
            <SelectItem value="maritimo">🚢 Marítimo</SelectItem>
            <SelectItem value="terrestre">🚛 Terrestre</SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || filterEstado !== 'all' || filterTransporte !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchTerm(''); setFilterEstado('all'); setFilterTransporte('all'); }}
            className="gap-1 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3" /> Limpiar
          </Button>
        )}
      </div>

      {/* Shipment List */}
      <div className="space-y-3">
        {loading && embarques.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Cargando embarques desde Orion...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {embarques.length === 0
                  ? 'No hay embarques registrados desde Orion. Los embarques llegarán automáticamente via el endpoint de integración.'
                  : 'No se encontraron embarques con los filtros actuales.'}
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map(emb => {
          const hours = hoursUntilETA(emb.eta);
          const isUrgent = hours !== null && hours > 0 && hours <= 4;
          const TransportIcon = TRANSPORT_ICONS[emb.modo_transporte] || Package;
          const statusCfg = STATUS_CONFIG[emb.estado] || STATUS_CONFIG.pendiente;

          return (
            <button
              key={emb.id}
              onClick={() => openDrawer(emb)}
              className={`w-full text-left card-interactive p-4 ${
                isUrgent ? 'border-destructive/40 shadow-[0_0_15px_hsl(0_84%_60%/0.1)]' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Transport icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  emb.modo_transporte === 'aereo' ? 'bg-info/10 text-info' :
                  emb.modo_transporte === 'maritimo' ? 'bg-primary/10 text-primary' :
                  'bg-warning/10 text-warning'
                }`}>
                  <TransportIcon className="w-5 h-5" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {emb.referencia}
                    </span>
                    <Badge variant="outline" className={`text-[9px] ${statusCfg.class}`}>
                      {statusCfg.label}
                    </Badge>
                    {emb.zod_duplicado_detectado && (
                      <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Duplicado
                      </Badge>
                    )}
                    {emb.zod_hallazgos.length > 0 && !emb.zod_validado && (
                      <Badge variant="outline" className="text-[9px] bg-warning/10 text-zod border-warning/30 gap-1">
                        <Shield className="w-2.5 h-2.5" /> {emb.zod_hallazgos.length} hallazgos
                      </Badge>
                    )}
                    {emb.zod_validado && (
                      <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Validado
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-foreground/80 line-clamp-1">
                    {emb.consignatario}
                    {emb.descripcion_carga && ` — ${emb.descripcion_carga}`}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ETA: <span className={`font-mono font-semibold ${isUrgent ? 'text-destructive' : ''}`}>
                        {formatETA(emb.eta)}
                      </span>
                    </span>
                    {emb.valor_cif && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        CIF: ${emb.valor_cif.toLocaleString()}
                      </span>
                    )}
                    {emb.bultos && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {emb.bultos} bultos
                      </span>
                    )}
                    <span>{emb.origin_country} → {emb.destination_country}</span>
                  </div>

                  {/* Document Health bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground min-w-[80px]">Salud Documental</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[200px]">
                      <div
                        className={`h-full rounded-full transition-all ${healthBg(emb.salud_documental)}`}
                        style={{ width: `${emb.salud_documental}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${healthColor(emb.salud_documental)}`}>
                      {emb.salud_documental}%
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-3 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Drawer ──────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          {selectedEmbarque && (
            <EmbarqueDrawerContent
              embarque={selectedEmbarque}
              onClose={() => setDrawerOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ── Drawer Content ──────────────────────────────────
function EmbarqueDrawerContent({
  embarque: emb,
  onClose,
}: {
  embarque: EmbarqueOrion;
  onClose: () => void;
}) {
  const statusCfg = STATUS_CONFIG[emb.estado] || STATUS_CONFIG.pendiente;
  const preLiq = emb.pre_liquidacion;

  return (
    <>
      <DrawerHeader className="text-left">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/40">
            <AvatarFallback className="bg-primary/10 text-stella font-bold text-sm">
              <Anchor className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <DrawerTitle className="font-display tracking-wide text-lg">
              {emb.referencia}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {emb.consignatario} — Orion #{emb.orion_shipment_id}
            </DrawerDescription>
          </div>
          <Badge variant="outline" className={`ml-auto text-[10px] ${statusCfg.class}`}>
            {statusCfg.label}
          </Badge>
        </div>
      </DrawerHeader>

      <div className="px-4 pb-2 space-y-4 overflow-y-auto scrollbar-thin">
        {/* Shipment Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Embarcador</span>
            <p className="font-medium">{emb.shipper || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">RUC/Cédula</span>
            <p className="font-mono text-xs">{emb.consignatario_ruc || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Ruta</span>
            <p className="font-medium">{emb.origin_country} → {emb.destination_country}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">ETA</span>
            <p className="font-mono font-semibold">{formatETA(emb.eta)}</p>
          </div>
          {emb.buque_vuelo && (
            <div>
              <span className="text-muted-foreground text-xs">Buque/Vuelo</span>
              <p className="font-medium">{emb.buque_vuelo}</p>
            </div>
          )}
          {emb.recinto_destino && (
            <div>
              <span className="text-muted-foreground text-xs">Recinto Destino</span>
              <p className="font-medium">{emb.recinto_destino}</p>
            </div>
          )}
        </div>

        {/* Document Health */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stella" />
            <span className="font-display text-sm font-semibold text-stella">Salud Documental (Stella)</span>
          </div>
          <Progress value={emb.salud_documental} className="h-2" />
          <p className={`text-xs font-mono font-bold ${healthColor(emb.salud_documental)}`}>
            {emb.salud_documental}% completo
          </p>
        </div>

        {/* Stella Notes */}
        {emb.stella_notas.length > 0 && (
          <div className="glass-panel-stella p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6 border border-primary/30">
                <AvatarFallback className="bg-primary/10 text-stella text-[10px]">
                  <Sparkles className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-stella">Stella — Notas</span>
            </div>
            {emb.stella_notas.map((nota, i) => (
              <p key={i} className="text-xs text-foreground/80 leading-relaxed pl-8">
                • {nota}
              </p>
            ))}
          </div>
        )}

        {/* Zod Findings */}
        {emb.zod_hallazgos.length > 0 && (
          <div className="glass-panel-zod p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zod" />
              <span className="font-display text-sm font-semibold text-zod">
                Hallazgos de Zod ({emb.zod_hallazgos.length})
              </span>
            </div>
            {emb.zod_hallazgos.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                <AlertTriangle className="w-3 h-3 mt-0.5 text-zod flex-shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Pre-Liquidation */}
        {preLiq && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-success" />
              <span className="font-display text-sm font-semibold text-success">
                Pre-Liquidación SIGA
              </span>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">FOB</span>
                <span className="font-mono">${Number(preLiq.valorFOB || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flete</span>
                <span className="font-mono">${Number(preLiq.valorFlete || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seguro {preLiq.seguroTeorico ? '(teórico)' : ''}</span>
                <span className="font-mono">${Number(preLiq.valorSeguro || 0).toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>CIF</span>
                <span className="font-mono">${Number(preLiq.valorCIF || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoría</span>
                <span className="font-medium">{String(preLiq.categoriaAduanera || '—')}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">DAI estimado</span>
                <span className="font-mono">${Number(preLiq.estimadoDAI || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ITBMS estimado</span>
                <span className="font-mono">${Number(preLiq.estimadoITBMS || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasa Sistema</span>
                <span className="font-mono">${Number(preLiq.tasaSistema || 0).toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-sm text-success">
                <span>Total Estimado</span>
                <span className="font-mono">${Number(preLiq.totalEstimado || 0).toFixed(2)}</span>
              </div>
              {preLiq.nota && (
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  {String(preLiq.nota)}
                </p>
              )}
            </div>
          </div>
        )}

        {!preLiq && (
          <div className="text-center py-4 text-muted-foreground/50 text-xs">
            Pre-liquidación no disponible — faltan datos de valor
          </div>
        )}
      </div>

      <DrawerFooter className="border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs border-primary/30 text-stella hover:bg-primary/10">
            <FileText className="w-3.5 h-3.5" />
            Ver Expediente
          </Button>
          {emb.estado === 'pre_liquidado' && (
            <Button size="sm" className="gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <ExternalLink className="w-3.5 h-3.5" />
              Enviar a Portal del Corredor
            </Button>
          )}
          <DrawerClose asChild>
            <Button size="sm" variant="ghost" className="gap-2 text-xs">
              <X className="w-3.5 h-3.5" />
              Cerrar
            </Button>
          </DrawerClose>
        </div>
      </DrawerFooter>
    </>
  );
}
