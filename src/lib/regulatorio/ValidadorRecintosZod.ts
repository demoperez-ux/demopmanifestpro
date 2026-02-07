/**
 * VALIDADOR DE RECINTOS ADUANEROS — ZOD INTEGRITY ENGINE
 * Guardián de ubicación: valida coherencia recinto ↔ modo de transporte
 * Canal Seco OTH: Transbordos Atlántico ↔ Pacífico
 */

import CryptoJS from 'crypto-js';
import { ModoTransporte } from '@/types/transporte';
import {
  PUNTOS_CONTROL_PANAMA,
  PuntoControlAduanero,
  AdministracionRegional,
  obtenerPuntoControl,
  obtenerPuntosPorModo,
  obtenerPuntosPorAdministracion,
} from '@/lib/regulatorio/ReglasZonasAduaneras';
import { ZodVerdict } from '@/components/zenith/ZodIntegrityModal';

// ============ TIPOS ============

export type CategoriaRecinto = 'fronterizo' | 'maritimo' | 'aeropuerto' | 'postal' | 'zona_franca' | 'privado';

export interface RecintoEnriquecido extends PuntoControlAduanero {
  categoria: CategoriaRecinto;
  coordenadas: { lat: number; lng: number };
  estadoOperativo: 'activo' | 'mantenimiento';
  icono: string;
  colorMapa: string;
  tooltipStella: string;
}

export interface ResultadoValidacionRecinto {
  valido: boolean;
  recintoAsignado: RecintoEnriquecido | null;
  recintosSugeridos: RecintoEnriquecido[];
  mensajeStella: string;
  mensajeZod: string | null;
  bloqueado: boolean;
  hashVerificacion: string;
}

// ============ COORDENADAS APROXIMADAS ANA ============

const COORDENADAS_RECINTOS: Record<string, { lat: number; lng: number }> = {
  // Zona Oriental
  BALBOA: { lat: 8.9550, lng: -79.5634 },
  PSA_RODMAN: { lat: 8.9380, lng: -79.5865 },
  VACAMONTE: { lat: 8.8267, lng: -79.7340 },
  COQUIRA: { lat: 9.1719, lng: -79.0740 },
  ALBROOK: { lat: 8.9730, lng: -79.5500 },
  JAQUE: { lat: 7.5180, lng: -78.1650 },
  PUERTO_OBALDIA: { lat: 8.6680, lng: -77.4170 },
  // Zona Aeroportuaria
  PTY_CARGA: { lat: 9.0714, lng: -79.3835 },
  PTY_PAX: { lat: 9.0714, lng: -79.3835 },
  CORREOS: { lat: 9.0714, lng: -79.3835 },
  COURIERS: { lat: 9.0714, lng: -79.3835 },
  // Zona Norte
  CRISTOBAL: { lat: 9.3553, lng: -79.9009 },
  MIT: { lat: 9.3700, lng: -79.8510 },
  CCT: { lat: 9.3620, lng: -79.8760 },
  ZLC: { lat: 9.3483, lng: -79.8994 },
  COLON_2000: { lat: 9.3590, lng: -79.9030 },
  BAHIA_MINAS: { lat: 9.3780, lng: -79.8480 },
  DAVIS: { lat: 9.3450, lng: -79.8900 },
  // Zona Occidental
  PASO_CANOAS: { lat: 8.5360, lng: -82.8390 },
  DAVID: { lat: 8.4340, lng: -82.4310 },
  ENRIQUE_MALEK: { lat: 8.3910, lng: -82.4340 },
  RIO_SERENO: { lat: 8.7930, lng: -82.8700 },
  PEDREGAL: { lat: 8.3830, lng: -82.4310 },
  CHARCO_AZUL: { lat: 8.0580, lng: -82.1940 },
  // Zona Nor-Occidental
  GUABITO: { lat: 9.4930, lng: -82.6140 },
  ALMIRANTE: { lat: 9.3020, lng: -82.3990 },
  CHIRIQUI_GRANDE: { lat: 8.9480, lng: -82.1260 },
  BOCAS_AEROPUERTO: { lat: 9.3408, lng: -82.2508 },
  // Zona Central/Azuero
  AGUADULCE: { lat: 8.2380, lng: -80.5490 },
  RIO_HATO: { lat: 8.3760, lng: -80.1280 },
  MENSABE: { lat: 7.7900, lng: -80.2800 },
  MUTIS: { lat: 7.8420, lng: -80.9810 },
  BOCA_PARITA: { lat: 8.0620, lng: -80.4210 },
  SANTIAGO: { lat: 8.1010, lng: -80.9710 },
  // Panamá Pacífico
  PPAC: { lat: 8.9280, lng: -79.6010 },
  // Canal Seco
  CANAL_SECO_OTH: { lat: 9.1500, lng: -79.6500 },
};

// ============ CATEGORIZACIÓN ============

function categorizarRecinto(punto: PuntoControlAduanero): CategoriaRecinto {
  switch (punto.tipo) {
    case 'frontera_terrestre': return 'fronterizo';
    case 'puerto': return 'maritimo';
    case 'aeropuerto':
    case 'terminal_carga': return 'aeropuerto';
    case 'encomiendas': return 'postal';
    case 'zona_libre':
    case 'zona_especial': return 'zona_franca';
    case 'deposito_fiscal': return 'privado';
    case 'cruceros': return 'maritimo';
    default: return 'privado';
  }
}

function obtenerIconoCategoria(cat: CategoriaRecinto): string {
  switch (cat) {
    case 'fronterizo': return '🏁';
    case 'maritimo': return '⚓';
    case 'aeropuerto': return '✈️';
    case 'postal': return '📮';
    case 'zona_franca': return '🏭';
    case 'privado': return '🏢';
  }
}

function obtenerColorCategoria(cat: CategoriaRecinto): string {
  switch (cat) {
    case 'fronterizo': return 'hsl(38 92% 50%)';
    case 'maritimo': return 'hsl(217 91% 60%)';
    case 'aeropuerto': return 'hsl(187 90% 51%)';
    case 'postal': return 'hsl(280 68% 55%)';
    case 'zona_franca': return 'hsl(142 71% 45%)';
    case 'privado': return 'hsl(215 16% 47%)';
  }
}

function generarTooltipStella(punto: PuntoControlAduanero): string {
  const capacidad = punto.capacidadContenedores
    ? `Capacidad: ${punto.capacidadContenedores} contenedores. `
    : '';
  const controles: string[] = [];
  if (punto.tieneControlFitosanitario) controles.push('Fitosanitario');
  if (punto.tieneControlMINSA) controles.push('MINSA');
  if (punto.tieneCONAPRED) controles.push('CONAPRED');
  if (punto.tieneRayosX) controles.push('Rayos-X');
  if (punto.tieneBascula) controles.push('Báscula');

  const refrigerado = punto.restriccionesEspeciales.some(r =>
    r.descripcion.toLowerCase().includes('refriger') || r.descripcion.toLowerCase().includes('cadena de frío')
  );

  let tooltip = `${punto.nombre} — ${punto.horarioOperacion}. ${capacidad}`;
  tooltip += `Controles: ${controles.join(', ') || 'Ninguno'}. `;
  if (refrigerado) tooltip += '❄️ Cuenta con cadena de frío. ';
  if (punto.paisFrontera) tooltip += `Frontera con ${punto.paisFrontera}. `;

  return tooltip;
}

// ============ CATÁLOGO ENRIQUECIDO ============

export function obtenerRecintosEnriquecidos(): RecintoEnriquecido[] {
  return PUNTOS_CONTROL_PANAMA.map(punto => {
    const categoria = categorizarRecinto(punto);
    return {
      ...punto,
      categoria,
      coordenadas: COORDENADAS_RECINTOS[punto.id] || { lat: 9.0, lng: -79.5 },
      estadoOperativo: 'activo' as const,
      icono: obtenerIconoCategoria(categoria),
      colorMapa: obtenerColorCategoria(categoria),
      tooltipStella: generarTooltipStella(punto),
    };
  });
}

export function obtenerRecintosPorCategoria(cat: CategoriaRecinto): RecintoEnriquecido[] {
  return obtenerRecintosEnriquecidos().filter(r => r.categoria === cat);
}

export function obtenerRecintosPorZonaAdmin(zona: AdministracionRegional): RecintoEnriquecido[] {
  return obtenerRecintosEnriquecidos().filter(r => r.administracionRegional === zona);
}

// ============ VALIDACIÓN ZOD — GUARDIÁN DE UBICACIÓN ============

/**
 * Valida que el recinto sea coherente con el modo de transporte declarado
 */
export function validarCoherenciaRecintoTransporte(
  recintoId: string,
  modoDeclarado: ModoTransporte,
  mawb?: string
): ResultadoValidacionRecinto {
  const timestamp = new Date().toISOString();
  const recintosEnriquecidos = obtenerRecintosEnriquecidos();
  const recinto = recintosEnriquecidos.find(r => r.id === recintoId);

  if (!recinto) {
    const hashData = `zod_recinto:unknown:${recintoId}:${timestamp}`;
    return {
      valido: false,
      recintoAsignado: null,
      recintosSugeridos: recintosEnriquecidos.filter(r => r.modosTransporte.includes(modoDeclarado)).slice(0, 5),
      mensajeStella: `Jefe, el recinto "${recintoId}" no está en el Directorio Oficial ANA 2026. Seleccione uno de los recintos sugeridos.`,
      mensajeZod: `Veredicto de Zod: Recinto "${recintoId}" no encontrado en el Directorio Oficial de la ANA. Operación bloqueada hasta seleccionar un recinto válido.`,
      bloqueado: true,
      hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
    };
  }

  // Check mode compatibility
  const modoCompatible = recinto.modosTransporte.includes(modoDeclarado);

  // Special case: Canal Seco allows maritime origin via intermodal transit
  const esCanalSeco = recinto.id === 'CANAL_SECO_OTH';
  const esTransbordoValido = esCanalSeco && (modoDeclarado === 'maritimo' || modoDeclarado === 'terrestre');

  if (!modoCompatible && !esTransbordoValido) {
    const sugeridos = recintosEnriquecidos.filter(r => r.modosTransporte.includes(modoDeclarado));
    const hashData = `zod_recinto:incompat:${recintoId}:${modoDeclarado}:${timestamp}`;

    return {
      valido: false,
      recintoAsignado: recinto,
      recintosSugeridos: sugeridos.slice(0, 5),
      mensajeStella: `Jefe, el recinto ${recinto.nombre} no está habilitado para transporte ${modoDeclarado}. ` +
        `Los modos permitidos son: ${recinto.modosTransporte.join(', ')}. ` +
        `He pre-seleccionado alternativas válidas para usted.`,
      mensajeZod: `Veredicto de Zod: Inconsistencia detectada. El recinto "${recinto.nombre}" no está habilitado para el modo de transporte ${modoDeclarado} declarado. ` +
        `Modos permitidos: ${recinto.modosTransporte.join(', ')}. Operación bloqueada por protocolo de seguridad.`,
      bloqueado: true,
      hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
    };
  }

  // Valid assignment
  const hashData = `zod_recinto:valid:${recintoId}:${modoDeclarado}:${mawb || 'N/A'}:${timestamp}`;

  // Stella suggestions based on context
  let mensajeStella = `Jefe, he verificado que el recinto ${recinto.nombre} está habilitado para ${modoDeclarado}. `;
  if (recinto.provincia === 'Chiriquí') {
    mensajeStella += `He detectado que esta carga va para Chiriquí; ${recinto.nombre} es la opción correcta para agilizar el cruce.`;
  } else if (recinto.provincia === 'Colón') {
    mensajeStella += `Puerto en Zona Norte verificado. Recuerde las tasas THC aplicables.`;
  } else if (esCanalSeco) {
    mensajeStella += `Canal Seco OTH habilitado — Tránsito intermodal Atlántico ↔ Pacífico autorizado por Decreto 13/2024.`;
  }

  return {
    valido: true,
    recintoAsignado: recinto,
    recintosSugeridos: [],
    mensajeStella,
    mensajeZod: null,
    bloqueado: false,
    hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
  };
}

/**
 * Sugiere el recinto óptimo basado en la provincia destino y modo de transporte
 */
export function sugerirRecintoOptimo(
  provinciaDestino: string,
  modoTransporte: ModoTransporte
): RecintoEnriquecido | null {
  const todos = obtenerRecintosEnriquecidos();
  const compatibles = todos.filter(r => r.modosTransporte.includes(modoTransporte) && r.estadoOperativo === 'activo');

  // Direct province match
  const enProvincia = compatibles.filter(r => r.provincia.toLowerCase() === provinciaDestino.toLowerCase());
  if (enProvincia.length > 0) {
    // Prefer main terminals (24/7 operation, has X-ray, etc.)
    return enProvincia.sort((a, b) => {
      const scoreA = (a.tieneRayosX ? 2 : 0) + (a.horarioOperacion === '24/7' ? 3 : 0) + (a.capacidadContenedores || 0) / 1000;
      const scoreB = (b.tieneRayosX ? 2 : 0) + (b.horarioOperacion === '24/7' ? 3 : 0) + (b.capacidadContenedores || 0) / 1000;
      return scoreB - scoreA;
    })[0];
  }

  // Fallback: main precincts per mode
  if (modoTransporte === 'aereo') return todos.find(r => r.id === 'PTY_CARGA') || null;
  if (modoTransporte === 'maritimo') return todos.find(r => r.id === 'BALBOA') || null;
  if (modoTransporte === 'terrestre') return todos.find(r => r.id === 'PASO_CANOAS') || null;

  return null;
}

// ============ CANAL SECO ============

export interface ResultadoTransbordoCanalSeco {
  autorizado: boolean;
  recintoOrigen: RecintoEnriquecido | null;
  recintoDestino: RecintoEnriquecido | null;
  rutaDescripcion: string;
  costoEstimado: number;
  mensajeStella: string;
  hashVerificacion: string;
}

const PUERTOS_ATLANTICO = ['CRISTOBAL', 'MIT', 'CCT', 'ZLC', 'BAHIA_MINAS'];
const PUERTOS_PACIFICO = ['BALBOA', 'PSA_RODMAN', 'VACAMONTE'];

export function validarTransbordoCanalSeco(
  recintoOrigenId: string,
  recintoDestinoId: string
): ResultadoTransbordoCanalSeco {
  const todos = obtenerRecintosEnriquecidos();
  const origen = todos.find(r => r.id === recintoOrigenId);
  const destino = todos.find(r => r.id === recintoDestinoId);
  const timestamp = new Date().toISOString();

  const origenAtlantico = PUERTOS_ATLANTICO.includes(recintoOrigenId);
  const origenPacifico = PUERTOS_PACIFICO.includes(recintoOrigenId);
  const destinoAtlantico = PUERTOS_ATLANTICO.includes(recintoDestinoId);
  const destinoPacifico = PUERTOS_PACIFICO.includes(recintoDestinoId);

  const esRutaValida = (origenAtlantico && destinoPacifico) || (origenPacifico && destinoAtlantico);

  const hashData = `canal_seco:${recintoOrigenId}:${recintoDestinoId}:${esRutaValida}:${timestamp}`;

  if (!esRutaValida) {
    return {
      autorizado: false,
      recintoOrigen: origen || null,
      recintoDestino: destino || null,
      rutaDescripcion: 'Ruta no válida para Canal Seco',
      costoEstimado: 0,
      mensajeStella: `Jefe, el Canal Seco OTH solo conecta puertos del Atlántico (Colón) con puertos del Pacífico (Panamá). ` +
        `La ruta ${origen?.nombre || recintoOrigenId} → ${destino?.nombre || recintoDestinoId} no califica.`,
      hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
    };
  }

  const direccion = origenAtlantico ? 'Atlántico → Pacífico' : 'Pacífico → Atlántico';

  return {
    autorizado: true,
    recintoOrigen: origen || null,
    recintoDestino: destino || null,
    rutaDescripcion: `Canal Seco OTH: ${origen?.nombre || recintoOrigenId} → ${destino?.nombre || recintoDestinoId} (${direccion})`,
    costoEstimado: 195, // Peaje $75 + Servicio tránsito $120
    mensajeStella: `Jefe, tránsito por Canal Seco "${direccion}" autorizado (Decreto 13/2024). ` +
      `Ruta: ${origen?.nombre} → ${destino?.nombre}. ` +
      `Costo estimado: $195.00 (Peaje $75 + Servicio intermodal $120). Zod monitorea la carga en tránsito.`,
    hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
  };
}

// ============ ESTADÍSTICAS PARA DASHBOARD ============

export interface EstadisticasRecintos {
  totalRecintos: number;
  porCategoria: Record<CategoriaRecinto, number>;
  porZona: Record<string, { nombre: string; total: number }>;
  activos: number;
  conRayosX: number;
  conBascula: number;
  con24_7: number;
}

export function obtenerEstadisticasRecintos(): EstadisticasRecintos {
  const recintos = obtenerRecintosEnriquecidos();

  const porCategoria: Record<CategoriaRecinto, number> = {
    fronterizo: 0, maritimo: 0, aeropuerto: 0, postal: 0, zona_franca: 0, privado: 0,
  };

  const nombresZona: Record<string, string> = {
    zona_oriental: 'Oriental',
    zona_aeroportuaria: 'Aeroportuaria',
    zona_norte: 'Norte (Colón)',
    zona_occidental: 'Occidental (Chiriquí)',
    zona_noroccidental: 'Nor-Occidental (Bocas)',
    zona_central_azuero: 'Central/Azuero',
    zona_panama_pacifico: 'Panamá Pacífico',
  };

  const porZona: Record<string, { nombre: string; total: number }> = {};

  recintos.forEach(r => {
    porCategoria[r.categoria]++;
    if (!porZona[r.administracionRegional]) {
      porZona[r.administracionRegional] = { nombre: nombresZona[r.administracionRegional] || r.administracionRegional, total: 0 };
    }
    porZona[r.administracionRegional].total++;
  });

  return {
    totalRecintos: recintos.length,
    porCategoria,
    porZona,
    activos: recintos.filter(r => r.estadoOperativo === 'activo').length,
    conRayosX: recintos.filter(r => r.tieneRayosX).length,
    conBascula: recintos.filter(r => r.tieneBascula).length,
    con24_7: recintos.filter(r => r.horarioOperacion === '24/7').length,
  };
}
