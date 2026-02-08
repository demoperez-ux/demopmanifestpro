/**
 * SANCTION RISK MONITOR — Veredicto de Cumplimiento
 * Panel lateral con scoring, hallazgos de Stella y Hard Stop de Zod
 * Estética corporativa: limpio, minimalista, colores suaves
 */

import { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, CheckCircle2, Lock,
  FileWarning, Scale, DollarSign, Package,
  Fingerprint, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  SanctionScoreEngine,
  type SanctionScore,
  type SanctionInput,
  type HallazgoStella,
} from '@/lib/compliance/SanctionScoreEngine';
import { generarFirmaDigital } from '@/lib/core/SistemaFirmaDigital';

// ── Category Icon Map ──

function CategoriaIcon({ categoria }: { categoria: HallazgoStella['categoria'] }) {
  switch (categoria) {
    case 'peso': return <Scale className="h-3.5 w-3.5" />;
    case 'documento': return <FileWarning className="h-3.5 w-3.5" />;
    case 'precio': return <DollarSign className="h-3.5 w-3.5" />;
    default: return <Package className="h-3.5 w-3.5" />;
  }
}

// ── Score Ring ──

function ScoreRing({ score, maxDisplay = 150 }: { score: number; maxDisplay?: number }) {
  const pct = Math.min((score / maxDisplay) * 100, 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  let strokeColor = 'hsl(var(--success))';
  if (score > 50) strokeColor = 'hsl(var(--destructive))';
  else if (score > 25) strokeColor = 'hsl(var(--warning))';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="6"
        />
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none">{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">pts</span>
      </div>
    </div>
  );
}

// ── Hallazgo Item ──

function HallazgoItem({ hallazgo }: { hallazgo: HallazgoStella }) {
  const [open, setOpen] = useState(false);

  const severidadStyles: Record<string, string> = {
    critica: 'border-l-destructive/60 bg-destructive/[0.03]',
    alta: 'border-l-warning/60 bg-warning/[0.03]',
    media: 'border-l-primary/40 bg-primary/[0.02]',
    baja: 'border-l-border bg-muted/30',
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={`w-full text-left p-3 rounded-lg border border-border/50 border-l-[3px] ${severidadStyles[hallazgo.severidad]} hover:bg-accent/30 transition-colors`}>
          <div className="flex items-start gap-2.5">
            <span className={hallazgo.severidad === 'critica' ? 'text-destructive mt-0.5' : hallazgo.severidad === 'alta' ? 'text-warning mt-0.5' : 'text-muted-foreground mt-0.5'}>
              <CategoriaIcon categoria={hallazgo.categoria} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-foreground truncate">
                  {hallazgo.titulo}
                </span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 flex-shrink-0 border-border/60">
                  +{hallazgo.puntos}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {hallazgo.detalle}
              </p>
            </div>
            {open ? <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1.5 p-2.5 rounded-md bg-muted/20 border border-border/30 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-foreground/80 leading-relaxed italic">
              {hallazgo.stellaMensaje}
            </p>
          </div>
          {hallazgo.fundamentoLegal && (
            <p className="text-[10px] text-muted-foreground font-mono">
              {hallazgo.fundamentoLegal}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Override Dialog ──

function OverrideDialog({
  open,
  onClose,
  score,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  score: SanctionScore;
  onConfirm: (nombre: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [firmando, setFirmando] = useState(false);

  const handleConfirm = async () => {
    if (!nombre.trim()) {
      toast.error('Ingrese su nombre completo para la firma');
      return;
    }
    setFirmando(true);
    // Simulate signature process
    await new Promise(r => setTimeout(r, 1200));
    onConfirm(nombre.trim());
    setFirmando(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-sm">Override de Seguridad — Firma Electrónica</DialogTitle>
              <DialogDescription className="text-xs">
                Solo Corredor Senior puede aplicar este salto de seguridad
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs text-foreground/90 leading-relaxed">
              <span className="font-semibold">Advertencia legal:</span> Al aplicar este Override,
              usted asume la responsabilidad legal completa por cualquier inexactitud detectada
              en el expediente <span className="font-mono">{score.referencia}</span> con un score
              de <span className="font-bold">{score.scoreTotal} puntos</span>.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              De conformidad con el Decreto de Gabinete No. 41 de 2002, Art. 15 y CAUCA Art. 86.
            </p>
          </div>

          <div className="space-y-3">
            {score.hallazgos.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                <AlertTriangle className="h-3 w-3 text-warning mt-0.5 flex-shrink-0" />
                <span>{h.titulo}: {h.detalle.substring(0, 80)}...</span>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Nombre completo del Corredor</Label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Lic. Juan Pérez — Corredor #1234"
              className="text-sm mt-1"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={firmando || !nombre.trim()}
              className="bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20"
            >
              <Fingerprint className="h-3.5 w-3.5 mr-1.5" />
              {firmando ? 'Firmando...' : 'Firmar y Aplicar Override'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Panel ──

interface SanctionRiskPanelProps {
  input: SanctionInput;
  onTransmitirDisabled?: (disabled: boolean) => void;
  compact?: boolean;
}

export default function SanctionRiskPanel({
  input,
  onTransmitirDisabled,
  compact = false,
}: SanctionRiskPanelProps) {
  const { role, user } = useAuth();
  const [showOverride, setShowOverride] = useState(false);
  const [overrideScore, setOverrideScore] = useState<SanctionScore | null>(null);

  const score = useMemo(() => {
    const result = SanctionScoreEngine.calculateSanctionScore(input);
    onTransmitirDisabled?.(result.zodHardStop);
    return overrideScore ?? result;
  }, [input, overrideScore, onTransmitirDisabled]);

  const esCorredor = role === 'revisor' || role === 'admin';

  const handleOverride = (nombre: string) => {
    const updated = SanctionScoreEngine.aplicarOverride(
      score,
      user?.id || 'unknown',
      nombre
    );
    setOverrideScore(updated);
    onTransmitirDisabled?.(false);
    toast.success(`Override aplicado por ${nombre}. Transmisión desbloqueada.`);
  };

  const nivelStyles = {
    bajo: { badge: 'default' as const, label: 'BAJO', color: 'text-success' },
    moderado: { badge: 'secondary' as const, label: 'MODERADO', color: 'text-warning' },
    alto: { badge: 'destructive' as const, label: 'ALTO', color: 'text-destructive' },
    critico: { badge: 'destructive' as const, label: 'CRÍTICO', color: 'text-destructive' },
  };

  const nivel = nivelStyles[score.nivelRiesgo];

  if (compact && score.scoreTotal === 0) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-xs text-foreground/80">Sin hallazgos de riesgo</span>
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-3 space-y-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-primary" />
              Veredicto de Cumplimiento
            </CardTitle>
            <Badge variant={nivel.badge} className="text-[10px] uppercase tracking-wider">
              {nivel.label}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Pre-Payment Audit — Sanction Risk Monitor
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score + Summary */}
          <div className="flex items-center gap-4">
            <ScoreRing score={score.scoreTotal} />
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Hallazgos</p>
                <p className="text-lg font-semibold">{score.hallazgos.length}</p>
              </div>
              <Progress
                value={Math.min((score.scoreTotal / 150) * 100, 100)}
                className="h-1.5"
              />
              <p className="text-[10px] text-muted-foreground">
                Umbral Hard Stop: {score.scoreTotal}/{'>'}50 pts
              </p>
            </div>
          </div>

          {/* Zod Hard Stop Banner */}
          {score.zodHardStop && !score.overrideAplicado && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-destructive">
                    Zod Hard Stop — Transmisión Bloqueada
                  </p>
                  <p className="text-[11px] text-foreground/70 mt-1 leading-relaxed">
                    Score de {score.scoreTotal} pts excede el umbral de 50. Los botones de
                    Pagar Impuestos y Transmitir SIGA están deshabilitados.
                  </p>
                  {esCorredor && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs border-warning/40 text-warning hover:bg-warning/10"
                      onClick={() => setShowOverride(true)}
                    >
                      <Fingerprint className="h-3 w-3 mr-1.5" />
                      Aplicar Override (Corredor Senior)
                    </Button>
                  )}
                  {!esCorredor && (
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Solo un Corredor Senior puede desbloquear mediante firma electrónica.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Override Applied Banner */}
          {score.overrideAplicado && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-start gap-2">
                <Fingerprint className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-warning">
                    Override Aplicado
                  </p>
                  <p className="text-[11px] text-foreground/70 mt-0.5">
                    {score.overridePor} asumió responsabilidad legal.
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-1">
                    Firma: {score.overrideFirmaHash?.substring(0, 32)}...
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Hallazgos List */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Hallazgos de Stella</span>
              {score.hallazgos.length > 0 && (
                <Badge variant="outline" className="text-[9px] h-4 ml-auto border-border/60">
                  {score.hallazgos.length}
                </Badge>
              )}
            </div>

            {score.hallazgos.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs text-foreground/80">
                  Sin hallazgos — Expediente limpio
                </span>
              </div>
            ) : (
              <ScrollArea className={compact ? 'h-[180px]' : 'h-[250px]'}>
                <div className="space-y-2 pr-2">
                  {score.hallazgos.map(h => (
                    <HallazgoItem key={h.id} hallazgo={h} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Stella Verdict */}
          <div className="p-3 rounded-lg bg-primary/[0.03] border border-primary/10">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-foreground/80 leading-relaxed italic">
                {score.stellaVeredicto}
              </p>
            </div>
          </div>

          {/* Audit Hash */}
          <p className="text-[9px] text-muted-foreground font-mono text-center">
            Auditoría: {score.hashAuditoria.substring(0, 40)}...
          </p>
        </CardContent>
      </Card>

      <OverrideDialog
        open={showOverride}
        onClose={() => setShowOverride(false)}
        score={score}
        onConfirm={handleOverride}
      />
    </>
  );
}
