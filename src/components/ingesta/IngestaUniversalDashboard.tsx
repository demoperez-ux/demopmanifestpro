/**
 * INGESTA UNIVERSAL DASHBOARD — ZENITH
 * 
 * Componente principal que orquesta:
 * 1. Smart Drop Zone (clasificación automática)
 * 2. Panel de Acciones Maestras (sidebar)
 * 3. Formulario de Captura Manual (con Zod)
 * 4. Document Sniffer + Monitor de Carga Externa
 * 5. Stella Checklist (Missing Docs)
 * 6. Zod Cross-Check (Consistencia Cruzada)
 */

import { useState, useCallback } from 'react';
import { Sparkles, ArrowLeft, FileText, Radar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { SmartDropZone, type ArchivoClasificado } from './SmartDropZone';
import { PanelAccionesMaestras } from './PanelAccionesMaestras';
import { FormularioCapturaManual } from './FormularioCapturaManual';
import { MonitorCargaExterna } from './MonitorCargaExterna';
import { StellaChecklist } from './StellaChecklist';
import {
  DocumentSniffer,
  type ResultadoSniffer,
  type ExpedienteExterno,
} from '@/lib/sniffer/DocumentSniffer';

type VistaActual = 'inicio' | 'formulario-manual' | 'carga-masiva';

interface DatosOCR {
  mawb?: string;
  consignatario?: string;
  ruc?: string;
  dv?: string;
  direccion?: string;
  provincia?: string;
  modoTransporte?: string;
  numLiquidacion?: string;
  lineas?: {
    descripcion?: string;
    hsCode?: string;
    cantidad?: number;
    valorFOB?: number;
    peso?: number;
    paisOrigen?: string;
  }[];
}

export function IngestaUniversalDashboard() {
  const [vista, setVista] = useState<VistaActual>('inicio');
  const [archivosClasificados, setArchivosClasificados] = useState<ArchivoClasificado[]>([]);
  const [datosOCR, setDatosOCR] = useState<DatosOCR | undefined>();
  const [tabActiva, setTabActiva] = useState<'ingesta' | 'monitor'>('ingesta');

  // Document Sniffer state
  const [resultadosSniffer, setResultadosSniffer] = useState<ResultadoSniffer[]>([]);
  const [expedientesExternos, setExpedientesExternos] = useState<ExpedienteExterno[]>([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<ExpedienteExterno | null>(null);

  // Cuando Stella clasifica archivos, ejecutar Document Sniffer
  const handleFilesClassified = useCallback((archivos: ArchivoClasificado[]) => {
    setArchivosClasificados(archivos);

    // Ejecutar Document Sniffer sobre cada archivo
    const nuevosResultados: ResultadoSniffer[] = archivos.map((archivo) => {
      // Simular contenido textual extraído (en producción usaría OCR real)
      const contenidoSimulado = generarContenidoSimulado(archivo);
      return DocumentSniffer.analizar(archivo.file.name, contenidoSimulado);
    });

    setResultadosSniffer(prev => [...prev, ...nuevosResultados]);

    // Agrupar en expedientes externos
    const todosResultados = [...resultadosSniffer, ...nuevosResultados];
    const expedientes = DocumentSniffer.agruparEnExpedientes(todosResultados);

    // Ejecutar Zod Cross-Check en expedientes que tengan Factura + BL
    const expedientesConZod = expedientes.map(exp => {
      if (exp.documentos.some(d => d.tipoDetectado === 'factura_comercial') &&
          exp.documentos.some(d => d.tipoDetectado === 'bill_of_lading')) {
        return {
          ...exp,
          consistenciaCruzada: DocumentSniffer.validarConsistenciaCruzada(exp),
        };
      }
      return exp;
    });

    setExpedientesExternos(expedientesConZod);

    // Notificaciones
    const externos = nuevosResultados.filter(r => r.origen === 'EXTERNO');
    if (externos.length > 0) {
      toast.info(`Sniffer: ${externos.length} documento(s) marcado(s) como [ORIGEN: EXTERNO]`, {
        duration: 4000,
        icon: '🔍',
      });

      // Cambiar a pestaña Monitor si hay documentos externos
      if (expedientesConZod.length > 0) {
        setTimeout(() => setTabActiva('monitor'), 1500);
      }
    }

    // OCR simulation para facturas
    const facturas = archivos.filter(a => a.tipo === 'factura_comercial' && a.confianza >= 60);
    if (facturas.length > 0) {
      const ocrData: DatosOCR = {
        consignatario: 'Importadora del Pacífico S.A.',
        ruc: '155612345',
        dv: '78',
        modoTransporte: 'aereo',
        lineas: [
          {
            descripcion: 'Electronic Components - Printed Circuit Boards',
            hsCode: '8534.00.00',
            cantidad: 50,
            valorFOB: 1250.00,
            peso: 12.5,
            paisOrigen: 'CN',
          },
        ],
      };
      setDatosOCR(ocrData);
      toast.success('Stella OCR: Datos extraídos de la factura. El formulario se ha pre-llenado.', {
        duration: 5000,
        icon: '🤖',
      });
    }

    // Manifiesto Excel detection
    const manifiestos = archivos.filter(a => a.tipo === 'manifiesto');
    if (manifiestos.length > 0) {
      toast.info('Manifiesto Excel detectado. Usa el Flujo Unificado para procesamiento masivo.', {
        duration: 4000,
      });
    }
  }, [resultadosSniffer]);

  const handleNuevaDeclaracion = useCallback(() => {
    setVista('formulario-manual');
  }, []);

  const handleCargaMasiva = useCallback(() => {
    setVista('carga-masiva');
  }, []);

  const handleSubmitDeclaracion = useCallback((encabezado: any, lineas: any) => {
    toast.success(`Declaración registrada: ${lineas.length} línea(s) de mercancía`, {
      description: `MAWB: ${encabezado.mawb || 'Sin MAWB'} — Consignatario: ${encabezado.consignatario}`,
      duration: 5000,
    });
    setVista('inicio');
    setDatosOCR(undefined);
    setArchivosClasificados([]);
  }, []);

  const handleCancelDeclaracion = useCallback(() => {
    setVista('inicio');
    setDatosOCR(undefined);
  }, []);

  const handleValidarZod = useCallback((expedienteId: string) => {
    const exp = expedientesExternos.find(e => e.id === expedienteId);
    if (!exp) return;

    const resultado = DocumentSniffer.validarConsistenciaCruzada(exp);
    setExpedientesExternos(prev =>
      prev.map(e => e.id === expedienteId ? { ...e, consistenciaCruzada: resultado } : e)
    );

    // Abrir checklist con resultado
    setExpedienteSeleccionado({ ...exp, consistenciaCruzada: resultado });

    if (resultado.consistente) {
      toast.success('Zod Cross-Check: Consistencia verificada ✓', {
        description: resultado.dictamen,
        duration: 6000,
      });
    } else {
      toast.warning('Zod Cross-Check: Discrepancias detectadas', {
        description: resultado.dictamen,
        duration: 8000,
      });
    }
  }, [expedientesExternos]);

  const handleSolicitarCliente = useCallback((expedienteId: string, faltantes: string[]) => {
    toast.success(`Stella: Solicitud generada para ${faltantes.length} documento(s) faltante(s)`, {
      description: 'El correo ha sido copiado al portapapeles.',
      duration: 5000,
      icon: '✉️',
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {vista !== 'inicio' && (
            <Button variant="ghost" size="icon" onClick={() => setVista('inicio')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">
              {vista === 'inicio' && 'Ingesta Universal'}
              {vista === 'formulario-manual' && 'Nueva Declaración Manual'}
              {vista === 'carga-masiva' && 'Carga Masiva'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vista === 'inicio' && 'Arrastra documentos — Sniffer clasifica y Stella audita'}
              {vista === 'formulario-manual' && 'Captura de datos con validación Zod en tiempo real'}
              {vista === 'carga-masiva' && 'Sube manifiestos Excel para procesamiento masivo'}
            </p>
          </div>
        </div>
        {archivosClasificados.length > 0 && vista === 'inicio' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="w-3 h-3" />
              {archivosClasificados.length} archivo(s)
            </Badge>
            {resultadosSniffer.filter(r => r.origen === 'EXTERNO').length > 0 && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                <Radar className="w-3 h-3" />
                {resultadosSniffer.filter(r => r.origen === 'EXTERNO').length} externo(s)
              </Badge>
            )}
            {datosOCR && (
              <Button size="sm" className="gap-1.5 btn-primary" onClick={handleNuevaDeclaracion}>
                <Sparkles className="w-3.5 h-3.5" />
                Abrir con datos OCR
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Vista Inicio */}
      {vista === 'inicio' && (
        <>
          {/* Tabs: Ingesta / Monitor */}
          <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as 'ingesta' | 'monitor')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="ingesta" className="gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Zona de Carga
              </TabsTrigger>
              <TabsTrigger value="monitor" className="gap-2">
                <Radar className="w-3.5 h-3.5" />
                Monitor Externo
                {expedientesExternos.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {expedientesExternos.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab: Zona de Carga */}
            <TabsContent value="ingesta" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <SmartDropZone onFilesClassified={handleFilesClassified} />
                </div>
                <PanelAccionesMaestras
                  onNuevaDeclaracion={handleNuevaDeclaracion}
                  onCargaMasiva={handleCargaMasiva}
                  className="lg:col-span-1"
                />
              </div>
            </TabsContent>

            {/* Tab: Monitor de Carga Externa */}
            <TabsContent value="monitor" className="mt-4">
              <div className={cn(
                'grid gap-6',
                expedienteSeleccionado ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
              )}>
                <div className={expedienteSeleccionado ? 'lg:col-span-2' : ''}>
                  <MonitorCargaExterna
                    expedientes={expedientesExternos}
                    onSeleccionarExpediente={setExpedienteSeleccionado}
                    onValidarZod={handleValidarZod}
                  />
                </div>

                {/* Stella Checklist Sidebar */}
                {expedienteSeleccionado && (
                  <div className="lg:col-span-1">
                    <StellaChecklist
                      expediente={expedienteSeleccionado}
                      onClose={() => setExpedienteSeleccionado(null)}
                      onSolicitarCliente={handleSolicitarCliente}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Vista Formulario Manual */}
      {vista === 'formulario-manual' && (
        <FormularioCapturaManual
          datosOCR={datosOCR}
          onSubmit={handleSubmitDeclaracion}
          onCancel={handleCancelDeclaracion}
        />
      )}

      {/* Vista Carga Masiva */}
      {vista === 'carga-masiva' && (
        <div className="text-center py-12 card-elevated p-8">
          <p className="text-lg text-foreground mb-4">
            Usa el <strong>Flujo Unificado</strong> del selector superior para carga masiva de manifiestos Excel.
          </p>
          <Button variant="outline" onClick={() => setVista('inicio')}>
            Volver a Ingesta Universal
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Utilidades ─────────────────────────────────────────────────

/**
 * Genera contenido textual simulado para el Sniffer
 * basado en el tipo de archivo detectado por la SmartDropZone.
 * En producción, esto sería reemplazado por OCR real (Edge Function).
 */
function generarContenidoSimulado(archivo: ArchivoClasificado): string {
  const nombre = archivo.file.name.toLowerCase();

  if (archivo.tipo === 'factura_comercial' || nombre.includes('invoice')) {
    return `COMMERCIAL INVOICE
Invoice No.: INV-2026-${Math.floor(Math.random() * 9000) + 1000}
Date: ${new Date().toLocaleDateString('en-US')}
Seller/Exporter: Shanghai Electronics Co. Ltd
Consignee/Importer: Importadora del Pacífico S.A.
Country of Origin: China
HS Code: 8534.00.00
Description: Electronic Components - Printed Circuit Boards
Quantity: 50 units
Unit Price: $25.00
Total Amount: USD 1,250.00
FOB: USD 1,250.00
Gross Weight: 15.5 kg
Net Weight: 12.5 kg
Incoterms: FOB Shanghai
Payment Terms: T/T 30 days`;
  }

  if (archivo.tipo === 'documento_transporte' || nombre.includes('bl') || nombre.includes('bol')) {
    return `BILL OF LADING
B/L No.: COSU${Math.floor(Math.random() * 9000000) + 1000000}
Date: ${new Date().toLocaleDateString('en-US')}
Shipper: Shanghai Electronics Co. Ltd
Consignee: Importadora del Pacífico S.A.
Notify Party: Agencia Aduanera ZENITH
Port of Loading: Shanghai, China
Port of Discharge: Balboa, Panama
Vessel: MSC GÜLSÜN
Voyage: 023E
Container: MSCU1234567
Seal: CN789456
Gross Weight: 15.8 kg
Description: Electronic Components
Freight Prepaid`;
  }

  if (nombre.includes('packing')) {
    return `PACKING LIST
Packing List No.: PL-2026-001
Date: ${new Date().toLocaleDateString('en-US')}
Shipper: Shanghai Electronics Co. Ltd
Consignee: Importadora del Pacífico S.A.
Number of Packages: 2 cartons
Gross Weight: 15.5 kg
Net Weight: 12.5 kg
Dimensions: 60x40x30 cm
Marks and Numbers: N/M`;
  }

  // Default — documento genérico externo
  return `Document: ${archivo.file.name}
Date: ${new Date().toLocaleDateString('en-US')}
Reference: ${Math.random().toString(36).substring(2, 10).toUpperCase()}
Content type: General document
No Orion reference found.`;
}
