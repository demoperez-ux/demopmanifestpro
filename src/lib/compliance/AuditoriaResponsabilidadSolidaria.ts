/**
 * AUDITORÍA DE RESPONSABILIDAD SOLIDARIA — Zod Integrity Engine
 * 
 * Protección de la licencia del corredor de aduanas
 * Detección de fraudes, errores de valor y inconsistencias documentales
 * 
 * Base legal: Ley 30 de 1984, Art. 12, 15, 22
 * Decreto Ley 1 de 2008, Art. 205
 */

import CryptoJS from 'crypto-js';

// ============ TIPOS ============

export type TipoRiesgoLegal =
  | 'subvaluacion'
  | 'fraccionamiento'
  | 'descripcion_generica'
  | 'clasificacion_erronea'
  | 'documento_faltante'
  | 'peso_discrepante'
  | 'consignatario_fantasma'
  | 'origen_inconsistente'
  | 'valor_negativo'
  | 'permiso_faltante';

export type SeveridadLegal = 'advertencia' | 'grave' | 'critico';

export interface HallazgoAuditoria {
  id: string;
  tipo: TipoRiesgoLegal;
  severidad: SeveridadLegal;
  titulo: string;
  descripcion: string;
  baseLegal: string;
  impactoLicencia: string;
  accionRequerida: string;
  paquetesAfectados: number;
  guiasAfectadas: string[];
  montoRiesgo?: number;
}

export interface InformeRiesgoLegal {
  id: string;
  fechaGeneracion: string;
  mawb: string;
  totalHallazgos: number;
  hallazgos: HallazgoAuditoria[];
  nivelRiesgoGlobal: SeveridadLegal;
  requiereFirmaCorredor: boolean;
  mensajeZod: string;
  mensajeStella: string;
  hashInforme: string;
  estadoFirma: 'pendiente' | 'firmado' | 'rechazado';
  firmadoPor?: string;
  fechaFirma?: string;
}

export interface DatosAuditoria {
  mawb: string;
  paquetes: DatosPaqueteAuditoria[];
  pesoDeclaradoTotal: number;
  pesoVerificadoTotal: number;
  paisOrigen: string;
}

export interface DatosPaqueteAuditoria {
  guia: string;
  descripcion: string;
  valorUSD: number;
  peso: number;
  consignatario: string;
  identificacion: string;
  direccion: string;
  provincia: string;
  clasificacionHTS?: string;
  requierePermiso?: boolean;
  tipoPermiso?: string;
}

// ============ MOTOR DE AUDITORÍA ============

export class AuditoriaResponsabilidadSolidaria {

  /**
   * Ejecuta la auditoría completa de responsabilidad solidaria
   */
  static ejecutar(datos: DatosAuditoria): InformeRiesgoLegal {
    const hallazgos: HallazgoAuditoria[] = [];

    // 1. Detectar subvaluación
    hallazgos.push(...this.detectarSubvaluacion(datos.paquetes));

    // 2. Detectar fraccionamiento
    hallazgos.push(...this.detectarFraccionamiento(datos.paquetes));

    // 3. Detectar descripciones genéricas
    hallazgos.push(...this.detectarDescripcionesGenericas(datos.paquetes));

    // 4. Detectar documentos faltantes
    hallazgos.push(...this.detectarDocumentosFaltantes(datos.paquetes));

    // 5. Detectar consignatarios sin identificación
    hallazgos.push(...this.detectarConsignatariosFantasma(datos.paquetes));

    // 6. Detectar permisos faltantes
    hallazgos.push(...this.detectarPermisosFaltantes(datos.paquetes));

    // 7. Detectar valores negativos o cero
    hallazgos.push(...this.detectarValoresAnormales(datos.paquetes));

    // Calcular nivel global
    const nivelRiesgoGlobal = this.calcularNivelGlobal(hallazgos);
    const requiereFirma = hallazgos.some(h => h.severidad === 'critico') || hallazgos.length >= 5;

    const fechaGeneracion = new Date().toISOString();
    const hashData = `audit:${datos.mawb}:${hallazgos.length}:${nivelRiesgoGlobal}:${fechaGeneracion}`;
    const hashInforme = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    return {
      id: `ARS-${Date.now()}`,
      fechaGeneracion,
      mawb: datos.mawb,
      totalHallazgos: hallazgos.length,
      hallazgos,
      nivelRiesgoGlobal,
      requiereFirmaCorredor: requiereFirma,
      mensajeZod: this.generarMensajeZod(hallazgos, nivelRiesgoGlobal, requiereFirma),
      mensajeStella: this.generarMensajeStella(hallazgos, nivelRiesgoGlobal),
      hashInforme,
      estadoFirma: 'pendiente',
    };
  }

  // ─── DETECTORES ───

  private static detectarSubvaluacion(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];
    
    // Detectar valores sospechosamente bajos (< $1 USD con descripción larga)
    const sospechosos = paquetes.filter(p => 
      p.valorUSD > 0 && p.valorUSD < 5 && p.descripcion.length > 20
    );

    if (sospechosos.length > 0) {
      hallazgos.push({
        id: `H-SV-${Date.now()}`,
        tipo: 'subvaluacion',
        severidad: sospechosos.length > 10 ? 'critico' : 'grave',
        titulo: 'Posible subvaluación detectada',
        descripcion: `${sospechosos.length} paquete(s) con valor declarado inferior a $5.00 USD con descripción detallada de mercancía. Esto puede indicar subvaluación intencional.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 52 — Métodos de valoración OMC',
        impactoLicencia: 'La declaración de valores inferiores al real constituye fraude aduanero y puede resultar en suspensión temporal o cancelación de la licencia del corredor (Ley 30/1984, Art. 22).',
        accionRequerida: 'Verificar facturas comerciales originales y comparar con valores de referencia del mercado.',
        paquetesAfectados: sospechosos.length,
        guiasAfectadas: sospechosos.map(p => p.guia).slice(0, 10),
        montoRiesgo: sospechosos.reduce((sum, p) => sum + p.valorUSD, 0),
      });
    }

    return hallazgos;
  }

  private static detectarFraccionamiento(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    // Agrupar por consignatario y verificar si el valor total supera $100
    const porConsignatario: Record<string, { total: number; guias: string[]; count: number }> = {};

    paquetes.forEach(p => {
      const key = p.consignatario.toUpperCase().trim();
      if (!porConsignatario[key]) {
        porConsignatario[key] = { total: 0, guias: [], count: 0 };
      }
      porConsignatario[key].total += p.valorUSD;
      porConsignatario[key].guias.push(p.guia);
      porConsignatario[key].count++;
    });

    // Detectar consignatarios con múltiples envíos menores a $100 que suman más
    const fraccionados = Object.entries(porConsignatario).filter(
      ([_, data]) => data.count > 1 && data.guias.every(g => {
        const paq = paquetes.find(p => p.guia === g);
        return paq && paq.valorUSD <= 100;
      }) && data.total > 100
    );

    if (fraccionados.length > 0) {
      hallazgos.push({
        id: `H-FR-${Date.now()}`,
        tipo: 'fraccionamiento',
        severidad: 'grave',
        titulo: 'Posible fraccionamiento de envíos',
        descripcion: `${fraccionados.length} consignatario(s) con múltiples envíos individuales ≤$100 que suman más de $100. Esto puede constituir fraccionamiento para evadir la liquidación.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 84 — Umbral De Minimis',
        impactoLicencia: 'La omisión de tributos por fraccionamiento genera responsabilidad solidaria del corredor (Ley 30/1984, Art. 15). Multa: 100% de los tributos dejados de pagar.',
        accionRequerida: 'Consolidar los envíos del mismo consignatario y declarar como una sola importación si corresponde.',
        paquetesAfectados: fraccionados.reduce((sum, [_, d]) => sum + d.count, 0),
        guiasAfectadas: fraccionados.flatMap(([_, d]) => d.guias).slice(0, 10),
        montoRiesgo: fraccionados.reduce((sum, [_, d]) => sum + d.total, 0),
      });
    }

    return hallazgos;
  }

  private static detectarDescripcionesGenericas(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    const palabrasGenericas = [
      'merchandise', 'general merchandise', 'gift', 'personal effects',
      'varios', 'mercancia general', 'regalo', 'efectos personales',
      'goods', 'sample', 'parts', 'accessories', 'supplies', 'items',
      'stuff', 'things', 'misc', 'miscellaneous', 'other',
    ];

    const genericos = paquetes.filter(p => {
      const desc = p.descripcion.toLowerCase().trim();
      return desc.length < 10 || palabrasGenericas.some(w => desc === w || desc.startsWith(w + ' '));
    });

    if (genericos.length > 0) {
      hallazgos.push({
        id: `H-DG-${Date.now()}`,
        tipo: 'descripcion_generica',
        severidad: genericos.length > 20 ? 'grave' : 'advertencia',
        titulo: 'Descripciones merceológicas insuficientes',
        descripcion: `${genericos.length} paquete(s) con descripciones genéricas que no cumplen con el requisito de descripción mínima obligatoria.`,
        baseLegal: 'Decreto Ejecutivo No. 266 de 2006, Art. 98 — Descripción merceológica',
        impactoLicencia: 'La presentación de descripciones genéricas puede resultar en la detención de la mercancía y un procedimiento administrativo contra el corredor.',
        accionRequerida: 'Solicitar descripciones detalladas al remitente (composición, uso, marca, modelo) antes de presentar la declaración.',
        paquetesAfectados: genericos.length,
        guiasAfectadas: genericos.map(p => p.guia).slice(0, 10),
      });
    }

    return hallazgos;
  }

  private static detectarDocumentosFaltantes(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    const sinDireccion = paquetes.filter(p => !p.direccion || p.direccion.trim().length < 5);

    if (sinDireccion.length > 0) {
      hallazgos.push({
        id: `H-DF-${Date.now()}`,
        tipo: 'documento_faltante',
        severidad: 'advertencia',
        titulo: 'Datos de dirección incompletos',
        descripcion: `${sinDireccion.length} paquete(s) sin dirección de entrega válida.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 96 — Requisitos de la declaración',
        impactoLicencia: 'La declaración con datos incompletos puede ser rechazada por el SIGA y generar demoras en el levante.',
        accionRequerida: 'Completar los datos de dirección antes de presentar la declaración.',
        paquetesAfectados: sinDireccion.length,
        guiasAfectadas: sinDireccion.map(p => p.guia).slice(0, 10),
      });
    }

    return hallazgos;
  }

  private static detectarConsignatariosFantasma(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    const sinIdentificacion = paquetes.filter(p =>
      p.valorUSD > 100 && (!p.identificacion || p.identificacion.trim().length < 5)
    );

    if (sinIdentificacion.length > 0) {
      hallazgos.push({
        id: `H-CF-${Date.now()}`,
        tipo: 'consignatario_fantasma',
        severidad: sinIdentificacion.length > 5 ? 'grave' : 'advertencia',
        titulo: 'Consignatarios sin identificación fiscal (RUC/Cédula)',
        descripcion: `${sinIdentificacion.length} paquete(s) con valor >$100 sin RUC o cédula del consignatario.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 96 — Datos obligatorios del consignatario',
        impactoLicencia: 'La presentación de declaraciones sin datos fiscales del importador constituye incumplimiento grave que puede derivar en la suspensión de la licencia.',
        accionRequerida: 'Obtener RUC o cédula de identidad personal de cada consignatario con envíos >$100 CIF.',
        paquetesAfectados: sinIdentificacion.length,
        guiasAfectadas: sinIdentificacion.map(p => p.guia).slice(0, 10),
      });
    }

    return hallazgos;
  }

  private static detectarPermisosFaltantes(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    const sinPermiso = paquetes.filter(p => p.requierePermiso && !p.tipoPermiso);

    if (sinPermiso.length > 0) {
      hallazgos.push({
        id: `H-PF-${Date.now()}`,
        tipo: 'permiso_faltante',
        severidad: 'critico',
        titulo: 'Permisos sanitarios o de importación faltantes',
        descripcion: `${sinPermiso.length} paquete(s) con mercancía restringida pero sin permiso de importación verificado.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 65 — Mercancías restringidas y controladas',
        impactoLicencia: 'La declaración de mercancía restringida sin los permisos correspondientes constituye una falta gravísima que puede resultar en la cancelación definitiva de la licencia del corredor (Ley 30/1984, Art. 22).',
        accionRequerida: 'Obtener los permisos MINSA, MIDA, CONAPRED o AUPSA correspondientes ANTES de presentar la declaración.',
        paquetesAfectados: sinPermiso.length,
        guiasAfectadas: sinPermiso.map(p => p.guia).slice(0, 10),
      });
    }

    return hallazgos;
  }

  private static detectarValoresAnormales(paquetes: DatosPaqueteAuditoria[]): HallazgoAuditoria[] {
    const hallazgos: HallazgoAuditoria[] = [];

    const valoresAnormales = paquetes.filter(p => p.valorUSD <= 0);

    if (valoresAnormales.length > 0) {
      hallazgos.push({
        id: `H-VN-${Date.now()}`,
        tipo: 'valor_negativo',
        severidad: 'grave',
        titulo: 'Valores declarados en cero o negativos',
        descripcion: `${valoresAnormales.length} paquete(s) con valor declarado ≤ $0.00. Todo envío comercial debe tener un valor de transacción positivo.`,
        baseLegal: 'Decreto Ley 1 de 2008, Art. 45 — Valor de transacción',
        impactoLicencia: 'La declaración de valor cero sin justificación (muestras sin valor comercial documentadas) puede interpretarse como omisión de tributos.',
        accionRequerida: 'Verificar las facturas comerciales y corregir los valores declarados. Si son muestras, documentar con carta del exportador.',
        paquetesAfectados: valoresAnormales.length,
        guiasAfectadas: valoresAnormales.map(p => p.guia).slice(0, 10),
      });
    }

    return hallazgos;
  }

  // ─── GENERADORES DE MENSAJES ───

  private static calcularNivelGlobal(hallazgos: HallazgoAuditoria[]): SeveridadLegal {
    if (hallazgos.some(h => h.severidad === 'critico')) return 'critico';
    if (hallazgos.some(h => h.severidad === 'grave')) return 'grave';
    return 'advertencia';
  }

  private static generarMensajeZod(
    hallazgos: HallazgoAuditoria[],
    nivel: SeveridadLegal,
    requiereFirma: boolean
  ): string {
    if (hallazgos.length === 0) {
      return 'Zod Integrity: Auditoría de Responsabilidad Solidaria completada sin hallazgos. La integridad documental está verificada.';
    }

    const criticos = hallazgos.filter(h => h.severidad === 'critico').length;
    const graves = hallazgos.filter(h => h.severidad === 'grave').length;

    if (nivel === 'critico') {
      return `Veredicto de Zod: ALERTA DE RESPONSABILIDAD SOLIDARIA. Se detectaron ${criticos} hallazgo(s) crítico(s) y ${graves} grave(s) que comprometen la licencia del corredor. ${requiereFirma ? 'Se requiere firma del corredor en el Informe de Riesgo antes de proceder.' : ''} La liquidación SIGA está BLOQUEADA hasta la resolución de los hallazgos críticos.`;
    }

    if (nivel === 'grave') {
      return `Zod Integrity: Auditoría detectó ${hallazgos.length} hallazgo(s) — ${graves} de severidad grave. ${requiereFirma ? 'El corredor debe revisar y firmar el Informe de Riesgo.' : 'Se recomienda revisión antes de proceder.'} La operación puede continuar bajo responsabilidad del corredor firmante.`;
    }

    return `Zod Integrity: Auditoría completada con ${hallazgos.length} advertencia(s) menor(es). Se recomienda revisión pero no se bloquea la operación.`;
  }

  private static generarMensajeStella(
    hallazgos: HallazgoAuditoria[],
    nivel: SeveridadLegal
  ): string {
    if (hallazgos.length === 0) {
      return 'Jefe, he revisado el expediente completo y no detecto riesgos para tu licencia. Todo en orden para proceder con la liquidación.';
    }

    if (nivel === 'critico') {
      return `Jefe, atención urgente: Zod ha detectado ${hallazgos.length} hallazgo(s) en la Auditoría de Responsabilidad Solidaria, incluyendo riesgos críticos que podrían afectar tu licencia. Te recomiendo revisar el Informe de Riesgo detallado antes de continuar. Recuerda que conforme a la Ley 30 de 1984, Art. 15, la responsabilidad solidaria implica consecuencias directas para el corredor firmante.`;
    }

    if (nivel === 'grave') {
      return `Jefe, la auditoría de Zod encontró ${hallazgos.length} observaciones que necesitan tu atención. Aunque no bloquean la operación, te sugiero revisarlas para proteger tu licencia. Especialmente las relacionadas con ${hallazgos.filter(h => h.severidad === 'grave').map(h => h.titulo).join(', ')}.`;
    }

    return `Jefe, la auditoría tiene ${hallazgos.length} observación(es) menor(es). Nada grave, pero te las dejo marcadas para tu revisión.`;
  }
}
