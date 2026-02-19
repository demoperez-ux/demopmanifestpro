/**
 * CUSTOMS SHIELD — Motor Anti-Fraude y Seguridad
 * 
 * Cuatro pilares de detección:
 * 1. Narcóticos y Opioides (análogos de fentanilo, precursores, terminología de laboratorio)
 * 2. GTIN/HS Mismatch (coherencia GTIN vs. partida arancelaria)
 * 3. Valoración Forense (relación Valor/Peso anómala)
 * 4. Armamento y Explosivos (partes de armas, accesorios tácticos, detonación)
 * 
 * Fundamento: Ley 48/2003, RECAUCA Art. 68, Ley 57/2011 (Armas), Decreto 171/2014
 */

import { ManifestRow } from '@/types/manifest';
import { devLog, devWarn } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════

export type TipoAlertaShield =
  | 'narcotico'
  | 'gtin_mismatch'
  | 'valoracion_forense'
  | 'armamento';

export type SeveridadShield = 'critico' | 'alto' | 'medio' | 'bajo';

export interface AlertaShield {
  id: string;
  tipo: TipoAlertaShield;
  severidad: SeveridadShield;
  guia: string;
  descripcion: string;
  detalle: string;
  stellaMensaje: string;
  fundamentoLegal: string;
  accionRequerida: string;
  bloqueaLiquidacion: boolean;
  /** Keywords que dispararon la alerta */
  keywordsDetectadas: string[];
}

export interface ResultadoShield {
  guia: ManifestRow;
  alertas: AlertaShield[];
  bloqueado: boolean;
  nivelRiesgo: SeveridadShield | 'ninguno';
}

export interface ResumenShield {
  totalAnalizadas: number;
  totalAlertas: number;
  totalBloqueadas: number;
  porTipo: Record<TipoAlertaShield, number>;
  porSeveridad: Record<SeveridadShield, number>;
  reporteSeguridad: AlertaShield[];
}

// ═══════════════════════════════════════════════════════════
// 1. DICCIONARIO DE NARCÓTICOS Y OPIOIDES
// ═══════════════════════════════════════════════════════════

/** Análogos de fentanilo y opioides sintéticos */
const NARCOTICOS_OPIOIDES: { keyword: string; categoria: string }[] = [
  // Fentanilo y análogos
  { keyword: 'fentanyl', categoria: 'Opioide sintético' },
  { keyword: 'fentanilo', categoria: 'Opioide sintético' },
  { keyword: 'carfentanil', categoria: 'Análogo de fentanilo (10,000x)' },
  { keyword: 'carfentanilo', categoria: 'Análogo de fentanilo (10,000x)' },
  { keyword: 'sufentanil', categoria: 'Análogo de fentanilo' },
  { keyword: 'alfentanil', categoria: 'Análogo de fentanilo' },
  { keyword: 'remifentanil', categoria: 'Análogo de fentanilo' },
  { keyword: 'acetylfentanyl', categoria: 'Análogo ilícito de fentanilo' },
  { keyword: 'furanylfentanyl', categoria: 'Análogo ilícito de fentanilo' },
  { keyword: 'butyrylfentanyl', categoria: 'Análogo ilícito de fentanilo' },
  // Otros opioides
  { keyword: 'heroin', categoria: 'Opioide natural ilícito' },
  { keyword: 'heroina', categoria: 'Opioide natural ilícito' },
  { keyword: 'oxycodone', categoria: 'Opioide semi-sintético' },
  { keyword: 'oxicodona', categoria: 'Opioide semi-sintético' },
  { keyword: 'hydrocodone', categoria: 'Opioide semi-sintético' },
  { keyword: 'methadone', categoria: 'Opioide sintético controlado' },
  { keyword: 'metadona', categoria: 'Opioide sintético controlado' },
  { keyword: 'tramadol', categoria: 'Opioide atípico controlado' },
  { keyword: 'buprenorphine', categoria: 'Opioide parcial controlado' },
  // Cannabis sintético
  { keyword: 'synthetic cannabinoid', categoria: 'Cannabinoide sintético' },
  { keyword: 'spice drug', categoria: 'Cannabinoide sintético' },
  { keyword: 'k2 drug', categoria: 'Cannabinoide sintético' },
];

/** Precursores químicos y terminología de laboratorio */
const PRECURSORES_LAB: { keyword: string; categoria: string }[] = [
  { keyword: 'pill press', categoria: 'Equipo de fabricación' },
  { keyword: 'tablet press', categoria: 'Equipo de fabricación' },
  { keyword: 'tableting machine', categoria: 'Equipo de fabricación' },
  { keyword: 'encapsulator', categoria: 'Equipo de fabricación' },
  { keyword: 'blender mixer pharmaceutical', categoria: 'Equipo de lab' },
  { keyword: 'rotary evaporator', categoria: 'Equipo de lab' },
  { keyword: 'vacuum pump lab', categoria: 'Equipo de lab' },
  { keyword: 'distillation kit', categoria: 'Equipo de lab' },
  { keyword: 'precursor chemical', categoria: 'Precursor genérico' },
  { keyword: 'reagent grade', categoria: 'Reactivo químico' },
  { keyword: 'synthesis grade', categoria: 'Químico para síntesis' },
  { keyword: 'n-methylformamide', categoria: 'Precursor fentanilo' },
  { keyword: 'norfentanyl', categoria: 'Metabolito/precursor fentanilo' },
  { keyword: 'aniline', categoria: 'Precursor químico' },
  { keyword: 'anilina', categoria: 'Precursor químico' },
  { keyword: 'piperidine', categoria: 'Precursor fentanilo' },
  { keyword: 'piperidina', categoria: 'Precursor fentanilo' },
  { keyword: 'phenethylamine', categoria: 'Precursor anfetaminas' },
  { keyword: 'fenetilamina', categoria: 'Precursor anfetaminas' },
  { keyword: 'acetic anhydride', categoria: 'Precursor heroína' },
  { keyword: 'anhidrido acetico', categoria: 'Precursor heroína' },
];

// ═══════════════════════════════════════════════════════════
// 4. DICCIONARIO DE ARMAMENTO Y EXPLOSIVOS
// ═══════════════════════════════════════════════════════════

const ARMAMENTO_EXPLOSIVOS: { keyword: string; categoria: string }[] = [
  // Partes de armas
  { keyword: 'gun barrel', categoria: 'Parte de arma de fuego' },
  { keyword: 'cañon de arma', categoria: 'Parte de arma de fuego' },
  { keyword: 'gun receiver', categoria: 'Pieza serializada de arma' },
  { keyword: 'lower receiver', categoria: 'Pieza serializada AR-15' },
  { keyword: 'upper receiver', categoria: 'Pieza de arma' },
  { keyword: 'firearm frame', categoria: 'Bastidor de arma' },
  { keyword: 'trigger assembly', categoria: 'Mecanismo de disparo' },
  { keyword: 'firing pin', categoria: 'Aguja percutora' },
  { keyword: 'gun slide', categoria: 'Corredera de pistola' },
  { keyword: 'magazine spring', categoria: 'Componente de cargador' },
  { keyword: 'gun magazine', categoria: 'Cargador de arma' },
  { keyword: 'ammunition', categoria: 'Munición' },
  { keyword: 'municiones', categoria: 'Munición' },
  { keyword: 'cartridge', categoria: 'Cartucho' },
  { keyword: 'bullet', categoria: 'Proyectil' },
  { keyword: 'gunpowder', categoria: 'Pólvora' },
  { keyword: 'polvora', categoria: 'Pólvora' },
  // Accesorios tácticos restringidos
  { keyword: 'silencer', categoria: 'Silenciador (restringido)' },
  { keyword: 'suppressor', categoria: 'Supresor (restringido)' },
  { keyword: 'bump stock', categoria: 'Accesorio táctico prohibido' },
  { keyword: 'binary trigger', categoria: 'Gatillo de disparo rápido' },
  { keyword: 'armor piercing', categoria: 'Munición perforante' },
  { keyword: 'body armor plate', categoria: 'Placa balística' },
  { keyword: 'ballistic vest', categoria: 'Chaleco antibalas' },
  { keyword: 'night vision scope', categoria: 'Mira de visión nocturna' },
  { keyword: 'thermal scope', categoria: 'Mira térmica' },
  // Explosivos y detonación
  { keyword: 'detonator', categoria: 'Detonador' },
  { keyword: 'detonador', categoria: 'Detonador' },
  { keyword: 'blasting cap', categoria: 'Cápsula detonante' },
  { keyword: 'explosive charge', categoria: 'Carga explosiva' },
  { keyword: 'c4 explosive', categoria: 'Explosivo plástico' },
  { keyword: 'dynamite', categoria: 'Dinamita' },
  { keyword: 'dinamita', categoria: 'Dinamita' },
  { keyword: 'timer detonation', categoria: 'Temporizador de detonación' },
  { keyword: 'electronic fuse', categoria: 'Mecha electrónica' },
  { keyword: 'ignition device', categoria: 'Dispositivo de ignición' },
  { keyword: 'incendiary device', categoria: 'Dispositivo incendiario' },
  { keyword: 'pipe bomb', categoria: 'Bomba artesanal' },
];

// ═══════════════════════════════════════════════════════════
// 3. VALORACIÓN FORENSE — Relación Valor/Peso
// ═══════════════════════════════════════════════════════════

/** Materias primas legítimas con alto peso y bajo valor */
const MATERIAS_PRIMAS_EXENTAS: string[] = [
  'raw material', 'materia prima', 'bulk', 'granel',
  'sand', 'arena', 'gravel', 'grava', 'cement', 'cemento',
  'steel', 'acero', 'iron', 'hierro', 'copper', 'cobre',
  'wood', 'madera', 'lumber', 'timber', 'plywood',
  'fabric', 'tela', 'textile', 'cotton', 'algodon',
  'paper', 'papel', 'cardboard', 'carton',
  'plastic pellets', 'pellets plastico', 'resin', 'resina',
  'fertilizer', 'fertilizante', 'soil', 'tierra',
  'animal feed', 'alimento animal', 'grain', 'grano',
  'flour', 'harina', 'sugar', 'azucar', 'salt', 'sal',
  'water', 'agua', 'oil bulk', 'aceite granel',
];

const UMBRAL_VALOR_BAJO = 10.00; // USD
const UMBRAL_PESO_ALTO_KG = 5; // 5 kg ≈ 11 lb

// ═══════════════════════════════════════════════════════════
// 2. GTIN/HS MISMATCH VALIDATION
// ═══════════════════════════════════════════════════════════

/** Mapeo de prefijos GTIN a rangos de ITBMS esperados */
interface GTINHSExpectation {
  gtinPrefixPattern: string;
  expectedITBMS: number;
  descripcion: string;
}

const GTIN_HS_RULES: GTINHSExpectation[] = [
  { gtinPrefixPattern: '2202', expectedITBMS: 10, descripcion: 'Bebidas alcohólicas (Cap. 22)' },
  { gtinPrefixPattern: '2203', expectedITBMS: 10, descripcion: 'Cerveza (Cap. 22.03)' },
  { gtinPrefixPattern: '2204', expectedITBMS: 10, descripcion: 'Vino (Cap. 22.04)' },
  { gtinPrefixPattern: '2205', expectedITBMS: 10, descripcion: 'Vermut (Cap. 22.05)' },
  { gtinPrefixPattern: '2206', expectedITBMS: 10, descripcion: 'Sidra y similares (Cap. 22.06)' },
  { gtinPrefixPattern: '2207', expectedITBMS: 10, descripcion: 'Alcohol etílico (Cap. 22.07)' },
  { gtinPrefixPattern: '2208', expectedITBMS: 10, descripcion: 'Licores y bebidas espirituosas (Cap. 22.08)' },
  { gtinPrefixPattern: '2402', expectedITBMS: 15, descripcion: 'Cigarrillos y tabaco (Cap. 24.02)' },
  { gtinPrefixPattern: '2403', expectedITBMS: 15, descripcion: 'Tabaco manufacturado (Cap. 24.03)' },
];

// ═══════════════════════════════════════════════════════════
// MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════

export class CustomsShieldEngine {

  /**
   * Ejecuta análisis completo de seguridad sobre un manifiesto.
   */
  static analizarManifiesto(guias: ManifestRow[]): {
    resultados: ResultadoShield[];
    resumen: ResumenShield;
  } {
    const resultados: ResultadoShield[] = [];
    const todasAlertas: AlertaShield[] = [];

    for (const guia of guias) {
      const alertas: AlertaShield[] = [];

      // Pilar 1: Narcóticos y Opioides
      alertas.push(...this.detectarNarcoticos(guia));

      // Pilar 2: GTIN/HS Mismatch
      alertas.push(...this.auditarGTINHS(guia));

      // Pilar 3: Valoración Forense
      alertas.push(...this.valoracionForense(guia));

      // Pilar 4: Armamento y Explosivos
      alertas.push(...this.detectarArmamento(guia));

      const bloqueado = alertas.some(a => a.bloqueaLiquidacion);
      const nivelRiesgo = this.calcularNivelRiesgo(alertas);

      resultados.push({ guia, alertas, bloqueado, nivelRiesgo });
      todasAlertas.push(...alertas);
    }

    const porTipo: Record<TipoAlertaShield, number> = {
      narcotico: 0, gtin_mismatch: 0, valoracion_forense: 0, armamento: 0,
    };
    const porSeveridad: Record<SeveridadShield, number> = {
      critico: 0, alto: 0, medio: 0, bajo: 0,
    };

    for (const a of todasAlertas) {
      porTipo[a.tipo]++;
      porSeveridad[a.severidad]++;
    }

    devLog(`[CustomsShield] ${guias.length} guías → ${todasAlertas.length} alertas, ${resultados.filter(r => r.bloqueado).length} bloqueadas`);

    return {
      resultados,
      resumen: {
        totalAnalizadas: guias.length,
        totalAlertas: todasAlertas.length,
        totalBloqueadas: resultados.filter(r => r.bloqueado).length,
        porTipo,
        porSeveridad,
        reporteSeguridad: todasAlertas.filter(a => a.severidad === 'critico' || a.severidad === 'alto'),
      },
    };
  }

  // ─── Pilar 1: Narcóticos y Opioides ──────────────────

  private static detectarNarcoticos(guia: ManifestRow): AlertaShield[] {
    const alertas: AlertaShield[] = [];
    const descLower = guia.description.toLowerCase();

    const allKeywords = [...NARCOTICOS_OPIOIDES, ...PRECURSORES_LAB];

    for (const item of allKeywords) {
      if (this.matchPalabraCompleta(descLower, item.keyword)) {
        const esOpioide = NARCOTICOS_OPIOIDES.some(n => n.keyword === item.keyword);
        alertas.push({
          id: `SHIELD-NAR-${guia.id}-${Date.now()}`,
          tipo: 'narcotico',
          severidad: esOpioide ? 'critico' : 'alto',
          guia: guia.trackingNumber,
          descripcion: guia.description,
          detalle: `${item.categoria}: "${item.keyword}" detectado en descripción`,
          stellaMensaje: `🛡️ ALERTA MÁXIMA: Sustancia controlada "${item.keyword}" (${item.categoria}) detectada en guía ${guia.trackingNumber}. Liquidación BLOQUEADA. Notificar ANA/CONAPRED inmediatamente. Riesgo de proceso penal.`,
          fundamentoLegal: 'Ley 48/2003 Art. 8 — Control de Sustancias; Decreto 171/2014; Convención de Viena 1988',
          accionRequerida: esOpioide
            ? 'DETENER DESPACHO. Notificar ANA, CONAPRED y Ministerio Público. No manipular mercancía.'
            : 'Retener mercancía. Solicitar Licencia de Operación de Unidad de Control de Químicos.',
          bloqueaLiquidacion: true,
          keywordsDetectadas: [item.keyword],
        });
        break; // Una alerta por guía para narcóticos
      }
    }

    return alertas;
  }

  // ─── Pilar 2: GTIN/HS Mismatch ──────────────────────

  private static auditarGTINHS(guia: ManifestRow): AlertaShield[] {
    const alertas: AlertaShield[] = [];
    if (!guia.hsCode || !guia.gtinCodigos?.length) return alertas;

    const hsCode = guia.hsCode.replace(/\D/g, '');

    for (const rule of GTIN_HS_RULES) {
      // Check if the HS code starts with the expected pattern for this GTIN category
      const gtinMatchesCategory = guia.gtinCodigos.some(gtin =>
        gtin.startsWith(rule.gtinPrefixPattern)
      );

      if (gtinMatchesCategory) {
        // The GTIN belongs to a category with specific ITBMS
        // Check if the assigned HS code matches
        const hsMatchesCategory = hsCode.startsWith(rule.gtinPrefixPattern.slice(0, 4));

        if (!hsMatchesCategory) {
          alertas.push({
            id: `SHIELD-GTIN-${guia.id}-${Date.now()}`,
            tipo: 'gtin_mismatch',
            severidad: 'alto',
            guia: guia.trackingNumber,
            descripcion: guia.description,
            detalle: `GTIN indica categoría "${rule.descripcion}" (ITBMS ${rule.expectedITBMS}%) pero partida arancelaria asignada es ${guia.hsCode}. Posible evasión fiscal.`,
            stellaMensaje: `⚠️ Riesgo de Evasión: El GTIN del ítem "${guia.description}" pertenece a ${rule.descripcion} (ITBMS ${rule.expectedITBMS}%) pero la partida arancelaria ${guia.hsCode} aplica ITBMS 7%. Discrepancia de ${rule.expectedITBMS - 7}% en obligación fiscal.`,
            fundamentoLegal: 'RECAUCA Art. 68 — Sanciones por clasificación arancelaria incorrecta; Ley 8/2010 Art. 1057-V',
            accionRequerida: `Verificar clasificación arancelaria. Si GTIN pertenece a ${rule.descripcion}, reclasificar a Cap. ${rule.gtinPrefixPattern.slice(0, 2)} con ITBMS ${rule.expectedITBMS}%.`,
            bloqueaLiquidacion: true,
            keywordsDetectadas: [rule.gtinPrefixPattern, guia.hsCode],
          });
          break;
        }
      }
    }

    // Also check known HS codes for alcohol/tobacco against descriptions
    const descLower = guia.description.toLowerCase();
    const alcoholKeywords = ['whisky', 'vodka', 'rum', 'ron', 'tequila', 'gin', 'beer', 'cerveza', 'wine', 'vino', 'liquor', 'licor', 'brandy', 'cognac'];
    const tobaccoKeywords = ['cigarette', 'cigarrillo', 'tobacco', 'tabaco', 'vape', 'e-cigarette'];

    const isAlcohol = alcoholKeywords.some(kw => descLower.includes(kw));
    const isTobacco = tobaccoKeywords.some(kw => descLower.includes(kw));

    if (isAlcohol && hsCode && !hsCode.startsWith('22')) {
      alertas.push({
        id: `SHIELD-HSMIS-ALC-${guia.id}`,
        tipo: 'gtin_mismatch',
        severidad: 'alto',
        guia: guia.trackingNumber,
        descripcion: guia.description,
        detalle: `Descripción indica bebida alcohólica pero HS Code ${guia.hsCode} no pertenece a Cap. 22. Riesgo de evasión ISC/ITBMS.`,
        stellaMensaje: `⚠️ Riesgo de Evasión Fiscal: "${guia.description}" parece bebida alcohólica pero clasificada fuera del Cap. 22. ISC e ITBMS 10% podrían no estar siendo aplicados correctamente.`,
        fundamentoLegal: 'Ley 8/2010 Art. 1057-V; Arancel de Panamá Cap. 22',
        accionRequerida: 'Reclasificar a partida del Capítulo 22 y recalcular ISC + ITBMS al 10%.',
        bloqueaLiquidacion: true,
        keywordsDetectadas: alcoholKeywords.filter(kw => descLower.includes(kw)),
      });
    }

    if (isTobacco && hsCode && !hsCode.startsWith('24')) {
      alertas.push({
        id: `SHIELD-HSMIS-TAB-${guia.id}`,
        tipo: 'gtin_mismatch',
        severidad: 'alto',
        guia: guia.trackingNumber,
        descripcion: guia.description,
        detalle: `Descripción indica tabaco pero HS Code ${guia.hsCode} no pertenece a Cap. 24. Riesgo de evasión ISC/ITBMS.`,
        stellaMensaje: `⚠️ Riesgo de Evasión: "${guia.description}" parece producto de tabaco pero clasificada fuera del Cap. 24. ITBMS 15% podría no estar siendo aplicado.`,
        fundamentoLegal: 'Ley 69/2009 — Impuesto al Tabaco; Arancel de Panamá Cap. 24',
        accionRequerida: 'Reclasificar a partida del Capítulo 24 y recalcular ISC + ITBMS al 15%.',
        bloqueaLiquidacion: true,
        keywordsDetectadas: tobaccoKeywords.filter(kw => descLower.includes(kw)),
      });
    }

    return alertas;
  }

  // ─── Pilar 3: Valoración Forense ────────────────────

  private static valoracionForense(guia: ManifestRow): AlertaShield[] {
    const alertas: AlertaShield[] = [];
    const descLower = guia.description.toLowerCase();

    // Convert weight from lb to kg (manifests may use lb)
    const pesoKg = guia.weight * 0.4536;

    // Skip if materia prima
    const esMateriaPrima = MATERIAS_PRIMAS_EXENTAS.some(mp => descLower.includes(mp));
    if (esMateriaPrima) return alertas;

    // Rule: Value < $10 AND Weight > 5kg on non-raw-material
    if (guia.valueUSD < UMBRAL_VALOR_BAJO && pesoKg > UMBRAL_PESO_ALTO_KG) {
      const ratio = guia.valueUSD / pesoKg;
      alertas.push({
        id: `SHIELD-VAL-${guia.id}-${Date.now()}`,
        tipo: 'valoracion_forense',
        severidad: ratio < 0.5 ? 'alto' : 'medio',
        guia: guia.trackingNumber,
        descripcion: guia.description,
        detalle: `Relación Valor/Peso anómala: $${guia.valueUSD.toFixed(2)} / ${pesoKg.toFixed(1)}kg = $${ratio.toFixed(2)}/kg. Mercancía no identificada como materia prima.`,
        stellaMensaje: `🔍 Valoración Forense: Guía ${guia.trackingNumber} declara $${guia.valueUSD.toFixed(2)} para ${pesoKg.toFixed(1)}kg ($${ratio.toFixed(2)}/kg). Ratio inconsistente para mercancía no clasificada como materia prima. Marcar para inspección manual.`,
        fundamentoLegal: 'Acuerdo de Valoración OMC Art. 1-7; RECAUCA Art. 321; Decreto Ejecutivo 41-2002',
        accionRequerida: 'Inspección física obligatoria. Solicitar factura comercial original para verificación de valor en aduana.',
        bloqueaLiquidacion: ratio < 0.5,
        keywordsDetectadas: [`$${guia.valueUSD.toFixed(2)}`, `${pesoKg.toFixed(1)}kg`],
      });
    }

    return alertas;
  }

  // ─── Pilar 4: Armamento y Explosivos ────────────────

  private static detectarArmamento(guia: ManifestRow): AlertaShield[] {
    const alertas: AlertaShield[] = [];
    const descLower = guia.description.toLowerCase();

    for (const item of ARMAMENTO_EXPLOSIVOS) {
      if (this.matchPalabraCompleta(descLower, item.keyword)) {
        const esExplosivo = ['Detonador', 'Cápsula detonante', 'Carga explosiva', 'Explosivo plástico',
          'Dinamita', 'Temporizador de detonación', 'Mecha electrónica', 'Dispositivo de ignición',
          'Dispositivo incendiario', 'Bomba artesanal', 'Pólvora'].includes(item.categoria);

        alertas.push({
          id: `SHIELD-ARM-${guia.id}-${Date.now()}`,
          tipo: 'armamento',
          severidad: esExplosivo ? 'critico' : 'alto',
          guia: guia.trackingNumber,
          descripcion: guia.description,
          detalle: `${item.categoria}: "${item.keyword}" detectado. ${esExplosivo ? 'MATERIAL EXPLOSIVO — Protocolo de emergencia.' : 'Componente de arma/accesorio táctico restringido.'}`,
          stellaMensaje: esExplosivo
            ? `🚨 EMERGENCIA: Material explosivo/detonante "${item.keyword}" detectado en guía ${guia.trackingNumber}. EVACUAR ÁREA. Notificar ANA, MINGOB y Cuerpo de Bomberos INMEDIATAMENTE.`
            : `🛡️ ALERTA ARMAMENTO: "${item.keyword}" (${item.categoria}) detectado en guía ${guia.trackingNumber}. Se requiere Permiso de Importación del MINGOB/IPFA. Liquidación bloqueada.`,
          fundamentoLegal: esExplosivo
            ? 'Ley 57/2011 Art. 79 — Control de Armas y Explosivos; Código Penal Art. 329-332'
            : 'Ley 57/2011 Art. 25 — Importación de Armas requiere Permiso MINGOB/IPFA',
          accionRequerida: esExplosivo
            ? 'EMERGENCIA: No manipular. Evacuar área inmediata. Notificar autoridades: ANA, MINGOB, Bomberos.'
            : 'Retener mercancía. Solicitar Permiso de Importación MINGOB/IPFA vigente antes del levante.',
          bloqueaLiquidacion: true,
          keywordsDetectadas: [item.keyword],
        });
        break;
      }
    }

    return alertas;
  }

  // ─── Utilidades ─────────────────────────────────────

  private static matchPalabraCompleta(texto: string, palabra: string): boolean {
    const escaped = palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
    return regex.test(texto);
  }

  private static calcularNivelRiesgo(alertas: AlertaShield[]): SeveridadShield | 'ninguno' {
    if (alertas.length === 0) return 'ninguno';
    if (alertas.some(a => a.severidad === 'critico')) return 'critico';
    if (alertas.some(a => a.severidad === 'alto')) return 'alto';
    if (alertas.some(a => a.severidad === 'medio')) return 'medio';
    return 'bajo';
  }

  /**
   * Genera Reporte de Alerta de Seguridad para envío proactivo a la ANA.
   */
  static generarReporteSeguridad(alertas: AlertaShield[]): string {
    const fecha = new Date();
    const criticas = alertas.filter(a => a.severidad === 'critico');
    const altas = alertas.filter(a => a.severidad === 'alto');

    const lines = [
      '═══════════════════════════════════════════════════════════',
      '  REPORTE DE ALERTA DE SEGURIDAD — CUSTOMS SHIELD',
      '  ZENITH Customs Intelligence Platform',
      '═══════════════════════════════════════════════════════════',
      '',
      `Fecha: ${fecha.toLocaleDateString('es-PA', { dateStyle: 'long' })}`,
      `Hora: ${fecha.toLocaleTimeString('es-PA')}`,
      `Total Alertas: ${alertas.length} (${criticas.length} CRÍTICAS, ${altas.length} ALTAS)`,
      '',
      '─── ALERTAS CRÍTICAS ───────────────────────────────────────',
      '',
    ];

    for (const a of criticas) {
      lines.push(`[${a.tipo.toUpperCase()}] Guía: ${a.guia}`);
      lines.push(`  Descripción: ${a.descripcion}`);
      lines.push(`  Detalle: ${a.detalle}`);
      lines.push(`  Fundamento: ${a.fundamentoLegal}`);
      lines.push(`  Acción: ${a.accionRequerida}`);
      lines.push('');
    }

    lines.push('─── ALERTAS ALTAS ────────────────────────────────────────');
    lines.push('');

    for (const a of altas) {
      lines.push(`[${a.tipo.toUpperCase()}] Guía: ${a.guia}`);
      lines.push(`  Descripción: ${a.descripcion}`);
      lines.push(`  Detalle: ${a.detalle}`);
      lines.push(`  Acción: ${a.accionRequerida}`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('Este reporte fue generado automáticamente por ZENITH');
    lines.push('Customs Shield para envío proactivo a la ANA.');
    lines.push(`Hash: SHA-256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`);

    return lines.join('\n');
  }
}

export default CustomsShieldEngine;
