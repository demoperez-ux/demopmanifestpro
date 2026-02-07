/**
 * CONSULTAS CLASIFICATORIAS — Resoluciones Anticipadas de la ANA
 * Art. 3 AFC (OMC) — Transparencia y Resoluciones Anticipadas
 */

import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Shield, Sparkles, CheckCircle2,
  AlertTriangle, Calendar, Scale, FileText, Hash, X, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConsultaRow {
  id: string;
  numero_resolucion: string;
  fecha_resolucion: string;
  fecha_vigencia_inicio: string | null;
  fecha_vigencia_fin: string | null;
  solicitante: string;
  descripcion_mercancia: string;
  hts_code: string;
  descripcion_arancelaria: string | null;
  criterio_ana: string;
  fundamento_legal: string | null;
  dai_percent: number | null;
  itbms_percent: number | null;
  isc_percent: number | null;
  autoridad_anuente: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
}

const ESTADO_CONFIG: Record<string, { label: string; class: string }> = {
  vigente: { label: 'Vigente', class: 'bg-success/15 text-success border-success/30' },
  vencida: { label: 'Vencida', class: 'bg-muted text-muted-foreground border-border' },
  revocada: { label: 'Revocada', class: 'bg-destructive/15 text-destructive border-destructive/30' },
  en_revision: { label: 'En Revisión', class: 'bg-warning/15 text-warning border-warning/30' },
};

export function ConsultasClasificatorias() {
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<ConsultaRow | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    numero_resolucion: '',
    fecha_resolucion: '',
    solicitante: '',
    descripcion_mercancia: '',
    hts_code: '',
    descripcion_arancelaria: '',
    criterio_ana: '',
    fundamento_legal: '',
    dai_percent: '0',
    itbms_percent: '7',
    isc_percent: '0',
    autoridad_anuente: '',
    notas: '',
  });

  const fetchConsultas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultas_clasificatorias')
        .select('*')
        .order('fecha_resolucion', { ascending: false });

      if (error) throw error;
      setConsultas((data || []) as unknown as ConsultaRow[]);
    } catch (err) {
      console.error('Error fetching consultas:', err);
      toast.error('Error al cargar consultas clasificatorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsultas(); }, []);

  const filtered = consultas.filter(c => {
    if (filterEstado !== 'all' && c.estado !== filterEstado) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (
        c.numero_resolucion.toLowerCase().includes(t) ||
        c.descripcion_mercancia.toLowerCase().includes(t) ||
        c.hts_code.includes(t) ||
        c.solicitante.toLowerCase().includes(t)
      );
    }
    return true;
  });

  const handleSubmit = async () => {
    if (!formData.numero_resolucion || !formData.descripcion_mercancia || !formData.hts_code || !formData.criterio_ana) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await supabase
        .from('consultas_clasificatorias')
        .insert({
          numero_resolucion: formData.numero_resolucion,
          fecha_resolucion: formData.fecha_resolucion || new Date().toISOString(),
          solicitante: formData.solicitante,
          descripcion_mercancia: formData.descripcion_mercancia,
          hts_code: formData.hts_code,
          descripcion_arancelaria: formData.descripcion_arancelaria || null,
          criterio_ana: formData.criterio_ana,
          fundamento_legal: formData.fundamento_legal || null,
          dai_percent: parseFloat(formData.dai_percent) || 0,
          itbms_percent: parseFloat(formData.itbms_percent) || 7,
          isc_percent: parseFloat(formData.isc_percent) || 0,
          autoridad_anuente: formData.autoridad_anuente || null,
          notas: formData.notas || null,
          corredor_id: user.id,
        } as any);

      if (error) throw error;
      toast.success('Resolución anticipada archivada exitosamente');
      setDialogOpen(false);
      resetForm();
      fetchConsultas();
    } catch (err: any) {
      console.error('Error saving consulta:', err);
      toast.error(err.message || 'Error al guardar');
    }
  };

  const resetForm = () => {
    setFormData({
      numero_resolucion: '', fecha_resolucion: '', solicitante: '',
      descripcion_mercancia: '', hts_code: '', descripcion_arancelaria: '',
      criterio_ana: '', fundamento_legal: '', dai_percent: '0',
      itbms_percent: '7', isc_percent: '0', autoridad_anuente: '', notas: '',
    });
  };

  const vigentes = consultas.filter(c => c.estado === 'vigente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-zod" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display tracking-wide text-gradient">
              Consultas Clasificatorias
            </h2>
            <p className="text-sm text-muted-foreground">
              Resoluciones Anticipadas de la ANA — Art. 3 AFC (OMC)
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Archivar Resolución
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Nueva Resolución Anticipada</DialogTitle>
              <DialogDescription>
                Archiva una resolución oficial de la ANA. Zod consultará esta base antes de sugerir partidas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nº Resolución *</Label>
                  <Input
                    placeholder="ANA-RES-XXX-2026"
                    value={formData.numero_resolucion}
                    onChange={e => setFormData(p => ({ ...p, numero_resolucion: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha Resolución</Label>
                  <Input
                    type="date"
                    value={formData.fecha_resolucion}
                    onChange={e => setFormData(p => ({ ...p, fecha_resolucion: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Solicitante</Label>
                <Input
                  placeholder="Nombre del importador o corredor"
                  value={formData.solicitante}
                  onChange={e => setFormData(p => ({ ...p, solicitante: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción de la Mercancía *</Label>
                <Textarea
                  placeholder="Descripción detallada del producto según la resolución..."
                  value={formData.descripcion_mercancia}
                  onChange={e => setFormData(p => ({ ...p, descripcion_mercancia: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Partida HTS *</Label>
                  <Input
                    placeholder="8471.30.00"
                    value={formData.hts_code}
                    onChange={e => setFormData(p => ({ ...p, hts_code: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Autoridad Anuente</Label>
                  <Select
                    value={formData.autoridad_anuente}
                    onValueChange={v => setFormData(p => ({ ...p, autoridad_anuente: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">Ninguna</SelectItem>
                      <SelectItem value="MINSA">MINSA</SelectItem>
                      <SelectItem value="MIDA">MIDA</SelectItem>
                      <SelectItem value="AUPSA">AUPSA</SelectItem>
                      <SelectItem value="CONAPRED">CONAPRED</SelectItem>
                      <SelectItem value="APA">APA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Criterio de la ANA *</Label>
                <Textarea
                  placeholder="Criterio oficial dictado por la autoridad..."
                  value={formData.criterio_ana}
                  onChange={e => setFormData(p => ({ ...p, criterio_ana: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fundamento Legal</Label>
                <Input
                  placeholder="Art. XX del Decreto Ley 1 de 2008..."
                  value={formData.fundamento_legal}
                  onChange={e => setFormData(p => ({ ...p, fundamento_legal: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">DAI %</Label>
                  <Input
                    type="number"
                    value={formData.dai_percent}
                    onChange={e => setFormData(p => ({ ...p, dai_percent: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ITBMS %</Label>
                  <Input
                    type="number"
                    value={formData.itbms_percent}
                    onChange={e => setFormData(p => ({ ...p, itbms_percent: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ISC %</Label>
                  <Input
                    type="number"
                    value={formData.isc_percent}
                    onChange={e => setFormData(p => ({ ...p, isc_percent: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notas internas</Label>
                <Textarea
                  placeholder="Observaciones del corredor..."
                  value={formData.notas}
                  onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} className="gap-2">
                <FileText className="w-4 h-4" />
                Archivar Resolución
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{consultas.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vigentes</span>
          <span className="stat-value text-success">{vigentes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">HTS Únicos</span>
          <span className="stat-value text-info">{new Set(consultas.map(c => c.hts_code)).size}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-zod" />
            <span className="stat-label">Zod Integrado</span>
          </div>
          <span className="stat-value text-zod">✓</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass-panel-zod p-3 flex items-start gap-3">
        <Avatar className="h-8 w-8 border border-warning/30 flex-shrink-0">
          <AvatarFallback className="bg-warning/10 text-zod">
            <Shield className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="text-xs">
          <p className="font-semibold text-zod mb-1">Zod — Protocolo de Resoluciones Anticipadas</p>
          <p className="text-foreground/80">
            Antes de sugerir una partida arancelaria, Zod consulta esta base de datos para respetar
            cualquier criterio previo de la ANA. Las resoluciones vigentes tienen prioridad sobre
            la clasificación automática. <span className="text-muted-foreground italic">Art. 3 AFC (OMC)</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por Nº, descripción, HTS..."
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
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vigente">Vigente</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="revocada">Revocada</SelectItem>
            <SelectItem value="en_revision">En Revisión</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Cargando resoluciones...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {consultas.length === 0
                  ? 'No hay resoluciones archivadas. Usa "Archivar Resolución" para registrar criterios oficiales de la ANA.'
                  : 'No se encontraron resoluciones con los filtros actuales.'}
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map(c => {
          const estadoCfg = ESTADO_CONFIG[c.estado] || ESTADO_CONFIG.vigente;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedConsulta(selectedConsulta?.id === c.id ? null : c)}
              className={`w-full text-left card-interactive p-4 ${
                selectedConsulta?.id === c.id ? 'border-primary/40' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-4 h-4 text-zod" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {c.numero_resolucion}
                    </span>
                    <Badge variant="outline" className={`text-[9px] ${estadoCfg.class}`}>
                      {estadoCfg.label}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-info/10 text-info border-info/30 gap-1">
                      <Hash className="w-2.5 h-2.5" /> {c.hts_code}
                    </Badge>
                    {c.autoridad_anuente && (
                      <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30">
                        {c.autoridad_anuente}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {c.descripcion_mercancia}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.fecha_resolucion).toLocaleDateString('es-PA')}
                    </span>
                    <span>{c.solicitante}</span>
                    {c.dai_percent !== null && (
                      <span className="font-mono">DAI: {c.dai_percent}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedConsulta?.id === c.id && (
                <div className="mt-4 pt-3 border-t border-border space-y-3 animate-fade-in">
                  <div className="glass-panel-zod p-3 rounded-lg">
                    <p className="text-xs font-semibold text-zod mb-1">Criterio de la ANA</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{c.criterio_ana}</p>
                  </div>
                  {c.fundamento_legal && (
                    <div className="glass-panel-stella p-3 rounded-lg">
                      <p className="text-xs font-semibold text-stella mb-1">Fundamento Legal</p>
                      <p className="text-xs text-foreground/80">{c.fundamento_legal}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-muted-foreground">DAI</p>
                      <p className="font-mono font-bold">{c.dai_percent ?? 0}%</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-muted-foreground">ITBMS</p>
                      <p className="font-mono font-bold">{c.itbms_percent ?? 7}%</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-muted-foreground">ISC</p>
                      <p className="font-mono font-bold">{c.isc_percent ?? 0}%</p>
                    </div>
                  </div>
                  {c.notas && (
                    <p className="text-[10px] text-muted-foreground italic">
                      📝 {c.notas}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
