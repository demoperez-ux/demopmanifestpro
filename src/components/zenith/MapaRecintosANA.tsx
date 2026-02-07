/**
 * MAPA INTERACTIVO DE RECINTOS ANA 2026 — ZENITH
 * Visualización geográfica con selector inteligente y tooltips Stella
 */

import { useState, useMemo } from 'react';
import {
  Plane, Ship, Truck, Building2, Warehouse, MapPin, Search,
  Shield, Sparkles, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, Eye, Anchor, Package, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { ModoTransporte } from '@/types/transporte';
import { AdministracionRegional } from '@/lib/regulatorio/ReglasZonasAduaneras';
import {
  RecintoEnriquecido,
  CategoriaRecinto,
  obtenerRecintosEnriquecidos,
  obtenerEstadisticasRecintos,
  validarCoherenciaRecintoTransporte,
  sugerirRecintoOptimo,
  validarTransbordoCanalSeco,
  ResultadoValidacionRecinto,
} from '@/lib/regulatorio/ValidadorRecintosZod';
import { ZodVerdict } from '@/components/zenith/ZodIntegrityModal';

interface Props {
  modoTransporte?: ModoTransporte;
  provinciaDestino?: string;
  mawb?: string;
  onRecintoSeleccionado?: (recinto: RecintoEnriquecido) => void;
  onZodBloqueo?: (verdict: ZodVerdict) => void;
}

const NOMBRE_ZONA: Record<string, string> = {
  zona_oriental: 'Oriental',
  zona_aeroportuaria: 'Aeroportuaria',
  zona_norte: 'Norte (Colón)',
  zona_occidental: 'Occidental (Chiriquí)',
  zona_noroccidental: 'Nor-Occidental (Bocas)',
  zona_central_azuero: 'Central/Azuero',
  zona_panama_pacifico: 'Panamá Pacífico',
};

const NOMBRE_CATEGORIA: Record<CategoriaRecinto, string> = {
  fronterizo: 'Fronterizos',
  maritimo: 'Marítimos',
  aeropuerto: 'Aeropuertos',
  postal: 'Postales',
  zona_franca: 'Zonas Francas',
  privado: 'Privados',
};

const ICONO_CATEGORIA: Record<CategoriaRecinto, React.ReactNode> = {
  fronterizo: <Truck className="w-4 h-4" />,
  maritimo: <Ship className="w-4 h-4" />,
  aeropuerto: <Plane className="w-4 h-4" />,
  postal: <Package className="w-4 h-4" />,
  zona_franca: <Warehouse className="w-4 h-4" />,
  privado: <Building2 className="w-4 h-4" />,
};

export function MapaRecintosANA({
  modoTransporte,
  provinciaDestino,
  mawb,
  onRecintoSeleccionado,
  onZodBloqueo,
}: Props) {
  const [filtroZona, setFiltroZona] = useState<string>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [recintoSeleccionado, setRecintoSeleccionado] = useState<RecintoEnriquecido | null>(null);
  const [validacionActiva, setValidacionActiva] = useState<ResultadoValidacionRecinto | null>(null);
  const [canalSecoOrigen, setCanalSecoOrigen] = useState<string>('');
  const [canalSecoDestino, setCanalSecoDestino] = useState<string>('');

  const recintos = useMemo(() => obtenerRecintosEnriquecidos(), []);
  const estadisticas = useMemo(() => obtenerEstadisticasRecintos(), []);

  // Sugerencia automática de Stella
  const sugerencia = useMemo(() => {
    if (modoTransporte && provinciaDestino) {
      return sugerirRecintoOptimo(provinciaDestino, modoTransporte);
    }
    return null;
  }, [modoTransporte, provinciaDestino]);

  const recintosFiltrados = useMemo(() => {
    return recintos.filter(r => {
      if (filtroZona !== 'todas' && r.administracionRegional !== filtroZona) return false;
      if (filtroCategoria !== 'todas' && r.categoria !== filtroCategoria) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return r.nombre.toLowerCase().includes(q) ||
          r.provincia.toLowerCase().includes(q) ||
          r.codigo.toLowerCase().includes(q);
      }
      return true;
    });
  }, [recintos, filtroZona, filtroCategoria, busqueda]);

  const handleSeleccionar = (recinto: RecintoEnriquecido) => {
    setRecintoSeleccionado(recinto);

    if (modoTransporte) {
      const resultado = validarCoherenciaRecintoTransporte(recinto.id, modoTransporte, mawb);
      setValidacionActiva(resultado);

      if (resultado.bloqueado && onZodBloqueo && resultado.mensajeZod) {
        onZodBloqueo({
          bloqueado: true,
          tipo: 'cumplimiento',
          titulo: 'Veredicto de Zod: Inconsistencia de Recinto',
          descripcion: resultado.mensajeZod,
          detalles: [
            `Recinto: ${recinto.nombre}`,
            `Modo declarado: ${modoTransporte}`,
            `Modos permitidos: ${recinto.modosTransporte.join(', ')}`,
          ],
          accionRequerida: 'Seleccione un recinto compatible con el modo de transporte declarado.',
          hashVerificacion: resultado.hashVerificacion,
        });
      } else if (resultado.valido && onRecintoSeleccionado) {
        onRecintoSeleccionado(recinto);
      }
    } else if (onRecintoSeleccionado) {
      onRecintoSeleccionado(recinto);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground tracking-wide">
              Recintos ANA 2026
            </h2>
            <p className="text-sm text-muted-foreground">
              Directorio Oficial — {estadisticas.totalRecintos} recintos activos
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary text-xs">
          <Shield className="w-3 h-3 mr-1" />
          Validado por ZENITH
        </Badge>
      </div>

      {/* Stella Suggestion */}
      {sugerencia && (
        <div className="glass-panel-stella p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary mb-1">Sugerencia de Stella</p>
              <p className="text-sm text-foreground/80">
                Jefe, he detectado que esta carga va para <strong>{provinciaDestino}</strong> vía{' '}
                <strong>{modoTransporte}</strong>; he pre-seleccionado{' '}
                <strong>{sugerencia.nombre}</strong> para agilizar el despacho.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => handleSeleccionar(sugerencia as RecintoEnriquecido)}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Aceptar sugerencia
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Validation result */}
      {validacionActiva && (
        <div className={`p-4 rounded-lg border ${
          validacionActiva.valido
            ? 'bg-success/5 border-success/30'
            : 'bg-destructive/5 border-destructive/30'
        }`}>
          <div className="flex items-start gap-3">
            {validacionActiva.valido ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${validacionActiva.valido ? 'text-success' : 'text-destructive'}`}>
                {validacionActiva.valido ? 'Recinto Verificado' : 'Inconsistencia Detectada'}
              </p>
              <p className="text-sm text-foreground/80 mt-1">{validacionActiva.mensajeStella}</p>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                Hash: {validacionActiva.hashVerificacion.substring(0, 24)}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(Object.entries(estadisticas.porCategoria) as [CategoriaRecinto, number][]).map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(filtroCategoria === cat ? 'todas' : cat)}
            className={`p-3 rounded-lg border text-center transition-all ${
              filtroCategoria === cat
                ? 'bg-primary/10 border-primary/30'
                : 'bg-card border-border hover:border-primary/20'
            }`}
          >
            <div className="flex justify-center mb-1">
              {ICONO_CATEGORIA[cat]}
            </div>
            <p className="text-lg font-bold text-foreground">{count}</p>
            <p className="text-[10px] text-muted-foreground">{NOMBRE_CATEGORIA[cat]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recinto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={filtroZona} onValueChange={setFiltroZona}>
          <SelectTrigger className="w-[220px] bg-card border-border">
            <SelectValue placeholder="Zona Administrativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las Zonas</SelectItem>
            {Object.entries(NOMBRE_ZONA).map(([key, nombre]) => (
              <SelectItem key={key} value={key}>{nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Interactive Map (Schematic) */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Eye className="w-4 h-4 text-primary" />
            Mapa de Recintos Operativos
          </CardTitle>
          <CardDescription>
            {recintosFiltrados.length} recintos · Haga clic para seleccionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Schematic Panama map using positioned dots */}
          <div className="relative w-full h-[400px] bg-muted/30 rounded-lg border border-border overflow-hidden">
            {/* Panama outline hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <p className="text-6xl font-display font-bold tracking-widest text-foreground">PANAMÁ</p>
            </div>

            <TooltipProvider delayDuration={100}>
              {recintosFiltrados.map(recinto => {
                // Normalize coordinates to viewport position
                const minLat = 7.2, maxLat = 9.7, minLng = -83.0, maxLng = -77.0;
                const x = ((recinto.coordenadas.lng - minLng) / (maxLng - minLng)) * 90 + 5;
                const y = (1 - (recinto.coordenadas.lat - minLat) / (maxLat - minLat)) * 80 + 10;

                const isSelected = recintoSeleccionado?.id === recinto.id;
                const isSuggested = sugerencia?.id === recinto.id;

                return (
                  <Tooltip key={recinto.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-200 ${
                          isSelected
                            ? 'scale-150 z-20'
                            : isSuggested
                              ? 'scale-125 z-15 animate-pulse-subtle'
                              : 'hover:scale-125'
                        }`}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={() => handleSeleccionar(recinto)}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                            isSelected
                              ? 'border-primary bg-primary shadow-[0_0_12px_hsl(187_90%_51%/0.5)]'
                              : isSuggested
                                ? 'border-primary bg-primary/50'
                                : 'border-current bg-current/80'
                          }`}
                          style={{ color: isSelected ? undefined : recinto.colorMapa }}
                        >
                          <span className="text-background font-bold">{recinto.icono}</span>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-card border-border text-foreground p-3"
                    >
                      <p className="font-medium text-sm">{recinto.icono} {recinto.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-1">{recinto.tooltipStella}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {recinto.modosTransporte.map(m => (
                          <Badge key={m} variant="outline" className="text-[9px] border-border">
                            {m}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-[9px] border-border">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          {recinto.horarioOperacion}
                        </Badge>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>

            {/* Legend */}
            <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 text-[10px] space-y-1">
              {(Object.entries(NOMBRE_CATEGORIA) as [CategoriaRecinto, string][]).map(([cat, name]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: obtenerColorCat(cat) }} />
                  <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canal Seco Module */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Zap className="w-4 h-4 text-zod" />
            Canal Seco "Omar Torrijos Herrera"
          </CardTitle>
          <CardDescription>
            Transbordos Atlántico ↔ Pacífico (Decreto 13/2024)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-muted-foreground mb-1">Puerto Origen</p>
              <Select value={canalSecoOrigen} onValueChange={setCanalSecoOrigen}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {recintos.filter(r => r.categoria === 'maritimo').map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.icono} {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center px-2 text-muted-foreground">→</div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-muted-foreground mb-1">Puerto Destino</p>
              <Select value={canalSecoDestino} onValueChange={setCanalSecoDestino}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {recintos.filter(r => r.categoria === 'maritimo').map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.icono} {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="border-zod/30 text-zod hover:bg-zod/10"
              disabled={!canalSecoOrigen || !canalSecoDestino}
              onClick={() => {
                const resultado = validarTransbordoCanalSeco(canalSecoOrigen, canalSecoDestino);
                setValidacionActiva({
                  valido: resultado.autorizado,
                  recintoAsignado: resultado.recintoOrigen,
                  recintosSugeridos: [],
                  mensajeStella: resultado.mensajeStella,
                  mensajeZod: resultado.autorizado ? null : 'Ruta no válida para Canal Seco OTH',
                  bloqueado: !resultado.autorizado,
                  hashVerificacion: resultado.hashVerificacion,
                });
              }}
            >
              Validar Ruta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Precinct List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">
            Listado de Recintos ({recintosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {recintosFiltrados.map(recinto => {
              const isSelected = recintoSeleccionado?.id === recinto.id;
              return (
                <button
                  key={recinto.id}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                  onClick={() => handleSeleccionar(recinto)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{recinto.icono}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{recinto.nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] border-border">
                            {recinto.codigo}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {recinto.provincia} · {NOMBRE_ZONA[recinto.administracionRegional]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {recinto.modosTransporte.map(m => (
                        <Badge key={m} variant="outline" className="text-[9px] border-border px-1.5">
                          {m === 'aereo' ? '✈️' : m === 'maritimo' ? '⚓' : '🚛'}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          recinto.horarioOperacion === '24/7'
                            ? 'border-success/30 text-success'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {recinto.horarioOperacion}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function obtenerColorCat(cat: CategoriaRecinto): string {
  switch (cat) {
    case 'fronterizo': return 'hsl(38 92% 50%)';
    case 'maritimo': return 'hsl(217 91% 60%)';
    case 'aeropuerto': return 'hsl(187 90% 51%)';
    case 'postal': return 'hsl(280 68% 55%)';
    case 'zona_franca': return 'hsl(142 71% 45%)';
    case 'privado': return 'hsl(215 16% 47%)';
  }
}
