import { useState, useCallback } from 'react';
import { Search, Inbox, Sparkles } from 'lucide-react';
import { IngestaUniversalDashboard } from '@/components/ingesta/IngestaUniversalDashboard';
import { FlujoCargaUnificado } from '@/components/manifest/FlujoCargaUnificado';
import { SelectorModoTransporte, useTransportMode } from '@/components/transporte/SelectorModoTransporte';
import { FileUpload, MAWBInfo } from '@/components/manifest/FileUpload';
import { ColumnMapper } from '@/components/manifest/ColumnMapper';
import { DataPreview } from '@/components/manifest/DataPreview';
import { ProcessingProgress } from '@/components/manifest/ProcessingProgress';
import { VisualDashboard } from '@/components/manifest/VisualDashboard';
import { ConfigPanel } from '@/components/manifest/ConfigPanel';
import { ValidacionGuiasAlert } from '@/components/manifest/ValidacionGuiasAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  parseExcelFile,
  mapDataToManifest,
  processManifest,
  ExtendedProcessingResult
} from '@/lib/excelProcessor';
import { loadConfig } from '@/lib/storage';
import {
  ManifestRow,
  ProcessingConfig,
  ColumnMapping,
  ProcessingWarning
} from '@/types/manifest';
import { ResultadoValidacionLote } from '@/lib/validacion/validadorGuias';
import { AnalizadorManifiesto } from '@/lib/analizador/analizador-manifiesto-completo';
import { toast } from 'sonner';
import { FileText, ShieldCheck, AlertTriangle, BarChart3 } from 'lucide-react';

type ProcessingStep = 'upload' | 'mapping' | 'preview' | 'processing' | 'results';

// ─── KPI Widget ─────────────────────────────────────────────────

function KPIWidget({ label, value, icon: Icon, trend, variant = 'default' }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}) {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-primary',
  };
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={`text-2xl font-bold ${colorMap[variant]}`}>{value}</p>
            {trend && (
              <p className="text-[11px] text-muted-foreground">{trend}</p>
            )}
          </div>
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Index() {
  const [step, setStep] = useState<ProcessingStep>('upload');
  const [config, setConfig] = useState<ProcessingConfig>(loadConfig());
  const [rawData, setRawData] = useState<{ headers: string[]; data: Record<string, unknown>[] } | null>(null);
  const [mappedData, setMappedData] = useState<ManifestRow[]>([]);
  const [warnings, setWarnings] = useState<ProcessingWarning[]>([]);
  const [validacionGuias, setValidacionGuias] = useState<ResultadoValidacionLote | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mawbInfo, setMawbInfo] = useState<MAWBInfo | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [modoFlujo, setModoFlujo] = useState<'ingesta' | 'unificado' | 'clasico'>('ingesta');

  const { modo: modoTransporte, zona: zonaAduanera, setModo, setZona } = useTransportMode();

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await parseExcelFile(file);
      if (data.data.length === 0) throw new Error('El archivo no contiene datos');
      setRawData(data);
      setFileLoaded(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const analisis = await AnalizadorManifiesto.analizarArchivo(arrayBuffer);
        if (analisis.mawb && analisis.aerolinea) {
          const detectedMawb: MAWBInfo = {
            mawb: analisis.mawb,
            airlineCode: analisis.prefijoIATA || analisis.mawb.split('-')[0] || '000',
            airlineName: analisis.aerolinea,
            sequenceNumber: analisis.mawb.includes('-') ? analisis.mawb.split('-')[1] : analisis.mawb.slice(3),
            formatted: `MAWB ${analisis.mawb}`,
            isValid: true,
          };
          setMawbInfo(detectedMawb);
          toast.success(`MAWB detectado: ${analisis.mawb} — ${analisis.aerolinea}`, { duration: 5000 });
        }
      } catch (mawbError) {
        console.warn('No se pudo detectar MAWB automáticamente:', mawbError);
      }
      toast.success(`Archivo cargado: ${data.data.length.toLocaleString()} registros`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar el archivo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartProcessing = useCallback(() => {
    if (!rawData) return;
    setStep('mapping');
  }, [rawData]);

  const handleMapping = useCallback((mapping: ColumnMapping) => {
    if (!rawData) return;
    const { rows, warnings: mapWarnings, validacionGuias: validacion } = mapDataToManifest(rawData.data, mapping);
    setMappedData(rows);
    setWarnings(mapWarnings);
    setValidacionGuias(validacion);
    setStep('preview');
    if (validacion.mawbsDetectados > 0) {
      toast.error(`Se detectaron ${validacion.mawbsDetectados} MAWB(s) usados como guías individuales`, { duration: 8000 });
    } else if (mapWarnings.length > 0) {
      toast.warning(`${mapWarnings.length} advertencias encontradas`);
    }
  }, [rawData]);

  const handleProcess = useCallback(async () => {
    setStep('processing');
    setProcessingProgress(0);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const processingResult = processManifest(mappedData, config, (progress) => {
        setProcessingProgress(progress);
      });
      setResult(processingResult);
      setProcessingProgress(100);
      setTimeout(() => {
        setStep('results');
        toast.success(`Procesamiento completado: ${processingResult.batches.length} lotes generados`);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en el procesamiento');
      toast.error('Error durante el procesamiento');
      setStep('preview');
    }
  }, [mappedData, config]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setRawData(null);
    setMappedData([]);
    setWarnings([]);
    setValidacionGuias(null);
    setResult(null);
    setError(null);
    setProcessingProgress(0);
    setMawbInfo(null);
    setFileLoaded(false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Centro de Operaciones</h1>
            <p className="text-sm text-muted-foreground">LEXIS — Clasificación, análisis e integridad documental</p>
          </div>
          {step === 'upload' && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Stella activa
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldCheck className="w-3 h-3" />
                Zod activo
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Widgets */}
        {step === 'upload' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIWidget label="Trámites en Curso" value={12} icon={FileText} trend="3 nuevos hoy" variant="info" />
            <KPIWidget label="Impuestos Pre-liquidados" value="$48,320" icon={BarChart3} trend="USD este mes" variant="default" />
            <KPIWidget label="Riesgos Mitigados" value={97} icon={ShieldCheck} trend="% tasa de éxito" variant="success" />
            <KPIWidget label="Alertas Pendientes" value={3} icon={AlertTriangle} trend="Requieren revisión" variant="warning" />
          </div>
        )}

        {/* Flow selector */}
        {step === 'upload' && (
          <div>
            <Tabs value={modoFlujo} onValueChange={(v) => setModoFlujo(v as 'ingesta' | 'unificado' | 'clasico')}>
              <TabsList>
                <TabsTrigger value="ingesta" className="gap-2">
                  <Inbox className="w-4 h-4" />
                  LEXIS: Intelligence Ingress
                </TabsTrigger>
                <TabsTrigger value="unificado" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Flujo Unificado
                </TabsTrigger>
                <TabsTrigger value="clasico">
                  Flujo Clásico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingesta" className="mt-4">
                <IngestaUniversalDashboard />
              </TabsContent>

              <TabsContent value="unificado" className="mt-4">
                <FlujoCargaUnificado />
              </TabsContent>

              <TabsContent value="clasico" className="mt-4 space-y-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      Cargar Manifiesto de Transporte
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Sube tu archivo Excel para comenzar el procesamiento
                    </p>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <SelectorModoTransporte
                        modoSeleccionado={modoTransporte}
                        zonaSeleccionada={zonaAduanera}
                        onModoChange={setModo}
                        onZonaChange={setZona}
                      />
                    </CardContent>
                  </Card>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    onMawbChange={setMawbInfo}
                    onProcess={handleStartProcessing}
                    mawbInfo={mawbInfo}
                    isLoading={isLoading}
                    error={error}
                    fileLoaded={fileLoaded}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step indicator for non-upload steps */}
        {step !== 'upload' && (
          <div className="flex items-center gap-2 text-sm">
            {[
              { key: 'upload', label: '1. Cargar' },
              { key: 'mapping', label: '2. Mapear' },
              { key: 'preview', label: '3. Revisar' },
              { key: 'processing', label: '4. Procesar' },
              { key: 'results', label: '5. Resultados' },
            ].map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div className={`
                  px-3 py-1.5 rounded-full font-medium transition-all duration-300 text-xs
                  ${step === s.key
                    ? 'bg-primary text-primary-foreground'
                    : ['upload', 'mapping', 'preview', 'processing', 'results'].indexOf(step) > index
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {s.label}
                </div>
                {index < 4 && (
                  <div className={`w-6 h-0.5 mx-1 transition-colors duration-300 ${
                    ['upload', 'mapping', 'preview', 'processing', 'results'].indexOf(step) > index
                      ? 'bg-success'
                      : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* MAWB display */}
        {mawbInfo?.isValid && step !== 'upload' && (
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm">✈️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{mawbInfo.formatted}</p>
                <p className="text-xs text-muted-foreground">
                  {mawbInfo.airlineName} ({mawbInfo.airlineCode})
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Panel */}
        {((step === 'upload' && modoFlujo === 'clasico') || step === 'preview') && (
          <ConfigPanel config={config} onConfigChange={setConfig} />
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {step === 'mapping' && rawData && (
            <ColumnMapper headers={rawData.headers} onMapping={handleMapping} />
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {validacionGuias && <ValidacionGuiasAlert resultado={validacionGuias} />}
              <DataPreview data={mappedData} warnings={warnings} onConfirm={handleProcess} />
            </div>
          )}

          {step === 'processing' && (
            <ProcessingProgress
              progress={processingProgress}
              status={processingProgress < 100 ? 'processing' : 'complete'}
              message={
                processingProgress < 30 ? 'Clasificando productos...'
                  : processingProgress < 60 ? 'Agrupando por categorías...'
                  : processingProgress < 90 ? 'Generando lotes...'
                  : 'Finalizando...'
              }
            />
          )}

          {step === 'results' && result && (
            <VisualDashboard result={result} config={config} mawbInfo={mawbInfo} onReset={handleReset} />
          )}
        </div>
      </div>
    </div>
  );
}
