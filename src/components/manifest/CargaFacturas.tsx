// ============================================
// COMPONENTE DE CARGA DE FACTURAS COMERCIALES
// Asocia facturas PDF a paquetes que requieren liquidación
// Extrae datos del contenido del PDF (AWB, valores, descripciones)
// ============================================

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Package,
  Eye,
  DollarSign
} from 'lucide-react';
import { Liquidacion } from '@/types/aduanas';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DatosFactura {
  awbs: string[];
  valores: { valor: number; moneda: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  textoCompleto: string;
}

interface FacturaAsociada {
  id: string;
  nombreArchivo: string;
  awbExtraidos: string[];
  archivo: File;
  fechaCarga: Date;
  estado: 'pendiente' | 'validada' | 'error';
  errores: string[];
  awbsCoincidentes: string[];
  awbsFaltantes: string[];
  datosExtraidos: DatosFactura | null;
}

interface ValidacionResultado {
  totalFacturas: number;
  facturasValidas: number;
  facturasConErrores: number;
  awbsEncontrados: number;
  awbsFaltantes: string[];
  awbsSinFactura: string[];
}

interface CargaFacturasProps {
  liquidacionesPendientes: Liquidacion[];
  onFacturasAsociadas?: (facturas: FacturaAsociada[]) => void;
}

export function CargaFacturas({ 
  liquidacionesPendientes,
  onFacturasAsociadas 
}: CargaFacturasProps) {
  const [facturas, setFacturas] = useState<FacturaAsociada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [validacion, setValidacion] = useState<ValidacionResultado | null>(null);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaAsociada | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AWBs que requieren factura (categoría D - alto valor)
  const awbsRequeridosSet = new Set(
    liquidacionesPendientes
      .filter(l => l.categoriaAduanera === 'D' || l.valorCIF > 100)
      .map(l => l.numeroGuia.toUpperCase().trim())
  );
  const awbsRequeridos = Array.from(awbsRequeridosSet);

  // Extraer texto completo del PDF
  const extraerTextoPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const contenido = await pagina.getTextContent();
        const textoPagina = contenido.items
          .map((item: any) => item.str)
          .join(' ');
        textoCompleto += textoPagina + '\n';
      }
      
      return textoCompleto;
    } catch (error) {
      console.error('Error al extraer texto del PDF:', error);
      return '';
    }
  };

  // Extraer datos estructurados del texto del PDF
  const extraerDatosDeTexto = (texto: string): DatosFactura => {
    const textoUpper = texto.toUpperCase();
    
    // Patrones para AWBs
    const patronesAWB = [
      /\b\d{3}[-\s]?\d{8}\b/g,          // 123-45678901
      /\bAWB\s*[:#]?\s*\d{9,12}\b/gi,    // AWB: 123456789
      /\b[A-Z]{2,3}\d{8,12}\b/g,         // AA12345678
      /\bGU[IÍ]A\s*[:#]?\s*\d{9,14}\b/gi, // GUÍA: 123456789
      /\bTRACKING\s*[:#]?\s*\d{9,14}\b/gi, // TRACKING: 123456789
      /\b\d{10,14}\b/g                    // Números largos
    ];
    
    const awbs: string[] = [];
    for (const patron of patronesAWB) {
      const matches = texto.match(patron);
      if (matches) {
        awbs.push(...matches.map(m => 
          m.replace(/[-\s:#]/g, '')
           .replace(/^(AWB|GUIA|GUÍA|TRACKING)/i, '')
           .toUpperCase()
           .trim()
        ).filter(m => m.length >= 9 && m.length <= 14));
      }
    }
    
    // Patrones para valores monetarios
    const patronesValor = [
      /\$\s*([\d,]+\.?\d{0,2})\s*(USD|US)?/gi,
      /USD\s*([\d,]+\.?\d{0,2})/gi,
      /TOTAL\s*[:#]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
      /VALOR\s*[:#]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
      /AMOUNT\s*[:#]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
      /VALUE\s*[:#]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
      /([\d,]+\.?\d{0,2})\s*USD/gi
    ];
    
    const valores: { valor: number; moneda: string }[] = [];
    for (const patron of patronesValor) {
      let match;
      while ((match = patron.exec(texto)) !== null) {
        const valorStr = match[1].replace(/,/g, '');
        const valor = parseFloat(valorStr);
        if (!isNaN(valor) && valor > 0 && valor < 1000000) {
          valores.push({ valor, moneda: 'USD' });
        }
      }
    }
    
    // Patrones para descripciones de productos
    const descripciones: string[] = [];
    const patronesDescripcion = [
      /DESCRIPTION\s*[:#]?\s*([^\n]+)/gi,
      /DESCRIPCI[OÓ]N\s*[:#]?\s*([^\n]+)/gi,
      /CONTENIDO\s*[:#]?\s*([^\n]+)/gi,
      /PRODUCTO\s*[:#]?\s*([^\n]+)/gi,
      /ITEM\s*[:#]?\s*([^\n]+)/gi,
      /GOODS\s*[:#]?\s*([^\n]+)/gi,
      /MERCHANDISE\s*[:#]?\s*([^\n]+)/gi
    ];
    
    for (const patron of patronesDescripcion) {
      let match;
      while ((match = patron.exec(texto)) !== null) {
        const desc = match[1].trim();
        if (desc.length > 3 && desc.length < 200) {
          descripciones.push(desc);
        }
      }
    }
    
    // Patrones para proveedores/remitentes
    const proveedores: string[] = [];
    const patronesProveedor = [
      /SHIPPER\s*[:#]?\s*([^\n]+)/gi,
      /REMITENTE\s*[:#]?\s*([^\n]+)/gi,
      /SENDER\s*[:#]?\s*([^\n]+)/gi,
      /VENDOR\s*[:#]?\s*([^\n]+)/gi,
      /FROM\s*[:#]?\s*([^\n]+)/gi,
      /PROVEEDOR\s*[:#]?\s*([^\n]+)/gi
    ];
    
    for (const patron of patronesProveedor) {
      let match;
      while ((match = patron.exec(texto)) !== null) {
        const prov = match[1].trim();
        if (prov.length > 2 && prov.length < 100) {
          proveedores.push(prov);
        }
      }
    }
    
    // Patrones para fechas
    const fechas: string[] = [];
    const patronesFecha = [
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
      /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
      /DATE\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi
    ];
    
    for (const patron of patronesFecha) {
      const matches = texto.match(patron);
      if (matches) {
        fechas.push(...matches.slice(0, 5));
      }
    }
    
    return {
      awbs: [...new Set(awbs)],
      valores: valores.slice(0, 10),
      descripciones: [...new Set(descripciones)].slice(0, 10),
      proveedores: [...new Set(proveedores)].slice(0, 5),
      fechas: [...new Set(fechas)].slice(0, 5),
      textoCompleto: texto.substring(0, 2000)
    };
  };

  // Validar facturas contra liquidaciones
  const validarFacturas = useCallback((facturasActuales: FacturaAsociada[]) => {
    const awbsEnFacturas = new Set<string>();
    
    const facturasValidadas = facturasActuales.map(factura => {
      const awbsCoincidentes: string[] = [];
      const errores: string[] = [];
      
      // Buscar coincidencias
      for (const awb of factura.awbExtraidos) {
        const normalizado = awb.toUpperCase().trim();
        // Buscar coincidencia parcial también
        for (const awbRequerido of awbsRequeridos) {
          if (awbRequerido.includes(normalizado) || normalizado.includes(awbRequerido)) {
            awbsCoincidentes.push(awbRequerido);
            awbsEnFacturas.add(awbRequerido);
          }
        }
      }
      
      // Verificar si se encontró al menos un AWB válido
      if (awbsCoincidentes.length === 0) {
        errores.push('No se encontró ningún AWB que coincida con los paquetes pendientes');
      }
      
      // Verificar si hay valores extraídos
      if (!factura.datosExtraidos?.valores?.length) {
        errores.push('No se detectaron valores monetarios en la factura');
      }
      
      return {
        ...factura,
        awbsCoincidentes: [...new Set(awbsCoincidentes)],
        errores,
        estado: errores.length === 0 ? 'validada' as const : 'error' as const
      };
    });
    
    // AWBs que no tienen factura asociada
    const awbsSinFactura = awbsRequeridos.filter(awb => !awbsEnFacturas.has(awb));
    
    const resultado: ValidacionResultado = {
      totalFacturas: facturasValidadas.length,
      facturasValidas: facturasValidadas.filter(f => f.estado === 'validada').length,
      facturasConErrores: facturasValidadas.filter(f => f.estado === 'error').length,
      awbsEncontrados: awbsEnFacturas.size,
      awbsFaltantes: [],
      awbsSinFactura
    };
    
    setFacturas(facturasValidadas);
    setValidacion(resultado);
    onFacturasAsociadas?.(facturasValidadas.filter(f => f.estado === 'validada'));
    
    return resultado;
  }, [awbsRequeridos, onFacturasAsociadas]);

  // Manejar carga de archivos
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setCargando(true);
    setProgreso(0);
    
    try {
      const nuevasFacturas: FacturaAsociada[] = [];
      const totalArchivos = files.length;
      
      for (let i = 0; i < totalArchivos; i++) {
        const file = files[i];
        setProgreso(Math.round(((i) / totalArchivos) * 100));
        
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} no es un archivo PDF válido`);
          continue;
        }
        
        // Extraer texto del contenido del PDF
        const textoPDF = await extraerTextoPDF(file);
        
        if (!textoPDF || textoPDF.trim().length === 0) {
          toast.warning(`${file.name}: No se pudo extraer texto del PDF`);
        }
        
        // Extraer datos estructurados
        const datosExtraidos = extraerDatosDeTexto(textoPDF);
        
        // Combinar AWBs del nombre y del contenido
        const awbsDelNombre = extraerAWBsDeNombre(file.name);
        const todosAWBs = [...new Set([...awbsDelNombre, ...datosExtraidos.awbs])];
        
        nuevasFacturas.push({
          id: `factura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nombreArchivo: file.name,
          awbExtraidos: todosAWBs,
          archivo: file,
          fechaCarga: new Date(),
          estado: 'pendiente',
          errores: [],
          awbsCoincidentes: [],
          awbsFaltantes: [],
          datosExtraidos
        });
        
        setProgreso(Math.round(((i + 1) / totalArchivos) * 100));
      }
      
      const todasFacturas = [...facturas, ...nuevasFacturas];
      const resultado = validarFacturas(todasFacturas);
      
      if (resultado.facturasValidas > 0) {
        toast.success(`${resultado.facturasValidas} factura(s) validada(s) correctamente`);
      }
      if (resultado.facturasConErrores > 0) {
        toast.warning(`${resultado.facturasConErrores} factura(s) con problemas de validación`);
      }
      
    } catch (error) {
      console.error('Error al procesar facturas:', error);
      toast.error('Error al procesar las facturas');
    } finally {
      setCargando(false);
      setProgreso(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // Extraer AWBs del nombre del archivo PDF
  const extraerAWBsDeNombre = (nombreArchivo: string): string[] => {
    const nombre = nombreArchivo.toUpperCase();
    const patrones = [
      /\b\d{3}[-\s]?\d{8}\b/g,
      /\bAWB\s*\d{9,12}\b/gi,
      /\b[A-Z]{2,3}\d{8,12}\b/g,
      /\b\d{10,14}\b/g
    ];
    
    const encontrados: string[] = [];
    for (const patron of patrones) {
      const matches = nombre.match(patron);
      if (matches) {
        encontrados.push(...matches.map(m => m.replace(/[-\s]/g, '').toUpperCase()));
      }
    }
    return [...new Set(encontrados)];
  };

  // Eliminar factura
  const eliminarFactura = (id: string) => {
    const nuevasFacturas = facturas.filter(f => f.id !== id);
    setFacturas(nuevasFacturas);
    if (nuevasFacturas.length > 0) {
      validarFacturas(nuevasFacturas);
    } else {
      setValidacion(null);
    }
  };

  // Si no hay liquidaciones pendientes que requieran factura
  if (awbsRequeridos.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <FileText className="w-5 h-5" />
            Facturas Comerciales Requeridas
            <Badge variant="secondary" className="ml-2">
              {awbsRequeridos.length} paquetes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instrucciones */}
          <Alert>
            <Package className="w-4 h-4" />
            <AlertTitle>Paquetes que requieren factura</AlertTitle>
            <AlertDescription>
              Se requieren facturas comerciales para {awbsRequeridos.length} paquete(s) 
              con valor superior a $100 USD. El sistema extraerá automáticamente AWBs, 
              valores y descripciones del contenido del PDF.
            </AlertDescription>
          </Alert>

          {/* Botón de carga */}
          <div className="flex items-center gap-4">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="factura-upload"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={cargando}
              className="gap-2"
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Cargar Facturas en PDF
            </Button>
            
            {cargando && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{progreso}%</span>
              </div>
            )}
            
            {!cargando && facturas.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {facturas.length} archivo(s) cargado(s)
              </span>
            )}
          </div>

          {/* Alertas de validación */}
          {validacion && validacion.awbsSinFactura.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Facturas faltantes</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Los siguientes {validacion.awbsSinFactura.length} AWB(s) no tienen factura asociada:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {validacion.awbsSinFactura.slice(0, 10).map(awb => (
                    <Badge key={awb} variant="outline" className="font-mono text-xs">
                      {awb}
                    </Badge>
                  ))}
                  {validacion.awbsSinFactura.length > 10 && (
                    <Badge variant="secondary">
                      +{validacion.awbsSinFactura.length - 10} más
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabla de facturas cargadas */}
          {facturas.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>AWBs Detectados</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500" />
                          <span className="truncate max-w-[180px]" title={factura.nombreArchivo}>
                            {factura.nombreArchivo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {factura.awbsCoincidentes.length > 0 ? (
                            factura.awbsCoincidentes.slice(0, 3).map(awb => (
                              <Badge key={awb} variant="default" className="font-mono text-xs">
                                {awb}
                              </Badge>
                            ))
                          ) : factura.awbExtraidos.length > 0 ? (
                            <span className="text-sm text-amber-600">
                              {factura.awbExtraidos.length} AWB(s) sin coincidir
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sin AWBs
                            </span>
                          )}
                          {factura.awbsCoincidentes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{factura.awbsCoincidentes.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {factura.datosExtraidos?.valores && factura.datosExtraidos.valores.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <span className="text-sm font-medium">
                              ${factura.datosExtraidos.valores[0].valor.toFixed(2)}
                            </span>
                            {factura.datosExtraidos.valores.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{factura.datosExtraidos.valores.length - 1}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {factura.estado === 'validada' ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Validada
                          </Badge>
                        ) : factura.estado === 'error' ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Procesando
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFacturaDetalle(factura)}
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarFactura(factura.id)}
                            className="text-destructive hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Resumen de validación */}
          {validacion && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {validacion.facturasValidas}
                </p>
                <p className="text-sm text-muted-foreground">Facturas válidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {validacion.awbsEncontrados}
                </p>
                <p className="text-sm text-muted-foreground">AWBs asociados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {validacion.awbsSinFactura.length}
                </p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles de factura */}
      <Dialog open={!!facturaDetalle} onOpenChange={() => setFacturaDetalle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles de Factura
            </DialogTitle>
          </DialogHeader>
          
          {facturaDetalle && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Archivo</p>
                <p className="font-mono">{facturaDetalle.nombreArchivo}</p>
              </div>
              
              {/* AWBs */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">AWBs Detectados</p>
                <div className="flex flex-wrap gap-2">
                  {facturaDetalle.awbExtraidos.length > 0 ? (
                    facturaDetalle.awbExtraidos.map((awb, i) => (
                      <Badge 
                        key={i} 
                        variant={facturaDetalle.awbsCoincidentes.includes(awb) ? "default" : "outline"}
                        className="font-mono"
                      >
                        {awb}
                        {facturaDetalle.awbsCoincidentes.includes(awb) && (
                          <CheckCircle className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No se detectaron AWBs</span>
                  )}
                </div>
              </div>
              
              {/* Valores */}
              {facturaDetalle.datosExtraidos?.valores && facturaDetalle.datosExtraidos.valores.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Valores Detectados</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.datosExtraidos.valores.map((v, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">
                        ${v.valor.toFixed(2)} {v.moneda}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Descripciones */}
              {facturaDetalle.datosExtraidos?.descripciones && facturaDetalle.datosExtraidos.descripciones.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descripciones de Productos</p>
                  <ul className="list-disc list-inside space-y-1">
                    {facturaDetalle.datosExtraidos.descripciones.map((desc, i) => (
                      <li key={i} className="text-sm">{desc}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Proveedores */}
              {facturaDetalle.datosExtraidos?.proveedores && facturaDetalle.datosExtraidos.proveedores.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Proveedores/Remitentes</p>
                  <div className="flex flex-wrap gap-2">
                    {facturaDetalle.datosExtraidos.proveedores.map((prov, i) => (
                      <Badge key={i} variant="outline">{prov}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Errores */}
              {facturaDetalle.errores.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>Errores de validación</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {facturaDetalle.errores.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
