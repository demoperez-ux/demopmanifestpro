/**
 * STRESS TEST ENGINE — Generador de datos demo para 689 guías
 * 
 * Genera un manifiesto sintético realista que simula carga aérea courier
 * con distribución estadística de categorías, valores y anomalías.
 */

import { ManifestRow } from '@/types/manifest';

const NOMBRES_PA = [
  'José Rodríguez', 'María González', 'Carlos Pérez', 'Ana Martínez', 'Luis Hernández',
  'Diana Castillo', 'Roberto Morales', 'Karina Sánchez', 'Eduardo Vargas', 'Patricia Ríos',
  'Fernando Torres', 'Gabriela Mendoza', 'Ricardo Quintero', 'Silvia Domínguez', 'Miguel Ángel Batista',
  'Yolanda De León', 'Alexis Pimentel', 'Carmen Rosa Díaz', 'Iván Barría', 'Melissa Araúz',
];

const PROVINCIAS_PA = ['Panamá', 'Panamá Oeste', 'Colón', 'Chiriquí', 'Veraguas', 'Coclé', 'Herrera', 'Los Santos'];
const CIUDADES_PA = ['Ciudad de Panamá', 'Arraiján', 'La Chorrera', 'Colón', 'David', 'Santiago', 'Chitré', 'Las Tablas', 'Penonomé'];

const DESCRIPCIONES_TECH = [
  'Apple iPhone 15 Pro Max 256GB', 'Samsung Galaxy S24 Ultra', 'MacBook Air M3 15"',
  'Dell XPS 13 Laptop', 'iPad Pro 12.9" M2', 'Sony WH-1000XM5 Headphones',
  'Nintendo Switch OLED', 'PlayStation 5 Console', 'Apple Watch Series 9',
  'AirPods Pro 2nd Gen', 'Logitech MX Master 3S Mouse', 'ASUS ROG Strix GPU RTX 4070',
  'HP LaserJet Pro Printer', 'GoPro Hero 12 Black', 'DJI Mini 4 Pro Drone',
  'Samsung 49" Curved Monitor', 'Bose SoundLink Speaker', 'Kindle Paperwhite 2024',
  'USB-C Hub 7-in-1 Adapter', 'SanDisk 1TB SSD External Drive',
  'Razer Huntsman V3 Keyboard', 'JBL Charge 5 Bluetooth Speaker', 'Canon EOS R50 Camera',
  'LG UltraGear 27" Gaming Monitor', 'Lenovo ThinkPad X1 Carbon',
];

const DESCRIPCIONES_SALUD = [
  'Vitamin D3 5000IU Supplement', 'Collagen Peptides Powder', 'Omega-3 Fish Oil Capsules',
  'CeraVe Moisturizing Cream 16oz', 'The Ordinary Niacinamide Serum', 'Neutrogena Sunscreen Lotion SPF70',
  'Whey Protein Isolate 5lb', 'Probiotic 50 Billion CFU', 'Biotin 10000mcg Hair Growth',
  'Turmeric Curcumin Capsules', 'Ashwagandha Root Extract', 'Melatonin 5mg Sleep Aid',
  'Baby Formula Enfamil NeuroPro', 'Essential Oil Set Lavender/Tea Tree',
  'Shampoo Anti-Dandruff Head & Shoulders',
];

const DESCRIPCIONES_AGRI = [
  'Organic Dog Food 30lb Bag', 'Cat Food Purina Pro Plan', 'Garden Seed Starter Kit',
  'Raw Honey Manuka 500g', 'Dried Fruit Mix Organic', 'Beef Jerky Premium 1lb',
];

const DESCRIPCIONES_GENERAL = [
  'Cotton T-Shirt XL Blue', 'Running Shoes Nike Air Max', 'Yoga Mat Premium 6mm',
  'Stainless Steel Water Bottle 32oz', 'Backpack Travel 40L', 'Sunglasses Ray-Ban Aviator',
  'Leather Wallet RFID Blocking', 'Ceramic Coffee Mug Set', 'LED Desk Lamp Adjustable',
  'Pillow Memory Foam Queen', 'Towel Set 6-Piece Egyptian Cotton', 'Board Game Settlers of Catan',
  'Candle Scented Soy Wax 3-Pack', 'Plastic Storage Bins Set of 4', 'Kitchen Utensils Set Bamboo',
  'Blanket Throw Fleece', 'Watch Band Silicone 42mm', 'Phone Case Clear Protective',
  'Book "Atomic Habits"', 'Puzzle 1000 Pieces Landscape', 'Hair Dryer Ionic 1875W',
  'Resistance Bands Set', 'Notebook Leather Bound A5', 'Umbrella Windproof Compact',
  'Socks Athletic 6-Pack', 'Hat Baseball Cap Adjustable', 'Gloves Winter Touchscreen',
  'Belt Genuine Leather Brown', 'Earrings Sterling Silver Set', 'Necklace Gold Plated Chain',
];

// Fraudulentas: artículos caros con valor declarado absurdo
const DESCRIPCIONES_FRAUDE = [
  { desc: 'MacBook Pro 16" M3 Max', valor: 1.00 },
  { desc: 'iPhone 15 Pro Max 1TB', valor: 2.50 },
  { desc: 'PlayStation 5 Pro Console Bundle', valor: 3.00 },
  { desc: 'Apple Watch Ultra 2', valor: 0.50 },
  { desc: 'Samsung Galaxy S24 Ultra 512GB', valor: 4.00 },
  { desc: 'iPad Pro 12.9 M2 WiFi+Cell', valor: 1.50 },
  { desc: 'DJI Mavic 3 Pro Drone Kit', valor: 2.00 },
  { desc: 'NVIDIA RTX 4090 Graphics Card', valor: 3.50 },
  { desc: 'Canon EOS R5 Camera Body', valor: 4.50 },
  { desc: 'Bose QuietComfort Headphones', valor: 0.99 },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateTracking(index: number): string {
  const prefixes = ['TBA', '1Z', ''];
  const prefix = randomFrom(prefixes);
  const num = String(400000000000 + index + Math.floor(Math.random() * 99999)).slice(0, 12);
  return `${prefix}${num}`;
}

export function generarManifiestoDemo(cantidad: number = 689): ManifestRow[] {
  const guias: ManifestRow[] = [];
  const mawb = '230-12345678';

  // Distribution: ~35% tech, ~15% health, ~5% agri, ~35% general, ~10% fraud
  const distTech = Math.round(cantidad * 0.35);
  const distSalud = Math.round(cantidad * 0.15);
  const distAgri = Math.round(cantidad * 0.05);
  const distFraude = Math.min(Math.round(cantidad * 0.10), DESCRIPCIONES_FRAUDE.length * 4);
  const distGeneral = cantidad - distTech - distSalud - distAgri - distFraude;

  const pool: { desc: string; valor: number; cat: string }[] = [];

  for (let i = 0; i < distTech; i++) {
    pool.push({ desc: randomFrom(DESCRIPCIONES_TECH), valor: randomBetween(25, 1200), cat: 'tech' });
  }
  for (let i = 0; i < distSalud; i++) {
    pool.push({ desc: randomFrom(DESCRIPCIONES_SALUD), valor: randomBetween(8, 120), cat: 'salud' });
  }
  for (let i = 0; i < distAgri; i++) {
    pool.push({ desc: randomFrom(DESCRIPCIONES_AGRI), valor: randomBetween(15, 80), cat: 'agri' });
  }
  for (let i = 0; i < distFraude; i++) {
    const fraud = randomFrom(DESCRIPCIONES_FRAUDE);
    pool.push({ desc: fraud.desc, valor: fraud.valor, cat: 'fraude' });
  }
  for (let i = 0; i < distGeneral; i++) {
    pool.push({ desc: randomFrom(DESCRIPCIONES_GENERAL), valor: randomBetween(5, 200), cat: 'general' });
  }

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    guias.push({
      id: `demo-${i + 1}`,
      trackingNumber: generateTracking(i),
      mawb,
      description: item.desc,
      valueUSD: item.valor,
      weight: randomBetween(0.3, 35),
      recipient: randomFrom(NOMBRES_PA),
      address: `${randomFrom(['Calle', 'Av.', 'Vía'])} ${Math.floor(Math.random() * 100) + 1}, ${randomFrom(CIUDADES_PA)}`,
      province: randomFrom(PROVINCIAS_PA),
      city: randomFrom(CIUDADES_PA),
      originalRowIndex: i + 1,
    });
  }

  return guias;
}

// ─── Financial Impact Calculator ────────────────────────

export interface FinancialImpact {
  tiempoTradicionalHoras: number;
  tiempoZenithMinutos: number;
  multasEvitadas: number;
  multasDetalle: string[];
  ahorroHorasHombre: number;
  costoHoraHombre: number;
  ahorroEBITDA: number;
  eficienciaPorcentaje: number;
}

export function calcularImpactoFinanciero(
  totalGuias: number,
  alertasFraude: number,
  erroresDetectados: number
): FinancialImpact {
  const tiempoTradicionalHoras = 48;
  const tiempoZenithMinutos = Math.max(8, Math.round(totalGuias * 0.018));
  const costoHoraHombre = 45; // USD

  // Each fraud alert = potential $500-2000 fine (RECAUCA Art. 68)
  const multaPorFraude = 1500;
  // Each undetected error = potential $200-800 penalty
  const multaPorError = 500;

  const multasEvitadas = (alertasFraude * multaPorFraude) + (erroresDetectados * multaPorError);

  const multasDetalle: string[] = [];
  if (alertasFraude > 0) {
    multasDetalle.push(`${alertasFraude} alertas de subvaloración × $${multaPorFraude.toLocaleString()} = $${(alertasFraude * multaPorFraude).toLocaleString()}`);
  }
  if (erroresDetectados > 0) {
    multasDetalle.push(`${erroresDetectados} errores de clasificación × $${multaPorError.toLocaleString()} = $${(erroresDetectados * multaPorError).toLocaleString()}`);
  }

  const ahorroHorasHombre = tiempoTradicionalHoras - (tiempoZenithMinutos / 60);
  const ahorroEBITDA = ahorroHorasHombre * costoHoraHombre;
  const eficienciaPorcentaje = Math.round(((tiempoTradicionalHoras * 60 - tiempoZenithMinutos) / (tiempoTradicionalHoras * 60)) * 100);

  return {
    tiempoTradicionalHoras,
    tiempoZenithMinutos,
    multasEvitadas,
    multasDetalle,
    ahorroHorasHombre: Math.round(ahorroHorasHombre * 10) / 10,
    costoHoraHombre,
    ahorroEBITDA: Math.round(ahorroEBITDA),
    eficienciaPorcentaje,
  };
}
