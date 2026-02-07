// ============================================
// MOTOR DE FILTRO SANITARIO MINSA
// Dirección Nacional de Farmacia y Drogas
// MEJORA: Clasificación basada en HTS + contexto
// ============================================

import { ManifestRow } from '@/types/manifest';
import {
  EstadoMINSA,
  TipoImportacion,
  ResultadoFiltroSanitario,
  DocumentoRequerido,
  AlertaSanitaria,
  ConfiguracionFiltro,
  KEYWORDS_MINSA_ALTA_CONFIANZA,
  KEYWORDS_MINSA_CONTEXTO,
  EXCLUSIONES_FARMA,
  HTS_FARMACEUTICOS,
  KEYWORDS_RECETA_OBLIGATORIA,
  KEYWORDS_PROHIBIDOS,
  INDICADORES_CANTIDAD_COMERCIAL,
  CONFIG_DEFAULT
} from './tiposFiltro';

/**
 * Motor principal del filtro sanitario
 * Analiza paquetes y determina requisitos MINSA
 */
export class MotorFiltroSanitario {
  private config: ConfiguracionFiltro;

  constructor(config: Partial<ConfiguracionFiltro> = {}) {
    this.config = { ...CONFIG_DEFAULT, ...config };
  }

  /**
   * Analiza un paquete individual
   */
  analizarPaquete(
    paquete: ManifestRow,
    tipoImportacion: TipoImportacion = 'B2C'
  ): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    
    // 1. Detectar keywords MINSA
    const keywordsDetectadas = this.detectarKeywords(descripcion);
    const requiresMinsaCheck = keywordsDetectadas.length > 0;

    // 2. Verificar lista negra (AUTO-REJECT)
    const esProhibido = this.verificarListaNegra(descripcion);
    
    if (esProhibido) {
      return this.crearResultadoProhibido(paquete, keywordsDetectadas);
    }

    // 3. Si no requiere verificación MINSA, aprobar
    if (!requiresMinsaCheck) {
      return this.crearResultadoAprobado(paquete);
    }

    // 4. Evaluar intención (personal vs comercial)
    const cantidadSospechosa = this.detectarCantidadComercial(descripcion);
    
    if (tipoImportacion === 'B2B' || cantidadSospechosa) {
      return this.crearResultadoComercial(paquete, keywordsDetectadas, cantidadSospechosa);
    }

    // 5. Importación personal - determinar documentos requeridos
    return this.crearResultadoPersonal(paquete, keywordsDetectadas, descripcion);
  }

  /**
   * Analiza múltiples paquetes
   */
  analizarManifiesto(
    paquetes: ManifestRow[],
    tipoImportacion: TipoImportacion = 'B2C'
  ): ResultadoFiltroSanitario[] {
    return paquetes.map(p => this.analizarPaquete(p, tipoImportacion));
  }

  /**
   * Obtiene resumen del análisis
   */
  obtenerResumen(resultados: ResultadoFiltroSanitario[]): ResumenFiltroSanitario {
    const total = resultados.length;
    const aprobados = resultados.filter(r => r.estado === 'CLEARED').length;
    const requierenDocumentos = resultados.filter(r => 
      r.estado === 'DOCUMENTS_REQUIRED' || r.estado === 'PERSONAL_USE'
    ).length;
    const detenidosComercial = resultados.filter(r => r.estado === 'COMMERCIAL_HOLD').length;
    const prohibidos = resultados.filter(r => r.estado === 'PROHIBITED_GOODS').length;
    const requierenAccion = resultados.filter(r => r.requiereAccion).length;

    // Agrupar keywords detectadas
    const keywordsConteo: Record<string, number> = {};
    resultados.forEach(r => {
      r.keywordsDetectadas.forEach(k => {
        keywordsConteo[k] = (keywordsConteo[k] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(keywordsConteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total,
      aprobados,
      requierenDocumentos,
      detenidosComercial,
      prohibidos,
      requierenAccion,
      topKeywords,
      porcentajeAprobado: total > 0 ? (aprobados / total) * 100 : 0,
      porcentajeProhibido: total > 0 ? (prohibidos / total) * 100 : 0
    };
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Verifica si una keyword aparece como palabra completa (word boundary)
   * Evita falsos positivos como "glasses" matcheando "gel"
   */
  private matchPalabraCompleta(descripcion: string, keyword: string): boolean {
    // Crear regex con word boundaries para evitar matches parciales
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
    return regex.test(descripcion);
  }

  /**
   * MEJORA: Verificar si la descripción está excluida de clasificación farmacéutica
   */
  private esExcluido(descripcion: string): boolean {
    const descLower = descripcion.toLowerCase();
    for (const exclusion of EXCLUSIONES_FARMA) {
      if (descLower.includes(exclusion.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * MEJORA: Verificar si el código HTS indica farmacéutico (Capítulo 30)
   */
  private esHTSFarmaceutico(hsCode?: string): boolean {
    if (!hsCode) return false;
    const codigo = hsCode.replace(/\./g, '').substring(0, 4);
    return HTS_FARMACEUTICOS.some(hts => codigo.startsWith(hts));
  }

  /**
   * MEJORA: Detección mejorada de keywords farmacéuticas
   * Usa alta confianza + contexto + exclusiones
   */
  private detectarKeywords(descripcion: string): string[] {
    // Si está excluido, no detectar keywords
    if (this.esExcluido(descripcion)) {
      return [];
    }

    const encontradas: string[] = [];
    
    // 1. Buscar keywords de alta confianza (siempre válidas)
    for (const keyword of KEYWORDS_MINSA_ALTA_CONFIANZA) {
      if (this.matchPalabraCompleta(descripcion, keyword)) {
        encontradas.push(keyword);
      }
    }
    
    // 2. Solo si encontramos alta confianza, buscar contexto adicional
    if (encontradas.length > 0) {
      for (const keyword of KEYWORDS_MINSA_CONTEXTO) {
        if (this.matchPalabraCompleta(descripcion, keyword)) {
          encontradas.push(keyword);
        }
      }
    }
    
    return [...new Set(encontradas)];
  }

  private verificarListaNegra(descripcion: string): boolean {
    for (const keyword of KEYWORDS_PROHIBIDOS) {
      if (this.matchPalabraCompleta(descripcion, keyword)) {
        return true;
      }
    }
    return false;
  }

  private detectarCantidadComercial(descripcion: string): boolean {
    for (const patron of INDICADORES_CANTIDAD_COMERCIAL) {
      const match = descripcion.match(patron);
      if (match) {
        // Verificar si la cantidad excede límites personales
        const cantidad = parseInt(match[1] || '0');
        if (cantidad >= this.config.limiteUnidadesPersonal) {
          return true;
        }
      }
    }
    return false;
  }

  private requiereRecetaMedica(descripcion: string): boolean {
    for (const keyword of KEYWORDS_RECETA_OBLIGATORIA) {
      if (descripcion.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private crearDocumentosRequeridos(descripcion: string, esComercial: boolean): DocumentoRequerido[] {
    const documentos: DocumentoRequerido[] = [];

    if (esComercial) {
      // B2B - Requiere registro sanitario y licencia
      documentos.push({
        id: 'registro_sanitario',
        tipo: 'registro_sanitario',
        nombre: 'Registro Sanitario',
        descripcion: 'Documento de Registro Sanitario emitido por MINSA',
        obligatorio: true,
        subido: false
      });
      documentos.push({
        id: 'licencia_importacion',
        tipo: 'licencia_importacion',
        nombre: 'Licencia de Importación Farmacia y Drogas',
        descripcion: 'Licencia vigente para importación de productos farmacéuticos',
        obligatorio: true,
        subido: false
      });
      
      // Feb 2026: F-05-BE-PF-DRS para productos Capítulo 30 que requieran bioequivalencia
      if (this.requiereBioequivalencia(descripcion)) {
        documentos.push({
          id: 'bioequivalencia_f05',
          tipo: 'bioequivalencia_f05',
          nombre: 'Formulario F-05-BE-PF-DRS (Bioequivalencia)',
          descripcion: 'Formulario de bioequivalencia MINSA obligatorio para productos del Capítulo 30 que requieran demostración de equivalencia terapéutica',
          obligatorio: true,
          subido: false
        });
      }
    } else {
      // B2C - Uso personal
      if (this.requiereRecetaMedica(descripcion)) {
        documentos.push({
          id: 'receta_medica',
          tipo: 'receta_medica',
          nombre: 'Receta Médica',
          descripcion: 'Receta médica válida que justifique el uso del medicamento',
          obligatorio: true,
          subido: false
        });
      }

      documentos.push({
        id: 'carta_relevo',
        tipo: 'carta_relevo',
        nombre: 'Carta de Relevo',
        descripcion: 'Declaración de uso personal (generar automáticamente)',
        obligatorio: true,
        subido: false
      });

      documentos.push({
        id: 'identificacion',
        tipo: 'identificacion',
        nombre: 'Documento de Identidad',
        descripcion: 'Cédula de identidad o pasaporte del consignatario',
        obligatorio: true,
        subido: false
      });
    }

    return documentos;
  }

  /**
   * Feb 2026: Determina si un producto del Capítulo 30 requiere formulario F-05-BE-PF-DRS
   * Aplica a medicamentos genéricos y similares que requieran demostración de bioequivalencia
   */
  private requiereBioequivalencia(descripcion: string): boolean {
    const indicadoresBioequivalencia = [
      'generic', 'genérico', 'generico', 'similar', 'bioequivalent',
      'bioequivalente', 'equivalente terapéutico', 'therapeutic equivalent',
      'multisource', 'copia', 'copy drug'
    ];
    return indicadoresBioequivalencia.some(ind => descripcion.includes(ind));
  }

  private crearAlertas(estado: EstadoMINSA, keywordsDetectadas: string[], descripcion: string): AlertaSanitaria[] {
    const alertas: AlertaSanitaria[] = [];

    if (estado === 'PROHIBITED_GOODS') {
      const keywordProhibida = KEYWORDS_PROHIBIDOS.find(k => descripcion.includes(k.toLowerCase()));
      alertas.push({
        id: 'alert_prohibited',
        tipo: 'critical',
        titulo: '⛔ PRODUCTO PROHIBIDO',
        mensaje: `Se detectó sustancia prohibida: "${keywordProhibida}". Este producto NO puede ingresar al país.`,
        accionRequerida: 'Rechazar entrada. No permitir liquidación.'
      });
    }

    if (estado === 'COMMERCIAL_HOLD') {
      alertas.push({
        id: 'alert_commercial',
        tipo: 'error',
        titulo: '🚨 POSIBLE CARGA COMERCIAL',
        mensaje: 'La cantidad detectada sugiere uso comercial. Se requiere Registro Sanitario para proceder.',
        accionRequerida: 'Solicitar Registro Sanitario y Licencia de Importación.'
      });
    }

    if (this.requiereRecetaMedica(descripcion)) {
      alertas.push({
        id: 'alert_prescription',
        tipo: 'warning',
        titulo: '💊 MEDICAMENTO CONTROLADO',
        mensaje: 'Este producto requiere receta médica obligatoria para su importación.',
        accionRequerida: 'Solicitar receta médica válida.'
      });
    }

    // Feb 2026: Alerta F-05-BE-PF-DRS para bioequivalencia
    if (this.requiereBioequivalencia(descripcion)) {
      alertas.push({
        id: 'alert_bioequivalencia',
        tipo: 'warning',
        titulo: '📋 BIOEQUIVALENCIA REQUERIDA (F-05-BE-PF-DRS)',
        mensaje: 'Producto del Capítulo 30 requiere formulario F-05-BE-PF-DRS de bioequivalencia según normativa MINSA vigente.',
        accionRequerida: 'Adjuntar formulario F-05-BE-PF-DRS completado y aprobado por MINSA.'
      });
    }

    // Feb 2026: Alerta MIDA ARP (Análisis de Riesgo de Plagas) - 30 días previos
    if (this.requiereARPMida(descripcion)) {
      alertas.push({
        id: 'alert_arp_mida',
        tipo: 'error',
        titulo: '🌿 ARP MIDA OBLIGATORIO - 30 DÍAS PREVIOS',
        mensaje: 'Esta mercancía requiere Análisis de Riesgo de Plagas (ARP) del MIDA. La solicitud debe presentarse con mínimo 30 días de anticipación a la importación.',
        accionRequerida: 'Verificar que el ARP fue solicitado al MIDA con al menos 30 días de antelación. Sin ARP aprobado, la mercancía NO puede ser liberada.'
      });
    }

    if (keywordsDetectadas.length > 0 && estado === 'PERSONAL_USE') {
      alertas.push({
        id: 'alert_documents',
        tipo: 'info',
        titulo: '📋 DOCUMENTOS REQUERIDOS',
        mensaje: `Productos detectados: ${keywordsDetectadas.slice(0, 3).join(', ')}. Se requieren documentos habilitantes.`,
        accionRequerida: 'Subir documentos antes de proceder con la liquidación.'
      });
    }

    return alertas;
  }

  /**
   * Feb 2026: Detecta si la mercancía requiere ARP (Análisis de Riesgo de Plagas) del MIDA
   * Aplica a productos vegetales, semillas, plantas vivas, madera, suelo, etc.
   */
  private requiereARPMida(descripcion: string): boolean {
    const indicadoresARP = [
      'seed', 'semilla', 'plant', 'planta', 'live plant', 'planta viva',
      'wood', 'madera', 'lumber', 'timber', 'soil', 'tierra', 'suelo',
      'fruit tree', 'arbol frutal', 'seedling', 'plantón', 'cutting', 'esqueje',
      'grain', 'grano', 'cereal', 'legume', 'leguminosa',
      'organic matter', 'materia orgánica', 'compost', 'fertilizer', 'fertilizante',
      'hay', 'heno', 'straw', 'paja'
    ];
    return indicadoresARP.some(ind => descripcion.includes(ind));
  }

  private crearResultadoAprobado(paquete: ManifestRow): ResultadoFiltroSanitario {
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'CLEARED',
      tipoImportacion: 'B2C',
      keywordsDetectadas: [],
      cantidadSospechosa: false,
      esProhibido: false,
      documentosRequeridos: [],
      alertas: [],
      fechaAnalisis: new Date(),
      requiereAccion: false,
      puedeProcesoLiquidacion: true
    };
  }

  private crearResultadoProhibido(paquete: ManifestRow, keywords: string[]): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'PROHIBITED_GOODS',
      tipoImportacion: 'B2C',
      keywordsDetectadas: keywords,
      cantidadSospechosa: false,
      esProhibido: true,
      documentosRequeridos: [],
      alertas: this.crearAlertas('PROHIBITED_GOODS', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }

  private crearResultadoComercial(
    paquete: ManifestRow, 
    keywords: string[], 
    cantidadSospechosa: boolean
  ): ResultadoFiltroSanitario {
    const descripcion = paquete.description?.toLowerCase() || '';
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'COMMERCIAL_HOLD',
      tipoImportacion: 'B2B',
      keywordsDetectadas: keywords,
      cantidadSospechosa,
      esProhibido: false,
      documentosRequeridos: this.crearDocumentosRequeridos(descripcion, true),
      alertas: this.crearAlertas('COMMERCIAL_HOLD', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }

  private crearResultadoPersonal(
    paquete: ManifestRow, 
    keywords: string[],
    descripcion: string
  ): ResultadoFiltroSanitario {
    const documentos = this.crearDocumentosRequeridos(descripcion, false);
    
    return {
      paqueteId: paquete.id,
      trackingNumber: paquete.trackingNumber,
      descripcion: paquete.description,
      estado: 'DOCUMENTS_REQUIRED',
      tipoImportacion: 'B2C',
      keywordsDetectadas: keywords,
      cantidadSospechosa: false,
      esProhibido: false,
      documentosRequeridos: documentos,
      alertas: this.crearAlertas('PERSONAL_USE', keywords, descripcion),
      fechaAnalisis: new Date(),
      requiereAccion: true,
      puedeProcesoLiquidacion: false
    };
  }
}

export interface ResumenFiltroSanitario {
  total: number;
  aprobados: number;
  requierenDocumentos: number;
  detenidosComercial: number;
  prohibidos: number;
  requierenAccion: number;
  topKeywords: [string, number][];
  porcentajeAprobado: number;
  porcentajeProhibido: number;
}

// Singleton para uso global
let instanciaMotor: MotorFiltroSanitario | null = null;

export function getMotorFiltroSanitario(config?: Partial<ConfiguracionFiltro>): MotorFiltroSanitario {
  if (!instanciaMotor || config) {
    instanciaMotor = new MotorFiltroSanitario(config);
  }
  return instanciaMotor;
}
