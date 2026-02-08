import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Brain, Plus, ShieldAlert, Gift, AlertTriangle,
  Clock, User, Trash2, Search
} from 'lucide-react';

type RuleCategory = 'restriccion' | 'beneficio' | 'riesgo';

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG: Record<RuleCategory, { label: string; icon: typeof ShieldAlert; badgeClass: string }> = {
  restriccion: { label: 'Restricción', icon: ShieldAlert, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  beneficio: { label: 'Beneficio', icon: Gift, badgeClass: 'bg-success-light text-success border-success/20' },
  riesgo: { label: 'Riesgo', icon: AlertTriangle, badgeClass: 'bg-warning-light text-warning border-warning/20' },
};

const INITIAL_RULES: BusinessRule[] = [
  {
    id: '1',
    name: 'Bloqueo por falta de Certificado de Origen',
    description: 'Bloquear trámite si la fracción arancelaria aplica TLC y no se adjunta Certificado de Origen válido y vigente.',
    category: 'restriccion',
    active: true,
    createdBy: 'Administrador',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Exoneración TLC Centroamérica',
    description: 'Aplicar DAI 0% automáticamente para fracciones arancelarias cubiertas por el TLC CA-PA cuando el país de origen sea GT, SV, HN, NI o CR y se adjunte Certificado de Origen.',
    category: 'beneficio',
    active: true,
    createdBy: 'Administrador',
    createdAt: '2026-01-20T08:30:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },
  {
    id: '3',
    name: 'Alerta de Subvaluación',
    description: 'Marcar para revisión manual si el valor unitario FOB de un artículo es inferior al 20% del promedio histórico registrado para la misma fracción arancelaria en los últimos 12 meses.',
    category: 'riesgo',
    active: true,
    createdBy: 'Administrador',
    createdAt: '2026-01-22T09:00:00Z',
    updatedAt: '2026-01-22T09:00:00Z',
  },
  {
    id: '4',
    name: 'Bloqueo MINSA — Productos farmacéuticos',
    description: 'Bloquear trámite si el capítulo SA es 30 (Productos farmacéuticos) y no se adjunta Registro Sanitario MINSA vigente.',
    category: 'restriccion',
    active: true,
    createdBy: 'Administrador',
    createdAt: '2026-01-25T11:00:00Z',
    updatedAt: '2026-01-25T11:00:00Z',
  },
  {
    id: '5',
    name: 'Exoneración Ley 37 — Energía Verde',
    description: 'Aplicar exoneración total (DAI 0%, ITBM 0%) para paneles solares, aerogeneradores e inversores fotovoltaicos según Ley 37 de 2013.',
    category: 'beneficio',
    active: false,
    createdBy: 'Administrador',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
];

export default function LexisLogicEnginePage() {
  const [rules, setRules] = useState<BusinessRule[]>(INITIAL_RULES);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<RuleCategory>('restriccion');

  const toggleRule = useCallback((id: string) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, active: !r.active, updatedAt: new Date().toISOString() } : r
    ));
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const addRule = useCallback(() => {
    if (!newName.trim() || !newDescription.trim()) return;
    const newRule: BusinessRule = {
      id: Date.now().toString(),
      name: newName.trim(),
      description: newDescription.trim(),
      category: newCategory,
      active: true,
      createdBy: 'Operador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules(prev => [newRule, ...prev]);
    setNewName('');
    setNewDescription('');
    setNewCategory('restriccion');
    setShowForm(false);
  }, [newName, newDescription, newCategory]);

  const filteredRules = rules.filter(r => {
    const matchesSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.active).length,
    restricciones: rules.filter(r => r.category === 'restriccion').length,
    beneficios: rules.filter(r => r.category === 'beneficio').length,
    riesgos: rules.filter(r => r.category === 'riesgo').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            LEXIS Logic Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Motor de Reglas de Negocio — Gestión de políticas fiscales y operativas
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Regla
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Reglas" value={stats.total} />
        <StatCard label="Activas" value={stats.active} accent />
        <StatCard label="Restricciones" value={stats.restricciones} />
        <StatCard label="Beneficios" value={stats.beneficios} />
        <StatCard label="Riesgos" value={stats.riesgos} />
      </div>

      {/* New Rule Form */}
      {showForm && (
        <Card className="border border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Definir Nueva Regla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Nombre de la Regla</Label>
                <Input
                  placeholder="Ej: Bloqueo por falta de permiso MINSA"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
                <Select value={newCategory} onValueChange={v => setNewCategory(v as RuleCategory)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restriccion">Restricción</SelectItem>
                    <SelectItem value="beneficio">Beneficio</SelectItem>
                    <SelectItem value="riesgo">Riesgo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Descripción de la Regla (Lenguaje Natural)</Label>
              <Textarea
                placeholder="Describa la regla en lenguaje natural. Ejemplo: 'Si el valor unitario FOB es inferior al 20% del promedio histórico para la misma fracción arancelaria, marcar el trámite para revisión manual por riesgo de subvaluación.'"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="text-sm min-h-[100px]"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={addRule} disabled={!newName.trim() || !newDescription.trim()} className="text-xs">
                Agregar Regla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar reglas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 text-sm h-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 text-sm h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="restriccion">Restricciones</SelectItem>
            <SelectItem value="beneficio">Beneficios</SelectItem>
            <SelectItem value="riesgo">Riesgos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filteredRules.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron reglas con los filtros aplicados.
            </CardContent>
          </Card>
        ) : (
          filteredRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={toggleRule}
              onDelete={deleteRule}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Subcomponents
function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="stat-card">
      <span className={`stat-value text-lg ${accent ? 'text-primary' : ''}`}>{value}</span>
      <span className="stat-label text-xs">{label}</span>
    </div>
  );
}

function RuleCard({ rule, onToggle, onDelete }: { rule: BusinessRule; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const config = CATEGORY_CONFIG[rule.category];
  const Icon = config.icon;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card className={`border border-border transition-opacity ${!rule.active ? 'opacity-60' : ''}`}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          {/* Toggle */}
          <div className="pt-0.5">
            <Switch
              checked={rule.active}
              onCheckedChange={() => onToggle(rule.id)}
              className="scale-90"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
              <Badge variant="outline" className={`text-[10px] gap-1 ${config.badgeClass}`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
              {!rule.active && (
                <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {rule.createdBy}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Creada: {formatDate(rule.createdAt)}
              </span>
              {rule.updatedAt !== rule.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Modificada: {formatDate(rule.updatedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rule.id)}
            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
