import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingDown, Award, FileCheck, Loader2, Info, ArrowRight } from 'lucide-react';
import type { EstrategiaFiscal } from '@/hooks/useTradeAdvisor';

function formatBalboas(amount: number): string {
  return `B/. ${amount.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TradeAdvisorPanelProps {
  estrategias: EstrategiaFiscal[];
  loading: boolean;
  buscado: boolean;
  onAplicar: (estrategia: EstrategiaFiscal) => void;
  estrategiaAplicada: EstrategiaFiscal | null;
}

export function TradeAdvisorPanel({
  estrategias,
  loading,
  buscado,
  onAplicar,
  estrategiaAplicada,
}: TradeAdvisorPanelProps) {
  if (loading) {
    return (
      <Card className="border border-primary/20">
        <CardContent className="py-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          Consultando acuerdos comerciales...
        </CardContent>
      </Card>
    );
  }

  // Applied strategy confirmation
  if (estrategiaAplicada) {
    return (
      <Card className="border border-success/30 bg-success-light">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-success" />
            Estrategia Aplicada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-success-light text-success border-success/20">
              {estrategiaAplicada.acuerdo.tratado_codigo}
            </Badge>
            <span className="text-xs font-medium text-foreground">{estrategiaAplicada.acuerdo.tratado_nombre}</span>
          </div>

          <div className="bg-card rounded-md p-3 border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">DAI General</span>
              <span className="font-mono line-through text-muted-foreground">{estrategiaAplicada.acuerdo.arancel_general}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">DAI Preferencial</span>
              <span className="font-mono font-semibold text-success">{estrategiaAplicada.acuerdo.arancel_preferencial}%</span>
            </div>
            <Separator className="my-1.5" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-semibold">Ahorro Total</span>
              <span className="font-mono font-bold text-success">{formatBalboas(estrategiaAplicada.ahorroTotal)}</span>
            </div>
          </div>

          <div className="panel-stella p-3">
            <p className="text-xs text-foreground/80 leading-relaxed">
              <span className="font-semibold">Stella:</span> Preferencia arancelaria del {estrategiaAplicada.acuerdo.tratado_nombre} aplicada exitosamente.
              LEXIS ha registrado el <span className="font-semibold">Certificado de Origen</span> como documento obligatorio
              para este trámite. Asegúrese de adjuntarlo antes de la transmisión de la declaración.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!buscado) return null;

  if (estrategias.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="py-6 text-center">
          <Info className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            No se encontraron acuerdos preferenciales aplicables para esta partida arancelaria y país de origen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {estrategias.map((estrategia, i) => (
        <Card key={estrategia.acuerdo.id} className={`border ${i === 0 ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                {i === 0 ? (
                  <Award className="w-4 h-4 text-primary" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                )}
                {i === 0 ? 'Mejor Oportunidad' : `Opción ${i + 1}`}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {estrategia.acuerdo.tratado_codigo}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-medium text-foreground">{estrategia.acuerdo.tratado_nombre}</p>
            <p className="text-[11px] text-muted-foreground">País: {estrategia.acuerdo.pais_origen}</p>

            {/* Comparison */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-[10px] text-muted-foreground">DAI General</p>
                <p className="text-sm font-semibold font-mono text-foreground">{estrategia.acuerdo.arancel_general}%</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-success-light rounded-md p-2">
                <p className="text-[10px] text-success">DAI Preferencial</p>
                <p className="text-sm font-semibold font-mono text-success">{estrategia.acuerdo.arancel_preferencial}%</p>
              </div>
            </div>

            {/* Savings */}
            <div className="bg-primary/5 border border-primary/10 rounded-md p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/80">Ahorro en DAI</span>
                <span className="font-mono font-medium text-primary">{formatBalboas(estrategia.ahorroDai)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Ahorro Total</span>
                <span className="font-mono font-bold text-primary">{formatBalboas(estrategia.ahorroTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Reducción</span>
                <span className="font-mono text-primary">{estrategia.porcentajeAhorro.toFixed(1)}%</span>
              </div>
            </div>

            {/* Requirements */}
            {estrategia.acuerdo.requisitos_origen && (
              <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2.5 leading-relaxed">
                <span className="font-medium text-foreground">Requisitos:</span> {estrategia.acuerdo.requisitos_origen}
              </div>
            )}

            {/* Stella note for best option */}
            {i === 0 && (
              <div className="panel-stella p-3">
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <span className="font-semibold">Stella:</span> He encontrado que bajo el {estrategia.acuerdo.tratado_nombre},
                  esta carga puede {estrategia.acuerdo.arancel_preferencial === 0 ? 'exonerar el 100% del DAI' : `reducir el DAI de ${estrategia.acuerdo.arancel_general}% a ${estrategia.acuerdo.arancel_preferencial}%`}.
                  ¿Desea aplicar esta preferencia y solicitar el Certificado de Origen?
                </p>
              </div>
            )}

            <Button
              size="sm"
              variant={i === 0 ? 'default' : 'outline'}
              className="w-full text-xs gap-1.5"
              onClick={() => onAplicar(estrategia)}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Aplicar Preferencia
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
