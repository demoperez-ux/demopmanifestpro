// ============================================
// PANEL CAUCA/RECAUCA — CUMPLIMIENTO NORMATIVO
// Dashboard integrado: KYC + Regímenes + Inexactitud + Bóveda
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Shield, Clock, AlertTriangle, FileCheck, Timer,
  CheckCircle2, XCircle, Search, Download, Archive,
  Scale, FileWarning, Lock, User, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { MotorKYC, type ClienteKYC, type ResultadoKYC } from '@/lib/compliance/MotorKYC';
import {
  MotorRegimenesEspeciales,
  type CuentaRegresiva,
  type EstadisticasRegimenes,
  type AlertaRegimen,
} from '@/lib/regimenes/MotorRegimenesEspeciales';
import {
  ValidadorInexacto,
  type DocumentoComparacion,
  type ResultadoValidacionInexacta,
} from '@/lib/validacion/ValidadorInexacto';

// ── KYC Form Component ──

function KYCValidationPanel() {
  const [cliente, setCliente] = useState<ClienteKYC>({
    nombre: '',
    rucCedula: '',
    representanteLegal: '',
    documentoRepresentante: '',
    avisoOperacionNumero: '',
  });
  const [resultado, setResultado] = useState<ResultadoKYC | null>(null);
  const [validando, setValidando] = useState(false);

  const ejecutarKYC = async () => {
    if (!cliente.nombre || !cliente.rucCedula) {
      toast.error('Nombre y RUC/Cédula son requeridos');
      return;
    }
    setValidando(true);
    try {
      const res = await MotorKYC.validarCliente(cliente);
      setResultado(res);
      if (res.aprobado) {
        toast.success('KYC aprobado — Cliente verificado');
      } else {
        toast.error(`KYC rechazado — Score: ${res.scoreKYC}/100`);
      }
    } catch {
      toast.error('Error ejecutando validación KYC');
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nombre / Razón Social</Label>
          <Input
            value={cliente.nombre}
            onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))}
            placeholder="IMPORTADORA PANAMÁ S.A."
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">RUC / Cédula</Label>
          <Input
            value={cliente.rucCedula}
            onChange={e => setCliente(c => ({ ...c, rucCedula: e.target.value }))}
            placeholder="155622345-2-2023"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Representante Legal</Label>
          <Input
            value={cliente.representanteLegal || ''}
            onChange={e => setCliente(c => ({ ...c, representanteLegal: e.target.value }))}
            placeholder="Juan Pérez"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Cédula del Representante</Label>
          <Input
            value={cliente.documentoRepresentante || ''}
            onChange={e => setCliente(c => ({ ...c, documentoRepresentante: e.target.value }))}
            placeholder="8-814-52"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">No. Aviso de Operación (MICI)</Label>
          <Input
            value={cliente.avisoOperacionNumero || ''}
            onChange={e => setCliente(c => ({ ...c, avisoOperacionNumero: e.target.value }))}
            placeholder="AO-2024-12345"
            className="text-sm"
          />
        </div>
      </div>

      <Button onClick={ejecutarKYC} disabled={validando} className="w-full">
        <Shield className="h-4 w-4 mr-2" />
        {validando ? 'Validando...' : 'Ejecutar Validación KYC CAUCA Art. 64'}
      </Button>

      {resultado && (
        <Card className={resultado.aprobado ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'border-destructive/50 bg-destructive/5'}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {resultado.aprobado ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-semibold text-sm">
                  {resultado.aprobado ? 'KYC APROBADO' : 'KYC RECHAZADO'}
                </span>
              </div>
              <Badge variant={resultado.aprobado ? 'default' : 'destructive'}>
                Score: {resultado.scoreKYC}/100
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                {resultado.rucActivo ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span>RUC Activo</span>
              </div>
              <div className="flex items-center gap-1">
                {resultado.avisoOperacion ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span>Aviso Operación</span>
              </div>
              <div className="flex items-center gap-1">
                {resultado.poderRepresentacion ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span>Poder Representación</span>
              </div>
              <div className="flex items-center gap-1">
                {resultado.documentoCoincidefirma ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span>Zod: Doc = Firma</span>
              </div>
            </div>

            {resultado.alertas.length > 0 && (
              <div className="space-y-1">
                {resultado.alertas.map((a, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${a.tipo === 'critica' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'}`}>
                    <span className="font-medium">{a.campo}:</span> {a.mensaje}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">{resultado.zodMensaje}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Regimen Countdown Component ──

function RegimenesCountdownPanel() {
  const [cuentas, setCuentas] = useState<CuentaRegresiva[]>([]);
  const [stats, setStats] = useState<EstadisticasRegimenes | null>(null);
  const [alertas, setAlertas] = useState<AlertaRegimen[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const regimenes = await MotorRegimenesEspeciales.obtenerRegimenesActivos();
      const countdown = MotorRegimenesEspeciales.calcularCuentasRegresivas(regimenes);
      setCuentas(countdown);

      const estadisticas = await MotorRegimenesEspeciales.obtenerEstadisticas();
      setStats(estadisticas);

      const nuevasAlertas = await MotorRegimenesEspeciales.verificarYGenerarAlertas();
      setAlertas(nuevasAlertas);
    } catch {
      console.warn('Error cargando regímenes temporales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const nivelColor = (nivel: CuentaRegresiva['nivelAlerta']): string => {
    switch (nivel) {
      case 'critico': return 'text-destructive';
      case 'urgente': return 'text-orange-600 dark:text-orange-400';
      case 'precaucion': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const nivelBadge = (nivel: CuentaRegresiva['nivelAlerta']): 'destructive' | 'outline' | 'default' | 'secondary' => {
    switch (nivel) {
      case 'critico': return 'destructive';
      case 'urgente': return 'outline';
      case 'precaucion': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-xl font-bold">{stats.totalActivos}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Vencen ≤30d</p>
            <p className="text-xl font-bold text-destructive">{stats.proximos30Dias}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className="text-xl font-bold text-destructive">{stats.vencidos}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">CIF Total</p>
            <p className="text-xl font-bold">B/. {stats.valorCifTotal.toLocaleString()}</p>
          </Card>
        </div>
      )}

      {/* Alertas nuevas */}
      {alertas.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas de Regímenes Temporales</AlertTitle>
          <AlertDescription>
            {alertas.map((a, i) => (
              <p key={i} className="text-xs mt-1">{a.stellaMensaje}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Countdown list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando regímenes...</p>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Timer className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay regímenes temporales activos</p>
              <p className="text-xs">Los trámites bajo Régimen 20 aparecerán aquí con cuenta regresiva</p>
            </div>
          ) : (
            cuentas.map(c => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${nivelColor(c.nivelAlerta)}`} />
                    <span className="font-mono text-sm font-semibold">{c.referencia}</span>
                  </div>
                  <Badge variant={nivelBadge(c.nivelAlerta)}>
                    {c.diasRestantes}d restantes
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{c.consignatario}</p>
                <Progress value={c.porcentajeAvance} className="h-2 mb-1" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{c.diasTranscurridos}d transcurridos</span>
                  <span>Vence: {new Date(c.fechaVencimiento).toLocaleDateString('es-PA')}</span>
                </div>
                <p className="text-xs mt-2 italic text-muted-foreground">{c.stellaMensaje}</p>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Inexact Validation Component ──

function ValidacionInexactaPanel() {
  const [docs, setDocs] = useState<DocumentoComparacion[]>([
    { fuente: 'bl', referencia: '', pesoBrutoKg: undefined, pesoNetoKg: undefined, cantidadBultos: undefined, tipoEmbalaje: '' },
    { fuente: 'manifiesto', referencia: '', pesoBrutoKg: undefined, pesoNetoKg: undefined, cantidadBultos: undefined, tipoEmbalaje: '' },
    { fuente: 'factura', referencia: '', pesoBrutoKg: undefined, pesoNetoKg: undefined, cantidadBultos: undefined, tipoEmbalaje: '' },
  ]);
  const [resultado, setResultado] = useState<ResultadoValidacionInexacta | null>(null);

  const updateDoc = (index: number, field: keyof DocumentoComparacion, value: string | number) => {
    setDocs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const ejecutarValidacion = () => {
    const docsValidos = docs.filter(d => d.referencia.trim().length > 0);
    if (docsValidos.length < 2) {
      toast.error('Complete al menos 2 documentos con referencia');
      return;
    }
    const res = ValidadorInexacto.validar(docsValidos);
    setResultado(res);
    if (res.zodBloqueo) {
      toast.error('⛔ ZOD: Liquidación bloqueada por discrepancias críticas');
    } else if (res.riesgoInfraccion) {
      toast.warning('⚠️ Riesgo de infracción RECAUCA detectado');
    } else {
      toast.success('✓ Validación aprobada — Sin discrepancias críticas');
    }
  };

  const fuenteLabels: Record<string, string> = { bl: 'B/L', manifiesto: 'Manifiesto', factura: 'Factura' };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {docs.map((doc, i) => (
          <Card key={i} className="p-3">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
              <FileWarning className="h-3 w-3" />
              {fuenteLabels[doc.fuente]}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <Label className="text-[10px]">Referencia</Label>
                <Input
                  value={doc.referencia}
                  onChange={e => updateDoc(i, 'referencia', e.target.value)}
                  placeholder="MAWB-001"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px]">Peso Bruto (kg)</Label>
                <Input
                  type="number"
                  value={doc.pesoBrutoKg ?? ''}
                  onChange={e => updateDoc(i, 'pesoBrutoKg', parseFloat(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px]">Peso Neto (kg)</Label>
                <Input
                  type="number"
                  value={doc.pesoNetoKg ?? ''}
                  onChange={e => updateDoc(i, 'pesoNetoKg', parseFloat(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px]">Bultos</Label>
                <Input
                  type="number"
                  value={doc.cantidadBultos ?? ''}
                  onChange={e => updateDoc(i, 'cantidadBultos', parseInt(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px]">Embalaje</Label>
                <Input
                  value={doc.tipoEmbalaje || ''}
                  onChange={e => updateDoc(i, 'tipoEmbalaje', e.target.value)}
                  placeholder="Cajas"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={ejecutarValidacion} variant="outline" className="w-full">
        <Scale className="h-4 w-4 mr-2" />
        Validar Inexactitud — RECAUCA Art. 320-325
      </Button>

      {resultado && (
        <Card className={resultado.zodBloqueo ? 'border-destructive bg-destructive/5' : resultado.riesgoInfraccion ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/20' : 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20'}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {resultado.zodBloqueo ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : resultado.riesgoInfraccion ? (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <span className="font-semibold text-sm">
                  {resultado.zodBloqueo ? '⛔ ZOD BLOQUEO' : resultado.riesgoInfraccion ? '⚠️ RIESGO INFRACCIÓN' : '✓ APROBADO'}
                </span>
              </div>
              <Badge variant={resultado.zodBloqueo ? 'destructive' : resultado.riesgoInfraccion ? 'outline' : 'default'}>
                {resultado.discrepanciasCriticas} críticas / {resultado.totalDiscrepancias} total
              </Badge>
            </div>

            {resultado.discrepancias.length > 0 && (
              <div className="space-y-1">
                {resultado.discrepancias.map((d, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${d.severidad === 'critica' ? 'bg-destructive/10' : d.severidad === 'advertencia' ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                    <span className="font-semibold">{d.campoLabel}:</span>{' '}
                    {d.fuenteA} ({typeof d.valorA === 'number' ? d.valorA.toFixed(2) : d.valorA}) vs{' '}
                    {d.fuenteB} ({typeof d.valorB === 'number' ? d.valorB.toFixed(2) : d.valorB}){' '}
                    — <span className="font-mono">{d.diferencia}%</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs italic text-muted-foreground">{resultado.stellaMensaje}</p>
            <p className="text-[10px] text-muted-foreground font-mono">Hash: {resultado.zodHash.substring(0, 32)}...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Panel ──

export default function PanelCaucaRecauca() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Cumplimiento CAUCA/RECAUCA
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Módulo de responsabilidad KYC, regímenes especiales, validación de inexactitud y bóveda documental
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="kyc">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="kyc" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              KYC
            </TabsTrigger>
            <TabsTrigger value="regimenes" className="text-xs">
              <Timer className="h-3 w-3 mr-1" />
              Regímenes
            </TabsTrigger>
            <TabsTrigger value="inexacta" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Inexactitud
            </TabsTrigger>
            <TabsTrigger value="boveda" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Bóveda
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="mt-4">
            <KYCValidationPanel />
          </TabsContent>

          <TabsContent value="regimenes" className="mt-4">
            <RegimenesCountdownPanel />
          </TabsContent>

          <TabsContent value="inexacta" className="mt-4">
            <ValidacionInexactaPanel />
          </TabsContent>

          <TabsContent value="boveda" className="mt-4">
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Bóveda Documental — 60 meses inmutables</AlertTitle>
                <AlertDescription className="text-xs">
                  Los expedientes finalizados se archivan con integridad SHA-256 según el Convenio de Kyoto Revisado (Norma 9.5).
                  La exportación para auditoría genera un PDF con el formato oficial de inspección ANA.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <Archive className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-semibold">Exportar para Auditoría</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Genera expediente digital JSON + PDF según formato ANA
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-3 w-3 mr-1" />
                    Requiere trámite finalizado
                  </Button>
                </Card>

                <Card className="p-4 text-center">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-semibold">Verificar Expediente</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Valida integridad de un archivo JSON de bóveda
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Search className="h-3 w-3 mr-1" />
                    Cargar archivo .json
                  </Button>
                </Card>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Fundamento Legal:</p>
                <p>• Convenio de Kyoto Revisado — Norma 9.5: Conservación mínima 5 años</p>
                <p>• Norma 9.6: Archivo electrónico con integridad verificable</p>
                <p>• Código Fiscal de Panamá — Art. 762-O: Conservación documental</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
