/**
 * INSPECCIÓN DE 17 PUNTOS — ZENITH Security Gate
 * Definición del checklist estándar BASC/OEA
 * Exterior (7) + Interior (5) + Estructura (5) = 17 puntos
 */

export type SeccionInspeccion = 'exterior' | 'interior' | 'estructura';

export interface PuntoInspeccion {
  id: string;
  numero: number;
  seccion: SeccionInspeccion;
  nombre: string;
  descripcion: string;
  instruccionStella: string;
  critico: boolean;
  requiereFoto: boolean;
}

export interface EstadoPuntoInspeccion extends PuntoInspeccion {
  verificado: boolean;
  fotoUrl: string | null;
  fotoSubida: boolean;
  notas: string;
  timestamp: string | null;
}

export interface ResultadoInspeccion {
  id: string;
  mawb: string;
  operadorId: string;
  estado: 'en_progreso' | 'completada' | 'certificada';
  items: EstadoPuntoInspeccion[];
  progreso: number;
  hashCertificacion: string | null;
  nivelRiesgo: string | null;
  scoreRiesgo: number | null;
  creadoEn: string;
  certificadaEn: string | null;
}

// ============ LOS 17 PUNTOS DE INSPECCIÓN ============

export const PUNTOS_INSPECCION: PuntoInspeccion[] = [
  // ─── EXTERIOR (7 puntos) ───
  {
    id: 'ext-01',
    numero: 1,
    seccion: 'exterior',
    nombre: 'Parachoques Delantero/Trasero',
    descripcion: 'Inspección visual y táctil de parachoques delantero y trasero',
    instruccionStella: 'Verifica que no existan compartimentos falsos detrás de los parachoques. Busca soldaduras frescas, tornillos nuevos o marcas de manipulación reciente.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'ext-02',
    numero: 2,
    seccion: 'exterior',
    nombre: 'Motor y Compartimento',
    descripcion: 'Revisión del compartimento del motor y áreas adyacentes',
    instruccionStella: 'Inspecciona el compartimento del motor buscando paquetes adheridos, cables sueltos no originales, o compartimentos ocultos. Verifica el filtro de aire y depósitos.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'ext-03',
    numero: 3,
    seccion: 'exterior',
    nombre: 'Neumáticos y Llantas',
    descripcion: 'Inspección de neumáticos, llantas de repuesto y guardafangos',
    instruccionStella: 'Golpea suavemente los neumáticos para detectar sonidos huecos. Revisa la llanta de repuesto y el espacio detrás del guardafangos. Busca irregularidades en el perfil.',
    critico: false,
    requiereFoto: true,
  },
  {
    id: 'ext-04',
    numero: 4,
    seccion: 'exterior',
    nombre: 'Piso Exterior (Chasis Inferior)',
    descripcion: 'Inspección del piso exterior y parte inferior del vehículo',
    instruccionStella: 'Utiliza un espejo telescópico o lámpara para revisar la parte inferior del vehículo. Busca compartimentos soldados al chasis, cables adicionales o paquetes adheridos con cinta.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'ext-05',
    numero: 5,
    seccion: 'exterior',
    nombre: 'Tanques de Combustible',
    descripcion: 'Verificación de tanques de combustible y sistema de alimentación',
    instruccionStella: 'Compara el nivel de combustible con el indicador del tablero. Golpea el tanque escuchando diferencias en el sonido. Verifica que las tapas sean originales y sin señales de apertura.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'ext-06',
    numero: 6,
    seccion: 'exterior',
    nombre: 'Cabina del Conductor',
    descripcion: 'Revisión completa de la cabina, asientos y compartimentos',
    instruccionStella: 'Revisa debajo de los asientos, detrás del tablero, la guantera, compartimentos del techo y el área de descanso (si aplica). Verifica que los paneles estén firmemente instalados.',
    critico: false,
    requiereFoto: true,
  },
  {
    id: 'ext-07',
    numero: 7,
    seccion: 'exterior',
    nombre: 'Tanques de Aire/Sistema Neumático',
    descripcion: 'Inspección de tanques de aire comprimido y sistema neumático',
    instruccionStella: 'Verifica que los tanques de aire sean originales y no estén modificados. Busca soldaduras frescas o compartimentos falsos adheridos al sistema de frenos.',
    critico: false,
    requiereFoto: true,
  },

  // ─── INTERIOR (5 puntos) ───
  {
    id: 'int-01',
    numero: 8,
    seccion: 'interior',
    nombre: 'Puertas Interiores/Exteriores',
    descripcion: 'Verificación de puertas del contenedor, bisagras y cierres',
    instruccionStella: 'Revisa las bisagras de las puertas del contenedor buscando soldaduras frescas. Verifica que los mecanismos de cierre sean originales. Inspecciona el perímetro del sello de goma.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'int-02',
    numero: 9,
    seccion: 'interior',
    nombre: 'Piso Interior',
    descripcion: 'Inspección del piso interior del contenedor o unidad de carga',
    instruccionStella: 'Camina sobre todo el piso escuchando variaciones en el sonido. Un sonido hueco podría indicar un doble fondo. Verifica que no haya tablas sueltas o diferencias de altura.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'int-03',
    numero: 10,
    seccion: 'interior',
    nombre: 'Techo Interior',
    descripcion: 'Revisión del techo y estructura superior del contenedor',
    instruccionStella: 'Inspecciona el techo desde el interior buscando parches, soldaduras o paneles que no coincidan con el diseño original. Utiliza linterna para verificar uniformidad.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'int-04',
    numero: 11,
    seccion: 'interior',
    nombre: 'Paredes Laterales Izquierda/Derecha',
    descripcion: 'Inspección de paredes laterales interiores del contenedor',
    instruccionStella: 'Golpea ambas paredes laterales a diferentes alturas. Un cambio en el sonido podría indicar un doble pared. Verifica que las corrugaciones sean uniformes y originales.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'int-05',
    numero: 12,
    seccion: 'interior',
    nombre: 'Pared Frontal Interior',
    descripcion: 'Verificación de la pared frontal (cabecera) del contenedor',
    instruccionStella: 'Inspecciona la pared frontal buscando doble pared o compartimientos ocultos. Mide la profundidad interior vs exterior para detectar discrepancias.',
    critico: true,
    requiereFoto: true,
  },

  // ─── ESTRUCTURA (5 puntos) ───
  {
    id: 'est-01',
    numero: 13,
    seccion: 'estructura',
    nombre: 'Quinta Rueda',
    descripcion: 'Inspección del mecanismo de acople (quinta rueda)',
    instruccionStella: 'Verifica que no existan compartimentos falsos o soldaduras frescas en la quinta rueda. Inspecciona el área de enganche y los soportes adyacentes.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'est-02',
    numero: 14,
    seccion: 'estructura',
    nombre: 'Chasis y Travesaños',
    descripcion: 'Revisión estructural del chasis, vigas y travesaños',
    instruccionStella: 'Inspecciona los travesaños (crossmembers) del chasis buscando perfiles tubulares modificados o soldaduras que no sean de fábrica. Compara ambos lados.',
    critico: true,
    requiereFoto: true,
  },
  {
    id: 'est-03',
    numero: 15,
    seccion: 'estructura',
    nombre: 'Ejes de Transmisión',
    descripcion: 'Verificación de ejes, diferencial y sistema de transmisión',
    instruccionStella: 'Verifica los ejes de transmisión y el diferencial. Busca peso anormal, soldaduras no originales o tubos adheridos al sistema de transmisión.',
    critico: false,
    requiereFoto: true,
  },
  {
    id: 'est-04',
    numero: 16,
    seccion: 'estructura',
    nombre: 'Unidad de Refrigeración',
    descripcion: 'Inspección de la unidad de refrigeración (si aplica)',
    instruccionStella: 'Si el contenedor es refrigerado, inspecciona la unidad de enfriamiento buscando compartimentos ocultos. Verifica los conductos de aire y el compresor. Marca N/A si no aplica.',
    critico: false,
    requiereFoto: false,
  },
  {
    id: 'est-05',
    numero: 17,
    seccion: 'estructura',
    nombre: 'Sistema de Escape',
    descripcion: 'Revisión del sistema de escape y catalizador',
    instruccionStella: 'Inspecciona el sistema de escape, silenciador y catalizador. Los tubos de escape modificados o más gruesos de lo normal podrían contener compartimentos ocultos.',
    critico: false,
    requiereFoto: true,
  },
];

/**
 * Genera el estado inicial del checklist
 */
export function generarEstadoInicial(): EstadoPuntoInspeccion[] {
  return PUNTOS_INSPECCION.map(punto => ({
    ...punto,
    verificado: false,
    fotoUrl: null,
    fotoSubida: false,
    notas: '',
    timestamp: null,
  }));
}

/**
 * Calcula el progreso como porcentaje
 */
export function calcularProgreso(items: EstadoPuntoInspeccion[]): number {
  const total = items.length;
  const completados = items.filter(i => {
    if (i.requiereFoto) return i.verificado && i.fotoSubida;
    return i.verificado;
  }).length;
  return Math.round((completados / total) * 100);
}

/**
 * Verifica si todos los puntos críticos están completos
 */
export function todosCriticosCompletos(items: EstadoPuntoInspeccion[]): boolean {
  return items
    .filter(i => i.critico)
    .every(i => i.verificado && (i.requiereFoto ? i.fotoSubida : true));
}

/**
 * Obtiene los ítems agrupados por sección
 */
export function agruparPorSeccion(items: EstadoPuntoInspeccion[]): Record<SeccionInspeccion, EstadoPuntoInspeccion[]> {
  return {
    exterior: items.filter(i => i.seccion === 'exterior'),
    interior: items.filter(i => i.seccion === 'interior'),
    estructura: items.filter(i => i.seccion === 'estructura'),
  };
}

export const SECCION_INFO: Record<SeccionInspeccion, { titulo: string; descripcion: string; cantidad: number }> = {
  exterior: {
    titulo: 'Exterior del Vehículo',
    descripcion: '7 puntos de inspección exterior incluyendo parachoques, motor, neumáticos, piso, tanques y cabina',
    cantidad: 7,
  },
  interior: {
    titulo: 'Interior del Contenedor',
    descripcion: '5 puntos de inspección interior incluyendo puertas, piso, techo y paredes',
    cantidad: 5,
  },
  estructura: {
    titulo: 'Estructura y Mecanismos',
    descripcion: '5 puntos de inspección estructural incluyendo quinta rueda, chasis, ejes y refrigeración',
    cantidad: 5,
  },
};
