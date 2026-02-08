/**
 * INGESTA UNIVERSAL DASHBOARD — ZENITH
 * 
 * Componente principal que orquesta:
 * 1. Smart Drop Zone (clasificación automática)
 * 2. Panel de Acciones Maestras (sidebar)
 * 3. Formulario de Captura Manual (con Zod)
 * 4. Integración OCR (auto-fill desde documentos)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { SmartDropZone, type ArchivoClasificado } from './SmartDropZone';
import { PanelAccionesMaestras } from './PanelAccionesMaestras';
import { FormularioCapturaManual } from './FormularioCapturaManual';

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
  const navigate = useNavigate();
  const [vista, setVista] = useState<VistaActual>('inicio');
  const [archivosClasificados, setArchivosClasificados] = useState<ArchivoClasificado[]>([]);
  const [datosOCR, setDatosOCR] = useState<DatosOCR | undefined>();

  // Cuando Stella clasifica archivos, simular OCR si hay factura
  const handleFilesClassified = useCallback((archivos: ArchivoClasificado[]) => {
    setArchivosClasificados(archivos);

    // Si hay una factura comercial, simular extracción OCR
    const facturas = archivos.filter(a => a.tipo === 'factura_comercial' && a.confianza >= 60);
    if (facturas.length > 0) {
      // Simular datos extraídos por OCR (en producción usaría Edge Function extract-invoice-data)
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

    // Si hay un manifiesto Excel, redirigir al flujo unificado
    const manifiestos = archivos.filter(a => a.tipo === 'manifiesto');
    if (manifiestos.length > 0) {
      toast.info('Manifiesto Excel detectado. Usa el Flujo Unificado para procesamiento masivo.', {
        duration: 4000,
      });
    }
  }, []);

  const handleNuevaDeclaracion = useCallback(() => {
    setVista('formulario-manual');
  }, []);

  const handleCargaMasiva = useCallback(() => {
    // Cambiar al flujo unificado (ya existente en la página)
    setVista('carga-masiva');
  }, []);

  const handleSubmitDeclaracion = useCallback((encabezado: any, lineas: any) => {
    toast.success(`Declaración registrada: ${lineas.length} línea(s) de mercancía`, {
      description: `MAWB: ${encabezado.mawb || 'Sin MAWB'} — Consignatario: ${encabezado.consignatario}`,
      duration: 5000,
    });
    // Reset
    setVista('inicio');
    setDatosOCR(undefined);
    setArchivosClasificados([]);
  }, []);

  const handleCancelDeclaracion = useCallback(() => {
    setVista('inicio');
    setDatosOCR(undefined);
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
              {vista === 'inicio' && 'Arrastra documentos para clasificación automática por Stella'}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Smart Drop Zone - Área principal */}
          <div className="lg:col-span-3">
            <SmartDropZone onFilesClassified={handleFilesClassified} />
          </div>

          {/* Panel de Acciones Maestras - Sidebar */}
          <PanelAccionesMaestras
            onNuevaDeclaracion={handleNuevaDeclaracion}
            onCargaMasiva={handleCargaMasiva}
            className="lg:col-span-1"
          />
        </div>
      )}

      {/* Vista Formulario Manual */}
      {vista === 'formulario-manual' && (
        <FormularioCapturaManual
          datosOCR={datosOCR}
          onSubmit={handleSubmitDeclaracion}
          onCancel={handleCancelDeclaracion}
        />
      )}

      {/* Vista Carga Masiva — Indicador para usar flujo unificado existente */}
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
