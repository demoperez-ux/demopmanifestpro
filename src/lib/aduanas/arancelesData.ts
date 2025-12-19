// ============================================
// BASE DE DATOS DE ARANCELES DE PANAMÁ
// Códigos HS más comunes para paquetería courier
// ============================================

import { Arancel } from '@/types/aduanas';

export const ARANCELES_PANAMA: Arancel[] = [
  // ============================================
  // ELECTRÓNICOS Y TECNOLOGÍA
  // ============================================
  {
    hsCode: '8471.30.00',
    descripcion: 'Computadoras portátiles (laptops)',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '8517.12.00',
    descripcion: 'Teléfonos celulares',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '8528.72.00',
    descripcion: 'Televisores LCD/LED',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '8518.30.00',
    descripcion: 'Auriculares y audífonos',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '8471.41.00',
    descripcion: 'Computadoras de escritorio',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '8525.80.00',
    descripcion: 'Cámaras de video y fotográficas',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  
  // ============================================
  // ROPA Y CALZADO
  // ============================================
  {
    hsCode: '6109.10.00',
    descripcion: 'Camisetas de algodón',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Ropa',
    unidad: 'unidad'
  },
  {
    hsCode: '6203.42.00',
    descripcion: 'Pantalones de algodón para hombres',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Ropa',
    unidad: 'unidad'
  },
  {
    hsCode: '6204.62.00',
    descripcion: 'Pantalones de algodón para mujeres',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Ropa',
    unidad: 'unidad'
  },
  {
    hsCode: '6402.99.00',
    descripcion: 'Calzado deportivo',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Calzado',
    unidad: 'par'
  },
  {
    hsCode: '6404.11.00',
    descripcion: 'Calzado con suela de caucho/plástico',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Calzado',
    unidad: 'par'
  },
  
  // ============================================
  // MEDICAMENTOS Y FARMACÉUTICOS (MINSA)
  // ============================================
  {
    hsCode: '3004.90.00',
    descripcion: 'Medicamentos para uso humano',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 0,
    requiresPermiso: true,
    autoridad: 'MINSA',
    categoria: 'Medicamentos',
    unidad: 'unidad',
    notasAdicionales: 'Requiere registro sanitario'
  },
  {
    hsCode: '3004.50.00',
    descripcion: 'Vitaminas y suplementos',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: true,
    autoridad: 'MINSA',
    categoria: 'Suplementos',
    unidad: 'unidad',
    notasAdicionales: 'Requiere registro sanitario si es para venta'
  },
  {
    hsCode: '3002.15.00',
    descripcion: 'Productos inmunológicos',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 0,
    requiresPermiso: true,
    autoridad: 'MINSA',
    categoria: 'Medicamentos',
    unidad: 'unidad'
  },
  
  // ============================================
  // COSMÉTICOS Y CUIDADO PERSONAL
  // ============================================
  {
    hsCode: '3304.99.00',
    descripcion: 'Cosméticos y maquillaje',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Cosméticos',
    unidad: 'unidad'
  },
  {
    hsCode: '3305.10.00',
    descripcion: 'Champús',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Cuidado Personal',
    unidad: 'unidad'
  },
  {
    hsCode: '3307.10.00',
    descripcion: 'Perfumes y fragancias',
    daiPercent: 15,
    iscPercent: 10,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Cosméticos',
    unidad: 'unidad'
  },
  
  // ============================================
  // JUGUETES Y ARTÍCULOS DEPORTIVOS
  // ============================================
  {
    hsCode: '9503.00.00',
    descripcion: 'Juguetes varios',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Juguetes',
    unidad: 'unidad'
  },
  {
    hsCode: '9504.50.00',
    descripcion: 'Videojuegos y consolas',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Electrónica',
    unidad: 'unidad'
  },
  {
    hsCode: '9506.62.00',
    descripcion: 'Balones deportivos',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Deportes',
    unidad: 'unidad'
  },
  
  // ============================================
  // ACCESORIOS Y JOYERÍA
  // ============================================
  {
    hsCode: '7117.19.00',
    descripcion: 'Bisutería',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Accesorios',
    unidad: 'unidad'
  },
  {
    hsCode: '7113.19.00',
    descripcion: 'Joyería de metales preciosos',
    daiPercent: 15,
    iscPercent: 5,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Joyería',
    unidad: 'unidad'
  },
  {
    hsCode: '9102.11.00',
    descripcion: 'Relojes de pulsera',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Accesorios',
    unidad: 'unidad'
  },
  
  // ============================================
  // LIBROS Y MATERIAL IMPRESO
  // ============================================
  {
    hsCode: '4901.99.00',
    descripcion: 'Libros impresos',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 0,
    requiresPermiso: false,
    categoria: 'Libros',
    unidad: 'unidad',
    notasAdicionales: 'Exento de impuestos'
  },
  {
    hsCode: '4903.00.00',
    descripcion: 'Libros infantiles ilustrados',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 0,
    requiresPermiso: false,
    categoria: 'Libros',
    unidad: 'unidad'
  },
  
  // ============================================
  // HOGAR Y DECORACIÓN
  // ============================================
  {
    hsCode: '9403.60.00',
    descripcion: 'Muebles de madera',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Hogar',
    unidad: 'unidad'
  },
  {
    hsCode: '6911.10.00',
    descripcion: 'Vajilla de porcelana',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Hogar',
    unidad: 'unidad'
  },
  {
    hsCode: '9405.10.00',
    descripcion: 'Lámparas y luminarias',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Hogar',
    unidad: 'unidad'
  },
  
  // ============================================
  // PRODUCTOS VETERINARIOS (MIDA)
  // ============================================
  {
    hsCode: '3004.90.10',
    descripcion: 'Medicamentos veterinarios',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: true,
    autoridad: 'MIDA',
    categoria: 'Veterinario',
    unidad: 'unidad'
  },
  {
    hsCode: '2309.10.00',
    descripcion: 'Alimentos para perros y gatos',
    daiPercent: 5,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: true,
    autoridad: 'AUPSA',
    categoria: 'Veterinario',
    unidad: 'kg'
  },
  
  // ============================================
  // BEBIDAS (ISC ALTO)
  // ============================================
  {
    hsCode: '2204.21.00',
    descripcion: 'Vinos',
    daiPercent: 15,
    iscPercent: 10,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Bebidas',
    unidad: 'litro'
  },
  {
    hsCode: '2208.30.00',
    descripcion: 'Whisky',
    daiPercent: 15,
    iscPercent: 25,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Bebidas',
    unidad: 'litro'
  },
  
  // ============================================
  // GENERAL / MISCELÁNEOS
  // ============================================
  {
    hsCode: '3926.90.00',
    descripcion: 'Artículos de plástico varios',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'General',
    unidad: 'unidad'
  },
  {
    hsCode: '4202.92.00',
    descripcion: 'Bolsos y carteras',
    daiPercent: 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Accesorios',
    unidad: 'unidad'
  },
  {
    hsCode: '8509.40.00',
    descripcion: 'Electrodomésticos pequeños',
    daiPercent: 10,
    iscPercent: 0,
    itbmsPercent: 7,
    requiresPermiso: false,
    categoria: 'Hogar',
    unidad: 'unidad'
  }
];

// ============================================
// PALABRAS CLAVE PARA BÚSQUEDA INTELIGENTE
// ============================================
export const KEYWORDS_ARANCEL: Record<string, string[]> = {
  '8471.30.00': ['laptop', 'notebook', 'computadora portatil', 'macbook', 'chromebook'],
  '8517.12.00': ['celular', 'telefono', 'iphone', 'samsung', 'smartphone', 'movil'],
  '8528.72.00': ['tv', 'television', 'televisor', 'smart tv', 'monitor'],
  '8518.30.00': ['auricular', 'audifonos', 'headphone', 'earbuds', 'airpods'],
  '6109.10.00': ['camiseta', 'tshirt', 't-shirt', 'polo', 'camisa'],
  '6203.42.00': ['pantalon', 'jeans', 'pants', 'trousers'],
  '6402.99.00': ['zapato', 'tenis', 'sneaker', 'nike', 'adidas', 'shoes'],
  '6404.11.00': ['calzado', 'footwear', 'zapatos deportivos'],
  '3004.90.00': ['medicina', 'medicamento', 'drug', 'medication', 'pills', 'pastilla'],
  '3004.50.00': ['vitamina', 'vitamin', 'suplemento', 'supplement', 'omega', 'protein'],
  '3304.99.00': ['cosmetico', 'makeup', 'maquillaje', 'lipstick', 'foundation'],
  '3307.10.00': ['perfume', 'fragrance', 'cologne', 'parfum'],
  '9503.00.00': ['juguete', 'toy', 'muñeca', 'lego', 'figura'],
  '9504.50.00': ['videojuego', 'playstation', 'xbox', 'nintendo', 'gaming', 'console'],
  '4901.99.00': ['libro', 'book', 'textbook', 'novel'],
  '7117.19.00': ['bisuteria', 'jewelry', 'collar', 'pulsera', 'arete'],
  '9102.11.00': ['reloj', 'watch', 'smartwatch', 'apple watch'],
  '4202.92.00': ['bolso', 'cartera', 'bag', 'purse', 'backpack', 'mochila'],
  '2309.10.00': ['comida perro', 'dog food', 'cat food', 'comida gato', 'pet food'],
};

// Función para buscar arancel por descripción
export function buscarArancelPorDescripcion(descripcion: string): Arancel | null {
  const descLower = descripcion.toLowerCase();
  
  // Buscar por keywords
  for (const [hsCode, keywords] of Object.entries(KEYWORDS_ARANCEL)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        const arancel = ARANCELES_PANAMA.find(a => a.hsCode === hsCode);
        if (arancel) return arancel;
      }
    }
  }
  
  // Buscar por descripción del arancel
  let mejorCoincidencia: Arancel | null = null;
  let mejorScore = 0;
  
  const palabras = descLower.split(/\s+/).filter(p => p.length > 2);
  
  for (const arancel of ARANCELES_PANAMA) {
    const descArancelLower = arancel.descripcion.toLowerCase();
    let score = 0;
    
    for (const palabra of palabras) {
      if (descArancelLower.includes(palabra)) {
        score++;
      }
    }
    
    if (score > mejorScore) {
      mejorScore = score;
      mejorCoincidencia = arancel;
    }
  }
  
  return mejorScore > 0 ? mejorCoincidencia : null;
}

// Arancel genérico para cuando no se encuentra coincidencia
export const ARANCEL_GENERICO: Arancel = {
  hsCode: '9999.99.99',
  descripcion: 'Mercancía general no clasificada',
  daiPercent: 15,
  iscPercent: 0,
  itbmsPercent: 7,
  requiresPermiso: false,
  categoria: 'General',
  unidad: 'unidad',
  notasAdicionales: 'Clasificación pendiente - usar tasas estándar'
};
