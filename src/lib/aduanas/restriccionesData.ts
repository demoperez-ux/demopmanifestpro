// ============================================
// BASE DE DATOS DE RESTRICCIONES ADUANERAS
// Autoridades: MINSA, MIDA, AUPSA, etc.
// ============================================

import { Restriccion, TipoRestriccion } from '@/types/aduanas';

export const RESTRICCIONES_PANAMA: Restriccion[] = [
  // ============================================
  // MINSA - Ministerio de Salud
  // ============================================
  {
    id: 'r001',
    keyword: 'medicine',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Medicamentos requieren registro sanitario',
    activo: true
  },
  {
    id: 'r002',
    keyword: 'medicamento',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Medicamentos requieren registro sanitario',
    activo: true
  },
  {
    id: 'r003',
    keyword: 'pharmaceutical',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Productos farmacéuticos requieren permiso MINSA',
    activo: true
  },
  {
    id: 'r004',
    keyword: 'vitamin',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Vitaminas en cantidad comercial requieren registro',
    activo: true
  },
  {
    id: 'r005',
    keyword: 'vitamina',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Vitaminas en cantidad comercial requieren registro',
    activo: true
  },
  {
    id: 'r006',
    keyword: 'supplement',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Suplementos dietéticos pueden requerir permiso',
    activo: true
  },
  {
    id: 'r007',
    keyword: 'suplemento',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Suplementos dietéticos pueden requerir permiso',
    activo: true
  },
  {
    id: 'r008',
    keyword: 'syringe',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Dispositivos médicos requieren autorización',
    activo: true
  },
  {
    id: 'r009',
    keyword: 'jeringa',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Dispositivos médicos requieren autorización',
    activo: true
  },
  {
    id: 'r010',
    keyword: 'insulin',
    tipoRestriccion: 'farmaceutico',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Medicamentos controlados requieren receta',
    activo: true
  },
  
  // ============================================
  // MIDA - Ministerio de Desarrollo Agropecuario
  // ============================================
  {
    id: 'r020',
    keyword: 'seed',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Semillas requieren certificado fitosanitario',
    activo: true
  },
  {
    id: 'r021',
    keyword: 'semilla',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Semillas requieren certificado fitosanitario',
    activo: true
  },
  {
    id: 'r022',
    keyword: 'plant',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Plantas vivas requieren inspección fitosanitaria',
    activo: true
  },
  {
    id: 'r023',
    keyword: 'planta',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Plantas vivas requieren inspección fitosanitaria',
    activo: true
  },
  {
    id: 'r024',
    keyword: 'fertilizer',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Fertilizantes requieren registro MIDA',
    activo: true
  },
  {
    id: 'r025',
    keyword: 'pesticide',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Pesticidas requieren permiso especial',
    activo: true
  },
  {
    id: 'r026',
    keyword: 'veterinary',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Productos veterinarios requieren registro',
    activo: true
  },
  {
    id: 'r027',
    keyword: 'veterinario',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'MIDA',
    requierePermiso: true,
    descripcion: 'Productos veterinarios requieren registro',
    activo: true
  },
  
  // ============================================
  // AUPSA - Autoridad Panameña de Seguridad de Alimentos
  // ============================================
  {
    id: 'r030',
    keyword: 'food',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Alimentos requieren certificado de inocuidad',
    activo: true
  },
  {
    id: 'r031',
    keyword: 'alimento',
    tipoRestriccion: 'fitosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Alimentos requieren certificado de inocuidad',
    activo: true
  },
  {
    id: 'r032',
    keyword: 'meat',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Productos cárnicos prohibidos sin permiso especial',
    activo: true
  },
  {
    id: 'r033',
    keyword: 'carne',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Productos cárnicos prohibidos sin permiso especial',
    activo: true
  },
  {
    id: 'r034',
    keyword: 'dairy',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Lácteos requieren certificado sanitario',
    activo: true
  },
  {
    id: 'r035',
    keyword: 'lacteo',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Lácteos requieren certificado sanitario',
    activo: true
  },
  {
    id: 'r036',
    keyword: 'pet food',
    tipoRestriccion: 'zoosanitario',
    autoridad: 'AUPSA',
    requierePermiso: true,
    descripcion: 'Alimentos para mascotas requieren registro AUPSA',
    activo: true
  },
  
  // ============================================
  // SEGURIDAD - Productos Restringidos/Prohibidos
  // ============================================
  {
    id: 'r040',
    keyword: 'drone',
    tipoRestriccion: 'seguridad',
    autoridad: 'AAC',
    requierePermiso: true,
    descripcion: 'Drones requieren registro en Autoridad de Aeronáutica Civil',
    activo: true
  },
  {
    id: 'r041',
    keyword: 'weapon',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Armas requieren permiso especial',
    activo: true
  },
  {
    id: 'r042',
    keyword: 'arma',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Armas requieren permiso especial',
    activo: true
  },
  {
    id: 'r043',
    keyword: 'gun',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Armas de fuego prohibidas',
    activo: true
  },
  {
    id: 'r044',
    keyword: 'ammunition',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Municiones prohibidas',
    activo: true
  },
  {
    id: 'r045',
    keyword: 'knife',
    tipoRestriccion: 'seguridad',
    autoridad: 'MINGOB',
    requierePermiso: false,
    descripcion: 'Cuchillos pueden requerir revisión',
    activo: true
  },
  {
    id: 'r046',
    keyword: 'explosive',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Explosivos',
    activo: true
  },
  {
    id: 'r047',
    keyword: 'firework',
    tipoRestriccion: 'prohibido',
    autoridad: 'MINGOB',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Fuegos artificiales sin permiso',
    activo: true
  },
  
  // ============================================
  // AMBIENTAL - ANAM/MiAmbiente
  // ============================================
  {
    id: 'r050',
    keyword: 'ivory',
    tipoRestriccion: 'prohibido',
    autoridad: 'MiAmbiente',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Marfil y productos de especies protegidas',
    activo: true
  },
  {
    id: 'r051',
    keyword: 'marfil',
    tipoRestriccion: 'prohibido',
    autoridad: 'MiAmbiente',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Marfil y productos de especies protegidas',
    activo: true
  },
  {
    id: 'r052',
    keyword: 'exotic animal',
    tipoRestriccion: 'prohibido',
    autoridad: 'MiAmbiente',
    requierePermiso: true,
    descripcion: 'PROHIBIDO - Animales exóticos sin CITES',
    activo: true
  },
  {
    id: 'r053',
    keyword: 'leather',
    tipoRestriccion: 'ambiental',
    autoridad: 'MiAmbiente',
    requierePermiso: false,
    descripcion: 'Cuero de especies exóticas puede requerir CITES',
    activo: true
  },
  {
    id: 'r054',
    keyword: 'wood',
    tipoRestriccion: 'ambiental',
    autoridad: 'MiAmbiente',
    requierePermiso: false,
    descripcion: 'Madera puede requerir certificado de origen',
    activo: true
  },
  {
    id: 'r055',
    keyword: 'madera',
    tipoRestriccion: 'ambiental',
    autoridad: 'MiAmbiente',
    requierePermiso: false,
    descripcion: 'Madera puede requerir certificado de origen',
    activo: true
  },
  
  // ============================================
  // QUÍMICOS
  // ============================================
  {
    id: 'r060',
    keyword: 'chemical',
    tipoRestriccion: 'seguridad',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Químicos requieren hoja de seguridad MSDS',
    activo: true
  },
  {
    id: 'r061',
    keyword: 'quimico',
    tipoRestriccion: 'seguridad',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Químicos requieren hoja de seguridad MSDS',
    activo: true
  },
  {
    id: 'r062',
    keyword: 'acid',
    tipoRestriccion: 'seguridad',
    autoridad: 'MINSA',
    requierePermiso: true,
    descripcion: 'Ácidos requieren manejo especial',
    activo: true
  },
  {
    id: 'r063',
    keyword: 'battery lithium',
    tipoRestriccion: 'seguridad',
    autoridad: 'AAC',
    requierePermiso: false,
    descripcion: 'Baterías de litio tienen restricciones de transporte aéreo',
    activo: true
  },
  {
    id: 'r064',
    keyword: 'bateria litio',
    tipoRestriccion: 'seguridad',
    autoridad: 'AAC',
    requierePermiso: false,
    descripcion: 'Baterías de litio tienen restricciones de transporte aéreo',
    activo: true
  }
];

// Función para verificar restricciones en una descripción
export function verificarRestricciones(descripcion: string): Array<{
  tipo: string;
  mensaje: string;
  autoridad: string;
  requierePermiso: boolean;
}> {
  const descLower = descripcion.toLowerCase();
  const restriccionesDetectadas: Array<{
    tipo: string;
    mensaje: string;
    autoridad: string;
    requierePermiso: boolean;
  }> = [];
  
  const restriccionesEncontradas = new Set<string>();
  
  for (const restriccion of RESTRICCIONES_PANAMA) {
    if (!restriccion.activo) continue;
    
    const keyword = restriccion.keyword.toLowerCase();
    
    if (descLower.includes(keyword)) {
      // Evitar duplicados del mismo tipo de restricción
      const key = `${restriccion.tipoRestriccion}-${restriccion.autoridad}`;
      if (!restriccionesEncontradas.has(key)) {
        restriccionesEncontradas.add(key);
        restriccionesDetectadas.push({
          tipo: restriccion.tipoRestriccion,
          mensaje: restriccion.descripcion,
          autoridad: restriccion.autoridad,
          requierePermiso: restriccion.requierePermiso
        });
      }
    }
  }
  
  return restriccionesDetectadas;
}

// Verificar si un producto está prohibido
export function esProductoProhibido(descripcion: string): boolean {
  const restricciones = verificarRestricciones(descripcion);
  return restricciones.some(r => r.tipo === 'prohibido');
}

// Obtener autoridades involucradas
export function obtenerAutoridadesInvolucradas(descripcion: string): string[] {
  const restricciones = verificarRestricciones(descripcion);
  return [...new Set(restricciones.map(r => r.autoridad))];
}
