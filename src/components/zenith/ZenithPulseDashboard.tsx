/**
 * ZENITH PULSE — Dashboard Financiero y Operativo
 * Gráficos Recharts: Barras (Modalidad), Dona (Transporte), Lineal (Facturación)
 * Alertas de Stella para facturación pendiente
 */

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, DollarSign, Ship, Plane, Truck, Package,
  AlertTriangle, Sparkles, FileSpreadsheet, Download, Shield,
  Clock, CheckCircle2, XCircle, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  stellaDetectarPendientesFacturacion,
  generarTarifarioDemo,
  calcularHonorariosTarifario,
  zodValidarDatosFacturacion,
  generarArchivoSAPB1,
  type AlertaFacturacion,
  type FacturaSAPB1,
} from '@/lib/financiero/MotorFinanciero';
import { toast } from 'sonner';

// ─── Mock Data ───

const DATOS_MODALIDAD = [
  { modalidad: 'Importación', tramites: 124, valor: 1850000 },
  { modalidad: 'Exportación', tramites: 38, valor: 620000 },
  { modalidad: 'Tránsito', tramites: 15, valor: 280000 },
  { modalidad: 'Reexportación', tramites: 8, valor: 95000 },
  { modalidad: 'Zona Libre', tramites: 22, valor: 440000 },
];

const DATOS_TRANSPORTE = [
  { name: 'Aéreo', value: 58, color: 'hsl(187, 90%, 51%)' },
  { name: 'Marítimo', value: 28, color: 'hsl(38, 92%, 50%)' },
  { name: 'Terrestre', value: 10, color: 'hsl(142, 71%, 45%)' },
  { name: 'Multimodal', value: 4, color: 'hsl(280, 68%, 55%)' },
];

const FACTURACION_MENSUAL = [
  { dia: '01', acumulado: 12500, meta: 180000, proyeccion: 12500 },
  { dia: '05', acumulado: 34200, meta: 180000, proyeccion: 37000 },
  { dia: '08', acumulado: 52800, meta: 180000, proyeccion: 58000 },
  { dia: '10', acumulado: 68900, meta: 180000, proyeccion: 72000 },
  { dia: '12', acumulado: 78400, meta: 180000, proyeccion: 85000 },
  { dia: '15', acumulado: 95200, meta: 180000, proyeccion: 102000 },
  { dia: '18', acumulado: 108300, meta: 180000, proyeccion: 118000 },
  { dia: '20', acumulado: 121500, meta: 180000, proyeccion: 135000 },
  { dia: '22', acumulado: 134700, meta: 180000, proyeccion: 152000 },
  { dia: '25', acumulado: 148200, meta: 180000, proyeccion: 168000 },
  { dia: '28', acumulado: 162800, meta: 180000, proyeccion: 182000 },
];

const EXPEDIENTES_FACTURACION = [
  { id: 'exp-f01', mawb: '123-11111111', consignatario: 'LogiPanamá S.A.', estado: 'transmitido', fechaLevante: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), facturado: false },
  { id: 'exp-f02', mawb: '456-22222222', consignatario: 'FarmaCentral', estado: 'transmitido', fechaLevante: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(), facturado: false },
  { id: 'exp-f03', mawb: '789-33333333', consignatario: 'TechImport Corp.', estado: 'transmitido', fechaLevante: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), facturado: true },
];

// ─── Componente Principal ───

export function ZenithPulseDashboard() {
  const [formatoSAP, setFormatoSAP] = useState<'excel' | 'csv'>('excel');
  const tarifario = generarTarifarioDemo();

  const alertasFacturacion = useMemo(() =>
    stellaDetectarPendientesFacturacion(EXPEDIENTES_FACTURACION),
  []);

  const metricasKPI = useMemo(() => {
    const totalTramites = DATOS_MODALIDAD.reduce((s, d) => s + d.tramites, 0);
    const totalValor = DATOS_MODALIDAD.reduce((s, d) => s + d.valor, 0);
    const facturacionActual = FACTURACION_MENSUAL[FACTURACION_MENSUAL.length - 1]?.acumulado || 0;
    const meta = 180000;
    const porcentajeMeta = Math.round((facturacionActual / meta) * 100);
    return { totalTramites, totalValor, facturacionActual, meta, porcentajeMeta };
  }, []);

  const handleGenerarSAP = () => {
    const validacion = zodValidarDatosFacturacion({
      ruc: '155612345-2-2021',
      razonSocial: 'Distribuidora Pacífica S.A.',
      mawb: '123-45678901',
      valorCIF: 28750,
    });

    if (!validacion.valido) {
      validacion.errores.forEach(e => toast.error(`Zod: ${e}`));
      return;
    }

    const calculo = calcularHonorariosTarifario(tarifario, 28750, 45, { inspeccion: true });

    const factura: FacturaSAPB1 = {
      docNum: `ZEN-${Date.now().toString(36).toUpperCase()}`,
      docDate: new Date().toISOString().split('T')[0],
      cardCode: 'C-PA-001',
      cardName: 'Distribuidora Pacífica S.A.',
      ruc: '155612345-2-2021',
      referencia: '123-45678901',
      moneda: 'USD',
      lineas: calculo.lineas,
      subtotal: calculo.subtotal,
      itbms: calculo.itbms,
      total: calculo.total,
      expedienteId: 'exp-001',
      corredorNombre: 'Lic. Roberto Pérez M.',
      timestamp: new Date().toISOString(),
    };

    generarArchivoSAPB1(factura, formatoSAP);
    toast.success(`Archivo SAP B1 generado en formato ${formatoSAP.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gradient-zenith tracking-wider">
            Zenith Pulse
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panel Financiero y Operativo — Febrero 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={formatoSAP} onValueChange={(v: 'excel' | 'csv') => setFormatoSAP(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={handleGenerarSAP}>
            <FileSpreadsheet className="w-4 h-4" />
            Exportar SAP B1
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          label="Trámites del Mes"
          value={metricasKPI.totalTramites.toString()}
          icon={<Package className="w-6 h-6" />}
          color="text-primary"
          trend="+12% vs mes anterior"
        />
        <KPICard
          label="Valor CIF Procesado"
          value={`$${(metricasKPI.totalValor / 1000).toFixed(0)}K`}
          icon={<DollarSign className="w-6 h-6" />}
          color="text-zod"
          trend="+8% vs mes anterior"
        />
        <KPICard
          label="Facturación Acumulada"
          value={`$${(metricasKPI.facturacionActual / 1000).toFixed(0)}K`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="text-green-400"
          trend={`${metricasKPI.porcentajeMeta}% de meta`}
        />
        <KPICard
          label="Alertas Facturación"
          value={alertasFacturacion.length.toString()}
          icon={<AlertTriangle className="w-6 h-6" />}
          color={alertasFacturacion.length > 0 ? 'text-destructive' : 'text-green-400'}
          trend={alertasFacturacion.length > 0 ? 'Requieren atención' : 'Sin pendientes'}
        />
      </div>

      {/* Alertas Stella */}
      {alertasFacturacion.length > 0 && (
        <Card className="glass-panel-stella border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-stella text-sm font-display tracking-wide">
              <Sparkles className="w-4 h-4" /> Alertas de Stella — Facturación Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasFacturacion.map((alerta, idx) => (
              <AlertaFacturacionCard key={idx} alerta={alerta} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="modalidad">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="modalidad" className="gap-1 text-xs">
            <Package className="w-3 h-3" /> Por Modalidad
          </TabsTrigger>
          <TabsTrigger value="transporte" className="gap-1 text-xs">
            <Ship className="w-3 h-3" /> Por Transporte
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="gap-1 text-xs">
            <TrendingUp className="w-3 h-3" /> Facturación
          </TabsTrigger>
        </TabsList>

        {/* Barras — Modalidad */}
        <TabsContent value="modalidad" className="mt-4">
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display text-foreground tracking-wide">
                Trámites por Modalidad Aduanera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={DATOS_MODALIDAD} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 18%)" />
                  <XAxis dataKey="modalidad" tick={{ fill: 'hsl(215, 16%, 55%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 16%, 55%)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 40%, 9%)',
                      border: '1px solid hsl(222, 25%, 18%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 20%, 92%)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tramites" name="Trámites" fill="hsl(187, 90%, 51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valor" name="Valor ($)" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dona — Transporte */}
        <TabsContent value="transporte" className="mt-4">
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display text-foreground tracking-wide">
                Distribución por Medio de Transporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="60%" height={300}>
                  <PieChart>
                    <Pie
                      data={DATOS_TRANSPORTE}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {DATOS_TRANSPORTE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 40%, 9%)',
                        border: '1px solid hsl(222, 25%, 18%)',
                        borderRadius: '8px',
                        color: 'hsl(210, 20%, 92%)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3">
                  {DATOS_TRANSPORTE.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-foreground">{d.name}</span>
                      <span className="text-sm font-bold text-foreground ml-auto">{d.value}%</span>
                      {d.name === 'Aéreo' && <Plane className="w-4 h-4 text-muted-foreground" />}
                      {d.name === 'Marítimo' && <Ship className="w-4 h-4 text-muted-foreground" />}
                      {d.name === 'Terrestre' && <Truck className="w-4 h-4 text-muted-foreground" />}
                      {d.name === 'Multimodal' && <Package className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lineal — Facturación */}
        <TabsContent value="facturacion" className="mt-4">
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display text-foreground tracking-wide">
                Proyección de Facturación Acumulada — Febrero 2026
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={FACTURACION_MENSUAL} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 18%)" />
                  <XAxis dataKey="dia" tick={{ fill: 'hsl(215, 16%, 55%)', fontSize: 11 }} label={{ value: 'Día del mes', position: 'insideBottom', offset: -5, style: { fill: 'hsl(215, 16%, 55%)', fontSize: 10 } }} />
                  <YAxis tick={{ fill: 'hsl(215, 16%, 55%)', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 40%, 9%)',
                      border: '1px solid hsl(222, 25%, 18%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 20%, 92%)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="meta" name="Meta" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.05} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="acumulado" name="Facturado" stroke="hsl(187, 90%, 51%)" fill="hsl(187, 90%, 51%)" fillOpacity={0.1} strokeWidth={2} />
                  <Line type="monotone" dataKey="proyeccion" name="Proyección" stroke="hsl(38, 92%, 50%)" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tarifario Activo */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display text-foreground tracking-wide flex items-center gap-2">
              <Shield className="w-4 h-4 text-zod" /> Tarifario Activo — {tarifario.nombre}
            </CardTitle>
            <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
              Vigente
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Fórmula</p>
              <p className="font-medium text-foreground">
                {tarifario.tipoFormula === 'porcentaje_cif' ? `${tarifario.porcentajeCIF}% CIF` :
                 tarifario.tipoFormula === 'tarifa_plana' ? `$${tarifario.tarifaPlana} fijo` :
                 `${tarifario.porcentajeCIF}% CIF + $${tarifario.tarifaPlana}`}
              </p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Mínimo (Res. 222)</p>
              <p className="font-medium text-foreground">${tarifario.tarifaMinima.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Handling/Paquete</p>
              <p className="font-medium text-foreground">${tarifario.handlingPorPaquete.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Recargos</p>
              <p className="font-medium text-foreground">6 servicios configurados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-componentes ───

function KPICard({ label, value, icon, color, trend }: {
  label: string; value: string; icon: React.ReactNode; color: string; trend: string;
}) {
  return (
    <Card className="glass-panel">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {trend}
            </p>
          </div>
          <div className={`${color} opacity-40`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertaFacturacionCard({ alerta }: { alerta: AlertaFacturacion }) {
  return (
    <div className={`p-3 rounded-lg border flex items-start gap-3 ${
      alerta.severidad === 'critico' ? 'border-destructive/30 bg-destructive/5' :
      'border-amber-500/20 bg-amber-500/5'
    }`}>
      {alerta.severidad === 'critico' ? (
        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{alerta.titulo}</p>
        <p className="text-xs text-muted-foreground mt-1">{alerta.descripcion}</p>
      </div>
      <Badge variant="outline" className={`text-[10px] shrink-0 ${
        alerta.severidad === 'critico' ? 'border-destructive/30 text-destructive' :
        'border-amber-500/30 text-amber-400'
      }`}>
        {Math.floor(alerta.horasDesdelevante)}h
      </Badge>
    </div>
  );
}
