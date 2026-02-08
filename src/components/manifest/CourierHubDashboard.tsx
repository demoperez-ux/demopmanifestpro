/**
 * UNIVERSAL GATEWAY — Dashboard de Operaciones Express
 * 
 * Panel unificado multi-socio con:
 * 1. Selector de socio dinámico ({active_partner_name})
 * 2. Tabla masiva optimizada (+1,000 filas) con semáforo de cumplimiento
 * 3. LEXIS Ingress agnóstico (keyword sniffer basado en Arancel de Panamá)
 * 4. Panel Zod (auditoría valor ↔ descripción)
 * 5. Exportación dinámica adaptada al socio seleccionado
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Package, FileJson, FileSpreadsheet, FileCode2, Search,
  ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, Shield,
  ArrowUpDown, X, Zap, BarChart3, Eye, Settings2, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MotorCourierHub,
  type AnalisisGuiaCourier,
  type SemaforoCumplimiento,
} from '@/lib/courier/MotorCourierHub';
import {
  partnerManager,
  type PartnerConfig,
  type ExportFormat
} from '@/lib/courier/partnerConfig';
import type { ManifestRow } from '@/types/manifest';

// ─── Generador de demo data (1,000 guías) ───────────────

const DEMO_DESCRIPCIONES: { desc: string; val: number }[] = [
  { desc: 'iPhone 15 Pro Max 256GB', val: 1199 },
  { desc: 'Samsung Galaxy S24 Ultra', val: 1099 },
  { desc: 'MacBook Pro M3 14-inch', val: 1.00 },
  { desc: 'Wireless Bluetooth Headphones', val: 45 },
  { desc: 'USB-C Hub 7-in-1 Adapter', val: 28 },
  { desc: 'Vitamin D3 5000IU Supplement 120caps', val: 18 },
  { desc: 'Protein Whey Powder Chocolate 2lb', val: 35 },
  { desc: 'Face Cream Anti-Aging SPF30', val: 42 },
  { desc: 'Arduino Starter Kit Mega', val: 65 },
  { desc: 'Laptop Stand Aluminum Adjustable', val: 32 },
  { desc: 'iPad Air 5th Gen 64GB', val: 2.50 },
  { desc: 'Dog Food Premium 15lb Bag', val: 48 },
  { desc: 'Organic Mango Dried 500g', val: 12 },
  { desc: 'Bluetooth Speaker Portable', val: 55 },
  { desc: 'Phone Case Silicone Clear', val: 8 },
  { desc: 'Omega-3 Fish Oil Capsules', val: 22 },
  { desc: 'Children Clothing Set 3-Pack', val: 25 },
  { desc: 'Running Shoes Nike Size 10', val: 120 },
  { desc: 'Collagen Peptides Powder', val: 30 },
  { desc: 'Smart Watch Fitness Tracker', val: 3.00 },
  { desc: 'Coffee Beans Organic 1kg', val: 16 },
  { desc: 'PlayStation 5 Controller DualSense', val: 70 },
  { desc: 'LED Monitor 24" Full HD', val: 180 },
  { desc: 'Baby Formula Similac 12oz', val: 32 },
  { desc: 'Drone Mini Camera 4K', val: 4.50 },
  { desc: 'External SSD 1TB Samsung', val: 89 },
  { desc: 'Mechanical Keyboard RGB', val: 75 },
  { desc: 'Shampoo Natural Coconut Oil', val: 14 },
  { desc: 'Gaming Mouse Wireless', val: 45 },
  { desc: 'Honey Raw Organic 16oz', val: 11 },
  { desc: 'Webcam HD 1080p Logitech', val: 60 },
  { desc: 'Power Bank 20000mAh', val: 28 },
  { desc: 'Toothpaste Whitening 3-Pack', val: 9 },
  { desc: 'AirPods Pro 2nd Generation', val: 1.99 },
  { desc: 'Cooking Spice Set Imported', val: 15 },
  { desc: 'GoPro Hero 12 Black', val: 350 },
  { desc: 'Sunscreen SPF 50 Cream', val: 18 },
  { desc: 'Rice Cooker 3L Digital', val: 55 },
  { desc: 'Cat Food Grain-Free 10lb', val: 38 },
  { desc: 'Projector Portable Mini', val: 150 },
];

const CONSIG_POOL = [
  { name: 'Juan Pérez', id: '8-814-1234' },
  { name: 'María González', id: '4-712-5678' },
  { name: 'Carlos Rodríguez', id: '3-456-7890' },
  { name: 'Ana Martínez', id: '8-900-1111' },
  { name: 'Luis Herrera', id: '9-234-5555' },
  { name: 'Sofia Castillo', id: '2-345-6789' },
  { name: 'Pedro Morales', id: '7-111-2222' },
  { name: 'Rosa Chen', id: '8-222-3333' },
  { name: 'José Espinosa', id: '6-333-4444' },
  { name: 'Carmen Ríos', id: '5-444-5555' },
];

function generarDemoMasivo(total: number = 1000): ManifestRow[] {
  return Array.from({ length: total }, (_, i) => {
    const item = DEMO_DESCRIPCIONES[i % DEMO_DESCRIPCIONES.length];
    const consig = CONSIG_POOL[i % CONSIG_POOL.length];
    const mawbIdx = Math.floor(i / 50);
    const mawbNum = (10000000 + mawbIdx).toString();
    return {
      id: crypto.randomUUID(),
      trackingNumber: `TBA${(300000000000 + i).toString()}`,
      mawb: `618-${mawbNum}`,
      description: item.desc,
      valueUSD: item.val + (i % 7) * 2,
      weight: 0.3 + (i % 20) * 0.5,
      recipient: consig.name,
      address: `Ciudad de Panamá, Zona ${(i % 12) + 1}`,
      identification: consig.id,
      originalRowIndex: i,
    };
  });
}

// ─── Semáforo visual ────────────────────────────────────

function SemaforoIcon({ estado }: { estado: SemaforoCumplimiento }) {
  switch (estado) {
    case 'verde':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'amarillo':
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'rojo':
      return <ShieldAlert className="w-4 h-4 text-destructive" />;
  }
}

function semaforoLabel(estado: SemaforoCumplimiento): string {
  switch (estado) {
    case 'verde': return 'Listo';
    case 'amarillo': return 'Falta Permiso';
    case 'rojo': return 'Riesgo de Valor';
  }
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  csv: <FileSpreadsheet className="w-3.5 h-3.5" />,
  json: <FileJson className="w-3.5 h-3.5" />,
  xml: <FileCode2 className="w-3.5 h-3.5" />,
};

// ─── Página principal ───────────────────────────────────

const PAGE_SIZE = 50;

export default function CourierHubDashboard() {
  const [demoData] = useState<ManifestRow[]>(() => generarDemoMasivo(1000));
  const [busqueda, setBusqueda] = useState('');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [ordenValor, setOrdenValor] = useState<'asc' | 'desc' | null>(null);
  const [paginaActual, setPaginaActual] = useState(0);
  const [detalleAbierto, setDetalleAbierto] = useState<AnalisisGuiaCourier | null>(null);
  const [activePartnerId, setActivePartnerId] = useState<string>('generic');

  // Partner activo
  const activePartner: PartnerConfig = useMemo(() => {
    return partnerManager.getById(activePartnerId) || partnerManager.getActivePartner();
  }, [activePartnerId]);

  const allPartners = useMemo(() => partnerManager.getActive(), []);

  // Análisis completo (agnóstico de transportista)
  const { analisis, resumen } = useMemo(() => {
    return MotorCourierHub.analizarManifiesto(demoData);
  }, [demoData]);

  // Filtrado
  const filtrados = useMemo(() => {
    let result = analisis;

    if (busqueda) {
      const q = busqueda.toLowerCase();
      result = result.filter(a =>
        a.guia.trackingNumber.toLowerCase().includes(q) ||
        a.guia.description.toLowerCase().includes(q) ||
        a.guia.recipient.toLowerCase().includes(q)
      );
    }

    if (filtroSemaforo !== 'todos') {
      result = result.filter(a => a.semaforo === filtroSemaforo);
    }

    if (filtroCategoria !== 'todos') {
      result = result.filter(a => a.categoriaDetectada === filtroCategoria);
    }

    if (ordenValor) {
      result = [...result].sort((a, b) =>
        ordenValor === 'asc'
          ? a.guia.valueUSD - b.guia.valueUSD
          : b.guia.valueUSD - a.guia.valueUSD
      );
    }

    return result;
  }, [analisis, busqueda, filtroSemaforo, filtroCategoria, ordenValor]);

  // Paginación
  const totalPages = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice(paginaActual * PAGE_SIZE, (paginaActual + 1) * PAGE_SIZE);

  const handleExportar = useCallback((formato: ExportFormat) => {
    MotorCourierHub.descargarExportacion(analisis, activePartner, formato);
  }, [analisis, activePartner]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroSemaforo('todos');
    setFiltroCategoria('todos');
    setOrdenValor(null);
    setPaginaActual(0);
  };

  const alertasFraude = analisis.filter(a => a.alertaFraude);

  return (
    <div className="space-y-5">
      {/* ── Header con Partner Selector ─────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">
              Universal Gateway
            </h1>
            <p className="text-sm text-muted-foreground">
              Operaciones Express — Tocumen · {resumen.totalGuias.toLocaleString()} guías
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Partner Selector */}
          <Select value={activePartnerId} onValueChange={setActivePartnerId}>
            <SelectTrigger className="w-[180px] h-9 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <SelectValue placeholder="Socio Logístico" />
            </SelectTrigger>
            <SelectContent>
              {allPartners.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dynamic Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                Generar Interfaz ERP para {activePartner.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activePartner.exportFormats.map(fmt => (
                <DropdownMenuItem
                  key={fmt}
                  onClick={() => handleExportar(fmt)}
                  className="text-xs gap-2"
                >
                  {FORMAT_ICONS[fmt]}
                  Exportar {fmt.toUpperCase()} — {activePartner.erpSystemName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Partner Badge ────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
          Socio Activo: {activePartner.name}
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
          ERP: {activePartner.erpSystemName}
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
          Formatos: {activePartner.exportFormats.map(f => f.toUpperCase()).join(', ')}
        </Badge>
        {activePartner.iataCode && (
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
            IATA: {activePartner.iataCode}
          </Badge>
        )}
      </div>

      {/* ── KPI Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <KPI label="Total Guías" value={resumen.totalGuias.toLocaleString()} icon={<Package className="w-3.5 h-3.5 text-primary" />} />
        <KPI label="Listo" value={resumen.verde} icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />}
          onClick={() => { setFiltroSemaforo('verde'); setPaginaActual(0); }} />
        <KPI label="Falta Permiso" value={resumen.amarillo} icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />}
          onClick={() => { setFiltroSemaforo('amarillo'); setPaginaActual(0); }} />
        <KPI label="Riesgo Valor" value={resumen.rojo} icon={<ShieldAlert className="w-3.5 h-3.5 text-destructive" />} alert
          onClick={() => { setFiltroSemaforo('rojo'); setPaginaActual(0); }} />
        <KPI label="DAI 0% Tech" value={resumen.exentosTecnologia} icon={<Zap className="w-3.5 h-3.5 text-primary" />} />
        <KPI label="Permisos" value={resumen.requierenPermiso} icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />} />
        <KPI label="Valor Total" value={`$${resumen.valorTotalUSD.toLocaleString()}`} icon={<BarChart3 className="w-3.5 h-3.5 text-primary" />} />
      </div>

      {/* ── Panel Zod: Alertas de Cumplimiento ────────── */}
      {alertasFraude.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <Shield className="w-4 h-4" />
              Zod Integrity — Auditoría de Valor ({alertasFraude.length} hallazgos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {alertasFraude.slice(0, 10).map(a => (
                <div key={a.guia.id} className="flex items-start gap-2 p-2 rounded bg-destructive/5 border border-destructive/20">
                  <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-foreground">{a.guia.trackingNumber}</span>
                      <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive border-destructive/20">RIESGO</Badge>
                    </div>
                    <p className="text-xs text-foreground/70 mt-0.5">{a.alertaFraudeDetalle}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary italic">{a.stellaMensaje}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-destructive font-bold flex-shrink-0">${a.guia.valueUSD.toFixed(2)}</span>
                </div>
              ))}
              {alertasFraude.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center">+{alertasFraude.length - 10} hallazgos más</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filtros ─────────────────────────────────── */}
      <Card className="card-elevated">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar AWB, descripción o consignatario..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPaginaActual(0); }}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={filtroSemaforo} onValueChange={v => { setFiltroSemaforo(v); setPaginaActual(0); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Estado Cumplimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="verde">🟢 Listo</SelectItem>
                <SelectItem value="amarillo">🟡 Falta Permiso</SelectItem>
                <SelectItem value="rojo">🔴 Riesgo de Valor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={v => { setFiltroCategoria(v); setPaginaActual(0); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Electrónica">Electrónica</SelectItem>
                <SelectItem value="Sanitario">Sanitario</SelectItem>
                <SelectItem value="Agrícola">Agrícola</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setOrdenValor(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}>
              <ArrowUpDown className="w-3 h-3" />
              Valor {ordenValor === 'asc' ? '↑' : ordenValor === 'desc' ? '↓' : ''}
            </Button>

            {(busqueda || filtroSemaforo !== 'todos' || filtroCategoria !== 'todos' || ordenValor) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={limpiarFiltros}>
                <X className="w-3 h-3" /> Limpiar
              </Button>
            )}

            <Badge variant="outline" className="text-[10px] ml-auto">
              {filtrados.length.toLocaleString()} / {analisis.length.toLocaleString()} guías
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabla Masiva ────────────────────────────── */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[40px] text-[10px]">SEM</TableHead>
                  <TableHead className="text-[10px]">AWB</TableHead>
                  <TableHead className="text-[10px]">Consignatario</TableHead>
                  <TableHead className="text-[10px] max-w-[250px]">Descripción</TableHead>
                  <TableHead className="text-[10px] text-right">Valor USD</TableHead>
                  <TableHead className="text-[10px] text-right">Peso lb</TableHead>
                  <TableHead className="text-[10px]">Categoría</TableHead>
                  <TableHead className="text-[10px] text-center">DAI</TableHead>
                  <TableHead className="text-[10px] w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginados.map(a => (
                  <TableRow
                    key={a.guia.id}
                    className={`text-xs cursor-pointer transition-colors hover:bg-muted/50 ${
                      a.alertaFraude ? 'bg-destructive/5 hover:bg-destructive/10' : ''
                    }`}
                    onClick={() => setDetalleAbierto(a)}
                  >
                    <TableCell className="py-1.5">
                      <SemaforoIcon estado={a.semaforo} />
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[11px]">
                      {a.guia.trackingNumber.slice(-10)}
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px]">
                      <span className="truncate block max-w-[120px]">{a.guia.recipient}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px] max-w-[250px]">
                      <span className="truncate block">{a.guia.description}</span>
                    </TableCell>
                    <TableCell className={`py-1.5 text-right font-mono text-[11px] ${a.alertaFraude ? 'text-destructive font-bold' : ''}`}>
                      ${a.guia.valueUSD.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[11px]">
                      {a.guia.weight.toFixed(1)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={`text-[8px] ${
                        a.categoriaDetectada === 'Electrónica' ? 'bg-primary/10 text-primary border-primary/20'
                          : a.categoriaDetectada === 'Sanitario' ? 'bg-warning/10 text-warning border-warning/20'
                          : a.categoriaDetectada === 'Agrícola' ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {a.categoriaDetectada}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      {a.exencionDAI ? (
                        <Badge className="bg-success/15 text-success border-success/30 text-[8px]">0%</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{a.daiAplicable}%</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Eye className="w-3 h-3 text-muted-foreground/40" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              Pág. {paginaActual + 1} de {totalPages} · Mostrando {paginados.length} de {filtrados.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm" className="h-7 text-[10px] px-2"
                disabled={paginaActual === 0}
                onClick={() => setPaginaActual(p => p - 1)}
              >
                ← Anterior
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = paginaActual <= 2 ? i : paginaActual - 2 + i;
                if (page >= totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={page === paginaActual ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 text-[10px] p-0"
                    onClick={() => setPaginaActual(page)}
                  >
                    {page + 1}
                  </Button>
                );
              })}
              <Button
                variant="ghost" size="sm" className="h-7 text-[10px] px-2"
                disabled={paginaActual >= totalPages - 1}
                onClick={() => setPaginaActual(p => p + 1)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog de detalle ───────────────────────── */}
      <Dialog open={!!detalleAbierto} onOpenChange={() => setDetalleAbierto(null)}>
        <DialogContent className="max-w-lg">
          {detalleAbierto && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <SemaforoIcon estado={detalleAbierto.semaforo} />
                  <DialogTitle className="text-base font-mono">
                    {detalleAbierto.guia.trackingNumber}
                  </DialogTitle>
                  <Badge variant="outline" className={`text-[9px] ${
                    detalleAbierto.semaforo === 'verde' ? 'bg-success/10 text-success'
                      : detalleAbierto.semaforo === 'amarillo' ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {semaforoLabel(detalleAbierto.semaforo)}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  {detalleAbierto.guia.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Consignatario:</span> <span className="font-medium">{detalleAbierto.guia.recipient}</span></div>
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{detalleAbierto.guia.identification}</span></div>
                  <div><span className="text-muted-foreground">Valor:</span> <span className={`font-mono font-bold ${detalleAbierto.alertaFraude ? 'text-destructive' : ''}`}>${detalleAbierto.guia.valueUSD.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Peso:</span> <span className="font-mono">{detalleAbierto.guia.weight.toFixed(2)} lb</span></div>
                  <div><span className="text-muted-foreground">MAWB:</span> <span className="font-mono">{detalleAbierto.guia.mawb}</span></div>
                  <div><span className="text-muted-foreground">DAI:</span> <span className="font-bold">{detalleAbierto.daiAplicable}%</span> {detalleAbierto.exencionDAI && <Badge className="bg-success/15 text-success text-[8px] ml-1">Exento</Badge>}</div>
                </div>

                <Separator />

                {/* Keywords */}
                {detalleAbierto.keywordsDetectadas.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Keywords LEXIS</p>
                    <div className="flex flex-wrap gap-1">
                      {detalleAbierto.keywordsDetectadas.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-[8px]">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {detalleAbierto.observaciones.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Observaciones</p>
                    {detalleAbierto.observaciones.map((obs, i) => (
                      <p key={i} className="text-xs text-foreground/80">{obs}</p>
                    ))}
                  </div>
                )}

                {/* Stella alert */}
                {detalleAbierto.stellaMensaje && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs font-medium text-destructive">Stella — Alerta de Cumplimiento</span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {detalleAbierto.stellaMensaje}
                    </p>
                  </div>
                )}

                {/* Partner info */}
                <div className="p-2 rounded bg-muted/50 border border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    Exportación configurada para <span className="font-medium text-foreground">{activePartner.name}</span> · {activePartner.erpSystemName}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────

function KPI({ label, value, icon, alert: isAlert, onClick }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left transition-all ${
        isAlert ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
          : 'border-border/50 bg-card hover:bg-muted/30'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-0.5">
        {icon}
        {isAlert && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
      </div>
      <p className={`text-lg font-bold ${isAlert ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </button>
  );
}
