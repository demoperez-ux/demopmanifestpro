import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, Clock, DollarSign, ShieldCheck, AlertTriangle, FileText,
  Download, Zap, Brain, Shield, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

// ── Mock ROI Data ─────────────────────────────────────────

const MONTHLY_DATA = [
  { month: 'Sep', hoursManual: 320, hoursZenith: 48, finesAvoided: 12500, declarations: 890 },
  { month: 'Oct', hoursManual: 340, hoursZenith: 42, finesAvoided: 18200, declarations: 1020 },
  { month: 'Nov', hoursManual: 310, hoursZenith: 38, finesAvoided: 9800, declarations: 945 },
  { month: 'Dec', hoursManual: 360, hoursZenith: 35, finesAvoided: 22100, declarations: 1180 },
  { month: 'Ene', hoursManual: 350, hoursZenith: 32, finesAvoided: 15600, declarations: 1150 },
  { month: 'Feb', hoursManual: 330, hoursZenith: 30, finesAvoided: 28400, declarations: 1280 },
];

const ENGINE_CONTRIB = [
  { name: 'LEXIS', value: 40, color: 'hsl(215, 90%, 48%)' },
  { name: 'ZOD', value: 35, color: 'hsl(25, 95%, 53%)' },
  { name: 'STELLA', value: 25, color: 'hsl(152, 69%, 38%)' },
];

const FINES_BY_TYPE = [
  { type: 'Subvaluación', count: 12, amount: 45200 },
  { type: 'Error clasificación', count: 8, amount: 28600 },
  { type: 'Doc. incompleto', count: 15, amount: 18900 },
  { type: 'Plazo vencido', count: 5, amount: 12400 },
  { type: 'Inconsistencia CIF', count: 22, amount: 31800 },
];

export default function ROIDashboardPage() {
  const [period, setPeriod] = useState<'6m' | '1y' | 'all'>('6m');

  const totals = useMemo(() => {
    const totalHoursSaved = MONTHLY_DATA.reduce((s, m) => s + (m.hoursManual - m.hoursZenith), 0);
    const totalFinesAvoided = MONTHLY_DATA.reduce((s, m) => s + m.finesAvoided, 0);
    const totalDeclarations = MONTHLY_DATA.reduce((s, m) => s + m.declarations, 0);
    const avgEfficiency = Math.round((1 - MONTHLY_DATA.reduce((s, m) => s + m.hoursZenith, 0) / MONTHLY_DATA.reduce((s, m) => s + m.hoursManual, 0)) * 100);
    return { totalHoursSaved, totalFinesAvoided, totalDeclarations, avgEfficiency };
  }, []);

  const hourlyRate = 35; // USD per hour broker cost

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Dashboard de Impacto Económico
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ROI Engine — Medición de valor generado por LEXIS · ZOD · STELLA
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Informe
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Horas Recuperadas</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{totals.totalHoursSaved.toLocaleString()}</p>
                  <p className="text-xs text-success mt-1">≈ ${(totals.totalHoursSaved * hourlyRate).toLocaleString()} ahorrados</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Multas Evitadas</p>
                  <p className="text-3xl font-bold text-foreground mt-1">${totals.totalFinesAvoided.toLocaleString()}</p>
                  <p className="text-xs text-success mt-1">62 infracciones prevenidas</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Declaraciones</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{totals.totalDeclarations.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Procesadas en el período</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Eficiencia</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{totals.avgEfficiency}%</p>
                  <p className="text-xs text-success mt-1">Reducción tiempo operativo</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="hours" className="space-y-4">
          <TabsList>
            <TabsTrigger value="hours">Horas Operativas</TabsTrigger>
            <TabsTrigger value="fines">Multas Evitadas</TabsTrigger>
            <TabsTrigger value="engines">Contribución por Motor</TabsTrigger>
          </TabsList>

          <TabsContent value="hours">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Comparativa: Proceso Manual vs ZENITH</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={MONTHLY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="hoursManual" name="Manual (hrs)" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hoursZenith" name="ZENITH (hrs)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fines">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Infracciones Prevenidas por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {FINES_BY_TYPE.map((fine) => (
                    <div key={fine.type} className="flex items-center gap-4">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{fine.type}</span>
                          <span className="text-sm text-muted-foreground">{fine.count} casos · ${fine.amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full"
                            style={{ width: `${(fine.amount / 50000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engines">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Distribución de Valor por Motor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={ENGINE_CONTRIB} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                        {ENGINE_CONTRIB.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">La Trinidad — Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-info-light">
                    <Brain className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">LEXIS — The Intelligent Scribe</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ingesto autónomo de documentos. Extrae datos de facturas, BL y manifiestos con mapeo automático a campos SQL.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-warning-light">
                    <Shield className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">ZOD — The Integrity Engine</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Validación forense inmutable. Garantiza CIF = FOB + Flete + Seguro y la cascada fiscal DAI → ISC → ITBMS.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-success-light">
                    <Zap className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">STELLA — The Compliance Copilot</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aprende de correcciones ZOD sobre documentos LEXIS. Memoria operativa que mejora precisión con cada iteración.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
