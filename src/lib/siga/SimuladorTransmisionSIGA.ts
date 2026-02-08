// ============================================
// SIMULADOR DE TRANSMISIÓN SIGA
// Simula el ciclo de vida de una transmisión
// al Sistema Integrado de Gestión Aduanera
// ============================================

export type EstadoTransmision =
  | 'preparando'
  | 'firmando'
  | 'enviando'
  | 'recibido_ana'
  | 'procesando_ana'
  | 'liquidacion_asignada'
  | 'error_conexion'
  | 'error_validacion'
  | 'error_ruc';

export interface TransmisionSIGA {
  id: string;
  declaracionId: string;
  consignatario: string;
  ruc: string;
  tipoDeclaracion: string;
  codigoRegimen: string;
  valorCIF: number;
  totalLiquidacion: number;
  estado: EstadoTransmision;
  timestampInicio: string;
  timestampActual: string;
  latenciaMs: number;
  numeroLiquidacion?: string;
  codigoError?: string;
  mensajeError?: string;
  stellaTraduccion?: string;
  zodIntegridad: string;
  hashXML: string;
  intentos: number;
  boletaPDF?: string;
}

export interface BoletaPago {
  id: string;
  numeroLiquidacion: string;
  declaracionId: string;
  consignatario: string;
  fechaEmision: string;
  fechaVencimiento: string;
  totalPagar: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  urlPDF: string;
  archivadaEn: string;
}

// Error codes that SIGA can return, with Stella translations
const ERRORES_SIGA: Record<string, { mensaje: string; stellaTraduccion: string }> = {
  'SIGA-001': {
    mensaje: 'RUC del importador no se encuentra activo en el registro fiscal.',
    stellaTraduccion: 'Jefe, la ANA dice que el RUC del importador no está activo. Necesita regularizar su situación fiscal antes de transmitir.'
  },
  'SIGA-002': {
    mensaje: 'Clasificación arancelaria no válida para el régimen declarado.',
    stellaTraduccion: 'La partida arancelaria que declaramos no es compatible con el régimen seleccionado. Revisemos la clasificación antes de reenviar.'
  },
  'SIGA-003': {
    mensaje: 'Error de autenticación: certificado digital expirado o revocado.',
    stellaTraduccion: 'El certificado de firma digital está vencido o fue revocado. El corredor debe renovar su certificado con la autoridad certificadora.'
  },
  'SIGA-004': {
    mensaje: 'Timeout de conexión con el servidor SIGA.',
    stellaTraduccion: 'No pudimos conectar con el SIGA — posiblemente el sistema está en mantenimiento. Reintentaremos automáticamente en unos minutos.'
  },
  'SIGA-005': {
    mensaje: 'Valor de transacción fuera del rango esperado para la partida declarada.',
    stellaTraduccion: 'La ANA detectó que el valor declarado parece inusual para esta partida arancelaria. Podría activar una revisión de subvaluación.'
  },
};

function generarNumeroLiquidacion(): string {
  const año = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `LIQ-${año}-${seq}`;
}

export function simularTransmision(
  declaracionId: string,
  consignatario: string,
  ruc: string,
  tipoDeclaracion: string,
  codigoRegimen: string,
  valorCIF: number,
  totalLiquidacion: number,
  hashXML: string
): TransmisionSIGA {
  const ahora = new Date().toISOString();
  const random = Math.random();

  // 70% success, 30% error
  if (random > 0.3) {
    const latencia = Math.floor(Math.random() * 3000 + 800);
    return {
      id: `TX-${Date.now().toString(36).toUpperCase()}`,
      declaracionId,
      consignatario,
      ruc,
      tipoDeclaracion,
      codigoRegimen,
      valorCIF,
      totalLiquidacion,
      estado: 'liquidacion_asignada',
      timestampInicio: ahora,
      timestampActual: new Date(Date.now() + latencia).toISOString(),
      latenciaMs: latencia,
      numeroLiquidacion: generarNumeroLiquidacion(),
      zodIntegridad: 'Integridad verificada antes del envío: OK',
      hashXML,
      intentos: 1,
    };
  }

  // Error scenario
  const codigosError = Object.keys(ERRORES_SIGA);
  const codigoError = codigosError[Math.floor(Math.random() * codigosError.length)];
  const error = ERRORES_SIGA[codigoError];
  const latencia = Math.floor(Math.random() * 5000 + 2000);

  const estadoError: EstadoTransmision =
    codigoError === 'SIGA-001' ? 'error_ruc' :
    codigoError === 'SIGA-004' ? 'error_conexion' : 'error_validacion';

  return {
    id: `TX-${Date.now().toString(36).toUpperCase()}`,
    declaracionId,
    consignatario,
    ruc,
    tipoDeclaracion,
    codigoRegimen,
    valorCIF,
    totalLiquidacion,
    estado: estadoError,
    timestampInicio: ahora,
    timestampActual: new Date(Date.now() + latencia).toISOString(),
    latenciaMs: latencia,
    codigoError,
    mensajeError: error.mensaje,
    stellaTraduccion: error.stellaTraduccion,
    zodIntegridad: 'Integridad verificada antes del envío: OK',
    hashXML,
    intentos: 1,
  };
}

export function generarBoletaPago(transmision: TransmisionSIGA): BoletaPago | null {
  if (transmision.estado !== 'liquidacion_asignada' || !transmision.numeroLiquidacion) return null;

  const fechaEmision = new Date();
  const fechaVencimiento = new Date(fechaEmision);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

  return {
    id: `BOL-${Date.now().toString(36).toUpperCase()}`,
    numeroLiquidacion: transmision.numeroLiquidacion,
    declaracionId: transmision.declaracionId,
    consignatario: transmision.consignatario,
    fechaEmision: fechaEmision.toISOString(),
    fechaVencimiento: fechaVencimiento.toISOString(),
    totalPagar: transmision.totalLiquidacion,
    estado: 'pendiente',
    urlPDF: `#boleta-${transmision.numeroLiquidacion}`,
    archivadaEn: `LEXIS Archive / ${transmision.declaracionId} / Boletas`,
  };
}

export function generarTransmisionesDemo(count: number = 8): TransmisionSIGA[] {
  const transmisiones: TransmisionSIGA[] = [];
  const consignatarios = [
    { nombre: 'Global Trade Corp S.A.', ruc: '155700123-1-2024' },
    { nombre: 'Farma Plus International', ruc: '8-NT-2-34567' },
    { nombre: 'TechImport Panamá S.A.', ruc: '155900456-1-2023' },
    { nombre: 'AgroInsumos del Istmo', ruc: '2-700-1234' },
    { nombre: 'Pacific Medical Supplies', ruc: '8-900-5678' },
  ];

  const estados: EstadoTransmision[] = [
    'liquidacion_asignada', 'liquidacion_asignada', 'liquidacion_asignada',
    'recibido_ana', 'procesando_ana', 'enviando',
    'error_ruc', 'error_validacion',
  ];

  for (let i = 0; i < count; i++) {
    const cons = consignatarios[i % consignatarios.length];
    const estado = estados[i % estados.length];
    const valorCIF = Math.round(Math.random() * 30000 + 1000);
    const total = Math.round(valorCIF * 0.22);
    const codigosError = Object.keys(ERRORES_SIGA);

    const tx: TransmisionSIGA = {
      id: `TX-${(Date.now() - i * 60000).toString(36).toUpperCase()}`,
      declaracionId: `DEC-${(Date.now() - i * 60000).toString(36).toUpperCase()}`,
      consignatario: cons.nombre,
      ruc: cons.ruc,
      tipoDeclaracion: ['DUA', 'DSI', 'DRT'][i % 3],
      codigoRegimen: ['10', '20', '40'][i % 3],
      valorCIF,
      totalLiquidacion: total,
      estado,
      timestampInicio: new Date(Date.now() - i * 3600000).toISOString(),
      timestampActual: new Date(Date.now() - i * 3600000 + 2500).toISOString(),
      latenciaMs: Math.floor(Math.random() * 4000 + 500),
      zodIntegridad: 'Integridad verificada antes del envío: OK',
      hashXML: Math.random().toString(36).substring(2, 18),
      intentos: estado.startsWith('error') ? Math.floor(Math.random() * 3 + 1) : 1,
    };

    if (estado === 'liquidacion_asignada') {
      tx.numeroLiquidacion = generarNumeroLiquidacion();
    }
    if (estado.startsWith('error')) {
      const code = codigosError[Math.floor(Math.random() * codigosError.length)];
      const err = ERRORES_SIGA[code];
      tx.codigoError = code;
      tx.mensajeError = err.mensaje;
      tx.stellaTraduccion = err.stellaTraduccion;
    }

    transmisiones.push(tx);
  }

  return transmisiones;
}
