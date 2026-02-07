// ============================================
// Motor de Onboarding de Corredor (SOP-ACA-001)
// Control Points, SLA, RACI enforcement
// ============================================

import { 
  ETAPAS_SOP, 
  MATRIZ_RACI, 
  type ControlPoint, 
  type ProcesoOnboarding, 
  type SlaEstado,
  type RolRaci,
  type EtapaOnboarding 
} from '@/types/onboarding';

// ============================================
// SLA Engine
// ============================================
export function calcularSlaEstado(etapa: EtapaOnboarding, inicioTimestamp: string): SlaEstado {
  const ahora = Date.now();
  const inicio = new Date(inicioTimestamp).getTime();
  const transcurridoHoras = (ahora - inicio) / (1000 * 60 * 60);
  const porcentaje = transcurridoHoras / etapa.slaHoras;

  if (porcentaje <= 0.5) return 'verde';
  if (porcentaje <= 0.9) return 'amarillo';
  return 'rojo';
}

export function getTiempoRestante(etapa: EtapaOnboarding, inicioTimestamp: string): string {
  const ahora = Date.now();
  const inicio = new Date(inicioTimestamp).getTime();
  const transcurridoMs = ahora - inicio;
  const limiteMs = etapa.slaHoras * 60 * 60 * 1000;
  const restanteMs = limiteMs - transcurridoMs;

  if (restanteMs <= 0) return 'SLA vencido';

  const horas = Math.floor(restanteMs / (1000 * 60 * 60));
  const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (horas > 0) return `${horas}h ${minutos}m restantes`;
  return `${minutos}m restantes`;
}

// ============================================
// Control Point Validator
// ============================================
export interface ControlPointValidation {
  cpId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export function validateControlPoint(
  cpId: string,
  proceso: ProcesoOnboarding,
  documentos: { tipoDocumento: string; zodValidado: boolean; aiConfidence: number; requiereRevisionManual: boolean }[]
): ControlPointValidation {
  const result: ControlPointValidation = {
    cpId,
    passed: true,
    errors: [],
    warnings: [],
  };

  const etapaIdx = parseInt(cpId.replace('CP-', ''));
  const etapa = ETAPAS_SOP[etapaIdx];
  if (!etapa) {
    result.passed = false;
    result.errors.push(`Control Point ${cpId} no existe en SOP-ACA-001`);
    return result;
  }

  // Verificar documentos requeridos
  for (const tipoReq of etapa.documentosRequeridos) {
    const doc = documentos.find(d => d.tipoDocumento === tipoReq);
    if (!doc) {
      result.passed = false;
      result.errors.push(`Documento faltante: ${tipoReq}`);
    } else {
      if (!doc.zodValidado) {
        result.passed = false;
        result.errors.push(`Documento "${tipoReq}" no validado por Zod`);
      }
      if (doc.requiereRevisionManual) {
        result.passed = false;
        result.errors.push(`Documento "${tipoReq}" requiere revisión manual (confianza IA < 95%)`);
      }
    }
  }

  // CP-3: Verificar fianza
  if (cpId === 'CP-3') {
    if (!proceso.montoFianza || proceso.montoFianza <= 0) {
      result.passed = false;
      result.errors.push('Monto de fianza no registrado o inválido');
    }
    if (proceso.estadoFianza !== 'aprobada') {
      result.passed = false;
      result.errors.push('Fianza aún no aprobada por Legal');
    }
  }

  // CP-4: Compliance score
  if (cpId === 'CP-4') {
    if (proceso.riskScore > 70) {
      result.passed = false;
      result.errors.push(`Score de riesgo alto (${proceso.riskScore}/100). Requiere revisión ampliada.`);
    } else if (proceso.riskScore > 40) {
      result.warnings.push(`Score de riesgo medio (${proceso.riskScore}/100). Monitoreo recomendado.`);
    }
  }

  // CP-5: Document completeness
  if (cpId === 'CP-5') {
    if (proceso.documentCompletenessScore < 100) {
      result.passed = false;
      result.errors.push(`Expediente incompleto (${proceso.documentCompletenessScore.toFixed(0)}%). Se requiere 100%.`);
    }
  }

  return result;
}

// ============================================
// RACI Access Control (UI-level, enforcement in RLS)
// ============================================
export function canApproveControlPoint(
  cpId: string,
  userRoles: string[]
): boolean {
  const raci = MATRIZ_RACI[cpId];
  if (!raci) return false;

  // Can approve if user is R (Responsible) or A (Accountable)
  const approvalRoles = (Object.entries(raci) as [RolRaci, string][])
    .filter(([, responsibility]) => responsibility === 'R' || responsibility === 'A')
    .map(([role]) => role);

  // Map app roles to RACI roles
  const raciMapping: Record<string, RolRaci[]> = {
    admin: ['admin', 'process_owner'],
    revisor: ['process_owner', 'ai_quality_lead'],
    auditor: ['compliance'],
    operador: [],
  };

  const userRaciRoles = userRoles.flatMap(r => raciMapping[r] || []);
  return approvalRoles.some(role => userRaciRoles.includes(role));
}

export function getRaciLabel(responsibility: 'R' | 'A' | 'C' | 'I'): string {
  switch (responsibility) {
    case 'R': return 'Responsable';
    case 'A': return 'Aprobador';
    case 'C': return 'Consultado';
    case 'I': return 'Informado';
  }
}

// ============================================
// Document Completeness Calculator
// ============================================
export function calcularCompletenessScore(
  etapaActual: number,
  documentos: { tipoDocumento: string; zodValidado: boolean }[]
): number {
  const docsRequeridos = ETAPAS_SOP
    .filter(e => e.id <= etapaActual)
    .flatMap(e => e.documentosRequeridos);

  if (docsRequeridos.length === 0) return 100;

  const docsCompletos = docsRequeridos.filter(tipo =>
    documentos.some(d => d.tipoDocumento === tipo && d.zodValidado)
  );

  return (docsCompletos.length / docsRequeridos.length) * 100;
}

// ============================================
// Risk Score Calculator
// ============================================
export function calcularRiskScore(proceso: ProcesoOnboarding, documentos: { aiConfidence: number; requiereRevisionManual: boolean }[]): number {
  let riskFactors = 0;
  let totalFactors = 0;

  // Factor: Low AI confidence
  const avgConfidence = documentos.length > 0
    ? documentos.reduce((s, d) => s + d.aiConfidence, 0) / documentos.length
    : 0;
  totalFactors++;
  if (avgConfidence < 80) riskFactors += 30;
  else if (avgConfidence < 95) riskFactors += 10;

  // Factor: Manual reviews pending
  const pendingReviews = documentos.filter(d => d.requiereRevisionManual).length;
  totalFactors++;
  if (pendingReviews > 3) riskFactors += 25;
  else if (pendingReviews > 0) riskFactors += 10;

  // Factor: Fianza state
  totalFactors++;
  if (proceso.estadoFianza === 'pendiente') riskFactors += 15;
  else if (proceso.estadoFianza === 'vencida') riskFactors += 30;

  // Factor: SLA breaches
  const etapasConSla = Object.entries(proceso.slaTimestamps);
  let slaBreach = false;
  for (const [etapaStr, timestamp] of etapasConSla) {
    const etapaId = parseInt(etapaStr);
    const etapa = ETAPAS_SOP[etapaId];
    if (etapa && calcularSlaEstado(etapa, timestamp) === 'rojo') {
      slaBreach = true;
      break;
    }
  }
  totalFactors++;
  if (slaBreach) riskFactors += 20;

  return Math.min(riskFactors, 100);
}

// ============================================
// Zod Integrity Seal for Documents
// ============================================
export async function generarSelloIntegridad(
  documentoId: string,
  contenidoHash: string
): Promise<string> {
  const payload = `ZENITH-ONBOARDING|${documentoId}|${contenidoHash}|${new Date().toISOString()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
