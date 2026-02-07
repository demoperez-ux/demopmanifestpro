/**
 * STELLA'S INBOX — Bandeja de Entrada del Corredor de Aduanas
 * Dashboard 2x2 con cuadrantes: Integrity Block, Regulatory Urgencies, Gold Flow, Consulting
 */

import { useState } from 'react';
import {
  ShieldAlert, Clock, CheckCircle2, BookOpen, Sparkles, Shield,
  AlertTriangle, FileText, Upload, ExternalLink, Timer, Lock,
  ChevronRight, Scale, Fingerprint, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription,
  DrawerFooter, DrawerHeader, DrawerTitle
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';

// ── Types ───────────────────────────────────────────────
interface Expediente {
  id: string;
  referencia: string;
  tipo: 'BL' | 'MAWB' | 'CPIC' | 'DUA';
  consignatario: string;
  descripcion: string;
  cuadrante: 'integrity' | 'regulatory' | 'gold' | 'consulting';
  // Integrity
  zodVeredicto?: string;
  errores?: string[];
  // Regulatory
  agencia?: 'MINSA' | 'MIDA' | 'AUPSA' | 'SINAPROC';
  etaHoras?: number;
  permisoRequerido?: string;
  // Gold
  cumplimiento?: number;
  hashFirma?: string;
  // Consulting
  fuenteLegal?: string;
  resumenNoticia?: string;
  // Common
  baseLegal?: string;
  stellaNota?: string;
  fechaCreacion: string;
}

// ── Mock Data ───────────────────────────────────────────
const MOCK_EXPEDIENTES: Expediente[] = [
  // 🟥 Integrity Block
  {
    id: 'exp-001',
    referencia: 'B/L #9928',
    tipo: 'BL',
    consignatario: 'Importadora Pacífico S.A.',
    descripcion: 'Error crítico de peso: 850 kg declarados vs. 1,240 kg registrados en báscula',
    cuadrante: 'integrity',
    zodVeredicto: 'Discrepancia de peso supera tolerancia del 5%. Posible subfacturación o error de consolidación.',
    errores: [
      'Peso bruto declarado: 850 kg',
      'Peso registrado en báscula: 1,240 kg',
      'Diferencia: +45.8% (tolerancia máxima: 5%)',
    ],
    baseLegal: '**Art. 68 RECAUCA** — Las mercancías estarán sujetas a verificación de peso, calidad y cantidad por la autoridad aduanera. El Decreto Ley 1 de 2008, Art. 42, establece que cualquier discrepancia superior al 5% en peso bruto constituirá causal de retención preventiva.',
    stellaNota: 'Jefe, esta diferencia de peso es significativa. Te recomiendo solicitar un re-pesaje certificado antes de proceder. Puedo generar una Carta de Explicación al Administrador del Recinto.',
    fechaCreacion: '2026-02-07T08:30:00',
  },
  {
    id: 'exp-004',
    referencia: 'DUA #7744',
    tipo: 'DUA',
    consignatario: 'Tech Solutions Panamá',
    descripcion: 'Clasificación arancelaria inconsistente: 8471.30 vs 8528.71',
    cuadrante: 'integrity',
    zodVeredicto: 'Partida arancelaria declarada no corresponde al producto descrito. Riesgo de liquidación incorrecta.',
    errores: [
      'HTS declarado: 8471.30 (Máquinas automáticas de proceso de datos)',
      'HTS sugerido por ZENITH: 8528.71 (Monitores de video)',
      'Diferencia en DAI: 5% vs 15%',
    ],
    baseLegal: '**Art. 90 RECAUCA** — La clasificación arancelaria es responsabilidad del corredor de aduanas, quien deberá verificar la naturaleza, composición y uso del producto.',
    stellaNota: 'La diferencia en DAI es del 10 puntos. Revisa las Notas Explicativas del Capítulo 85 antes de firmar.',
    fechaCreacion: '2026-02-07T09:15:00',
  },
  // 🟧 Regulatory Urgencies
  {
    id: 'exp-002',
    referencia: 'MAWB #5521',
    tipo: 'MAWB',
    consignatario: 'FarmaCentro Inc.',
    descripcion: 'Falta permiso MINSA para medicamentos Clase II',
    cuadrante: 'regulatory',
    agencia: 'MINSA',
    etaHoras: 3.5,
    permisoRequerido: 'Registro Sanitario MINSA - DNFD',
    baseLegal: '**Decreto Ejecutivo 178 de 2001** — Todo medicamento importado debe contar con Registro Sanitario vigente emitido por la Dirección Nacional de Farmacia y Drogas del MINSA. **Art. 15 Ley 1 de 2001** — Establece sanciones de $5,000 a $50,000 por importación sin registro.',
    stellaNota: 'Jefe, esta carga tiene medicamentos Clase II. Sin el permiso MINSA, la ANA no liberará el levante. Te sugiero contactar al importador para que presente el registro sanitario antes del arribo.',
    fechaCreacion: '2026-02-07T07:00:00',
  },
  {
    id: 'exp-005',
    referencia: 'B/L #3387',
    tipo: 'BL',
    consignatario: 'AgroExport Chiriquí',
    descripcion: 'Productos fitosanitarios requieren certificación MIDA',
    cuadrante: 'regulatory',
    agencia: 'MIDA',
    etaHoras: 8,
    permisoRequerido: 'Certificado Fitosanitario de Importación',
    baseLegal: '**Decreto Ejecutivo 121 de 1999** — Todos los productos de origen vegetal requieren certificado fitosanitario del país de origen y aprobación del MIDA.',
    stellaNota: 'La carga incluye agroquímicos. El MIDA requiere el certificado fitosanitario antes de la inspección. Aún hay tiempo — el arribo es en 8 horas.',
    fechaCreacion: '2026-02-07T06:45:00',
  },
  // 🟦 Gold Flow
  {
    id: 'exp-003',
    referencia: 'CPIC #1022',
    tipo: 'CPIC',
    consignatario: 'GlobeTrade Panamá S.A.',
    descripcion: 'Expediente con 100% de cumplimiento — Listo para firma digital',
    cuadrante: 'gold',
    cumplimiento: 100,
    baseLegal: '**Art. 126 RECAUCA** — Una vez verificada la documentación y el cumplimiento de las obligaciones tributarias, el corredor podrá solicitar el levante de las mercancías.',
    stellaNota: 'Todo en orden, jefe. El expediente cumple al 100%. Todas las tasas están calculadas y los permisos verificados. Puedes firmar con confianza.',
    fechaCreacion: '2026-02-07T10:00:00',
  },
  {
    id: 'exp-006',
    referencia: 'MAWB #8810',
    tipo: 'MAWB',
    consignatario: 'Electronics Hub PTY',
    descripcion: 'Electrónicos de consumo — Cumplimiento verificado',
    cuadrante: 'gold',
    cumplimiento: 100,
    baseLegal: '**TLC Panamá-EE.UU., Capítulo 3** — Mercancías originarias con certificado EUR.1 gozan de preferencia arancelaria.',
    stellaNota: 'Excelente expediente. Origen verificado bajo TLC con EE.UU. DAI preferencial del 0% aplicado correctamente.',
    fechaCreacion: '2026-02-07T09:30:00',
  },
  // 🟨 Consulting
  {
    id: 'exp-007',
    referencia: 'COMIECO-112-2026',
    tipo: 'DUA',
    consignatario: '',
    descripcion: 'Nueva resolución COMIECO: Actualización del SAC para partidas del Capítulo 39 (Plásticos)',
    cuadrante: 'consulting',
    fuenteLegal: 'COMIECO / SIECA',
    resumenNoticia: 'El Consejo de Ministros de Integración Económica aprobó la actualización del Sistema Arancelario Centroamericano (SAC) para las subpartidas del Capítulo 39, efectiva desde el 1 de marzo de 2026. Impacta importaciones de envases plásticos y polímeros.',
    baseLegal: '**Resolución COMIECO-112-2026** — Modifica las Notas Explicativas del Capítulo 39 del SAC. Los corredores deben actualizar sus tablas de clasificación antes del 1 de marzo.',
    stellaNota: 'Jefe, esta resolución afecta a varios de tus clientes que importan envases. Te sugiero revisar las partidas 3923 y 3926 de tu base de clasificaciones.',
    fechaCreacion: '2026-02-06T14:00:00',
  },
  {
    id: 'exp-008',
    referencia: 'ANA-RES-049-2026',
    tipo: 'DUA',
    consignatario: '',
    descripcion: 'ANA publica nuevos criterios para valoración en aduana de mercancías usadas',
    cuadrante: 'consulting',
    fuenteLegal: 'ANA / Dirección de Gestión Técnica',
    resumenNoticia: 'La Autoridad Nacional de Aduanas establece nuevos métodos de valoración para vehículos y maquinaria usada, basados en las tablas de depreciación actualizadas de la OMC (Acuerdo de Valoración del GATT, Art. VII).',
    baseLegal: '**Resolución ANA 049-2026** — Actualiza los criterios de valoración en aduana según el Acuerdo de Valoración de la OMC.',
    stellaNota: 'Importante para operaciones de maquinaria pesada. Los nuevos criterios de depreciación pueden reducir la base imponible en hasta un 30%.',
    fechaCreacion: '2026-02-05T16:00:00',
  },
];

// ── Quadrant Configs ────────────────────────────────────
const CUADRANTES = {
  integrity: {
    titulo: 'Integrity Block',
    emoji: '🟥',
    icon: ShieldAlert,
    badgeLabel: 'Veredicto de Zod',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    headerClass: 'border-l-4 border-l-destructive',
    cardGlow: 'shadow-[0_0_20px_hsl(0_84%_60%/0.1)]',
    agente: 'zod' as const,
  },
  regulatory: {
    titulo: 'Regulatory Urgencies',
    emoji: '🟧',
    icon: Clock,
    badgeLabel: 'Urgencia Regulatoria',
    badgeClass: 'bg-warning/15 text-warning border-warning/30',
    headerClass: 'border-l-4 border-l-warning',
    cardGlow: 'shadow-[0_0_20px_hsl(38_92%_50%/0.1)]',
    agente: 'stella' as const,
  },
  gold: {
    titulo: 'Gold Flow',
    emoji: '🟦',
    icon: CheckCircle2,
    badgeLabel: 'Cumplimiento Total',
    badgeClass: 'bg-success/15 text-success border-success/30',
    headerClass: 'border-l-4 border-l-primary',
    cardGlow: 'shadow-[0_0_20px_hsl(187_90%_51%/0.1)]',
    agente: 'stella' as const,
  },
  consulting: {
    titulo: 'Consulting',
    emoji: '🟨',
    icon: BookOpen,
    badgeLabel: 'Feed Normativo',
    badgeClass: 'bg-warning/15 text-warning border-warning/30',
    headerClass: 'border-l-4 border-l-warning',
    cardGlow: '',
    agente: 'stella' as const,
  },
};

// ── Helper: ETA bar color ───────────────────────────────
function etaColor(hours: number | undefined) {
  if (!hours) return 'bg-muted';
  if (hours < 4) return 'bg-destructive';
  if (hours < 8) return 'bg-warning';
  return 'bg-success';
}

function etaPercent(hours: number | undefined) {
  if (!hours) return 0;
  // 24h = full bar. Invert so less time → more fill
  return Math.max(5, Math.min(100, ((24 - hours) / 24) * 100));
}

// ── Main Component ──────────────────────────────────────
export function StellaInBox() {
  const [selectedExp, setSelectedExp] = useState<Expediente | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (exp: Expediente) => {
    setSelectedExp(exp);
    setDrawerOpen(true);
  };

  const byQuadrant = (q: Expediente['cuadrante']) =>
    MOCK_EXPEDIENTES.filter(e => e.cuadrante === q);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center stella-pulse">
            <Sparkles className="w-5 h-5 text-stella" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-wide text-gradient">
              Stella's Inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              Bandeja de entrada del Corredor — {MOCK_EXPEDIENTES.length} expedientes activos
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-stella text-xs gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          En línea
        </Badge>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(Object.keys(CUADRANTES) as Array<keyof typeof CUADRANTES>).map(key => {
          const cfg = CUADRANTES[key];
          const items = byQuadrant(key);
          const Icon = cfg.icon;

          return (
            <Card
              key={key}
              className={`card-elevated ${cfg.headerClass} ${cfg.cardGlow} overflow-hidden`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base font-display tracking-wide">
                    <span className="text-lg">{cfg.emoji}</span>
                    <Icon className="w-4 h-4" />
                    {cfg.titulo}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${cfg.badgeClass}`}>
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
                {items.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => openDrawer(exp)}
                    className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-border transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {exp.referencia}
                          </span>
                          {exp.cuadrante === 'integrity' && (
                            <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                              <Lock className="w-2.5 h-2.5" /> Bloqueado
                            </Badge>
                          )}
                          {exp.agencia && (
                            <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30">
                              {exp.agencia}
                            </Badge>
                          )}
                          {exp.cumplimiento === 100 && (
                            <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30 gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {exp.descripcion}
                        </p>
                        {exp.consignatario && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.consignatario}
                          </p>
                        )}

                        {/* ETA bar for regulatory */}
                        {exp.cuadrante === 'regulatory' && exp.etaHoras !== undefined && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Timer className="w-3 h-3" /> ETA Arribo
                              </span>
                              <span className={`font-mono font-bold ${
                                exp.etaHoras < 4 ? 'text-destructive' : 'text-warning'
                              }`}>
                                {exp.etaHoras}h
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${etaColor(exp.etaHoras)}`}
                                style={{ width: `${etaPercent(exp.etaHoras)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Source for consulting */}
                        {exp.fuenteLegal && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" /> {exp.fuenteLegal}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors mt-1 flex-shrink-0" />
                    </div>
                  </button>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground/50 text-sm">
                    Sin expedientes en este cuadrante
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Drawer ─────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          {selectedExp && (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-3">
                  {/* Avatar — Stella or Zod */}
                  {CUADRANTES[selectedExp.cuadrante].agente === 'zod' ? (
                    <Avatar className="h-10 w-10 border-2 border-warning/40">
                      <AvatarFallback className="bg-warning/10 text-zod font-bold font-display text-sm">
                        <Shield className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-10 w-10 border-2 border-primary/40">
                      <AvatarFallback className="bg-primary/10 text-stella font-bold font-display text-sm">
                        <Sparkles className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <DrawerTitle className="font-display tracking-wide text-lg">
                      {selectedExp.referencia}
                    </DrawerTitle>
                    <DrawerDescription className="text-xs">
                      {selectedExp.consignatario || selectedExp.fuenteLegal || 'Expediente ZENITH'}
                    </DrawerDescription>
                  </div>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-2 space-y-4 overflow-y-auto scrollbar-thin">
                {/* Zod Verdict */}
                {selectedExp.zodVeredicto && (
                  <div className="glass-panel-zod p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-zod" />
                      <span className="font-display text-sm font-semibold text-zod">
                        Veredicto de Zod
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{selectedExp.zodVeredicto}</p>
                    {selectedExp.errores && (
                      <ul className="space-y-1 mt-2">
                        {selectedExp.errores.map((err, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-destructive/80">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Regulatory info */}
                {selectedExp.agencia && (
                  <div className="glass-panel p-4 rounded-lg space-y-2 border-warning/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="font-display text-sm font-semibold text-warning">
                        Urgencia Regulatoria — {selectedExp.agencia}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">
                      Permiso requerido: <strong>{selectedExp.permisoRequerido}</strong>
                    </p>
                    {selectedExp.etaHoras !== undefined && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Tiempo restante para arribo</span>
                          <span className={`font-mono font-bold ${
                            selectedExp.etaHoras < 4 ? 'text-destructive' : 'text-warning'
                          }`}>
                            {selectedExp.etaHoras}h
                          </span>
                        </div>
                        <Progress
                          value={etaPercent(selectedExp.etaHoras)}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Consulting summary */}
                {selectedExp.resumenNoticia && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {selectedExp.resumenNoticia}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Sustento Legal (Markdown-style) */}
                {selectedExp.baseLegal && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-stella" />
                      <span className="font-display text-sm font-semibold text-stella">
                        Sustento Legal
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-foreground/80 leading-relaxed">
                      {selectedExp.baseLegal.split('**').map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="text-foreground">{part}</strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Stella's Note */}
                {selectedExp.stellaNota && (
                  <div className="glass-panel-stella p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border border-primary/30 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-stella text-xs">
                          <Sparkles className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold text-stella mb-1">Stella — Nota Técnica</p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {selectedExp.stellaNota}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <DrawerFooter className="border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedExp.cuadrante === 'integrity' && (
                    <Button size="sm" variant="outline" className="gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                      <FileText className="w-3.5 h-3.5" />
                      Generar Carta de Explicación
                    </Button>
                  )}
                  {selectedExp.cuadrante === 'regulatory' && (
                    <>
                      <Button size="sm" variant="outline" className="gap-2 text-xs border-warning/30 text-warning hover:bg-warning/10">
                        <Upload className="w-3.5 h-3.5" />
                        Cargar Permiso
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2 text-xs border-primary/30 text-stella hover:bg-primary/10">
                        <BookOpen className="w-3.5 h-3.5" />
                        Ver Guía de Trámite
                      </Button>
                    </>
                  )}
                  {selectedExp.cuadrante === 'gold' && (
                    <Button size="sm" className="gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      <Fingerprint className="w-3.5 h-3.5" />
                      Firma Digital SHA-256
                    </Button>
                  )}
                  {selectedExp.cuadrante === 'consulting' && (
                    <Button size="sm" variant="outline" className="gap-2 text-xs border-primary/30 text-stella hover:bg-primary/10">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Guía de Trámite
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
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
