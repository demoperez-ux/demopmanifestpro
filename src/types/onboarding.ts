// ============================================
// Tipos para Onboarding de Corredor (SOP-ACA-001)
// ============================================

export interface EtapaOnboarding {
  id: number;
  nombre: string;
  descripcion: string;
  slaHoras: number;
  controlPoints: string[];
  documentosRequeridos: TipoDocumento[];
  rolesAprobacion: RolRaci[];
}

export type EstadoProceso = 'en_progreso' | 'pausado' | 'aprobado' | 'rechazado' | 'cancelado';
export type EstadoFianza = 'pendiente' | 'en_revision' | 'aprobada' | 'vencida';
export type SlaEstado = 'verde' | 'amarillo' | 'rojo';

export type RolRaci = 
  | 'process_owner'
  | 'legal'
  | 'compliance'
  | 'ai_quality_lead'
  | 'admin';

export type TipoDocumento =
  | 'cedula_identidad'
  | 'certificado_idoneidad'
  | 'fianza_corredor'
  | 'constancia_css'
  | 'antecedentes_penales'
  | 'paz_y_salvo_dgi'
  | 'registro_publico'
  | 'poder_notarial'
  | 'curriculum_vitae'
  | 'foto_carnet'
  | 'contrato_servicios'
  | 'declaracion_jurada'
  | 'formulario_kyc'
  | 'carta_recomendacion'
  | 'otro';

export interface ControlPoint {
  id: string;
  etapa: number;
  nombre: string;
  descripcion: string;
  requisitos: string[];
  estado: 'pendiente' | 'aprobado' | 'bloqueado';
  validadoPor?: string;
  validadoAt?: string;
}

export interface DocumentoOnboarding {
  id: string;
  procesoId: string;
  nombreDocumento: string;
  tipoDocumento: TipoDocumento;
  etapa: number;
  aiConfidence: number;
  aiExtractedData: Record<string, string>;
  aiCamposCriticos: Record<string, { valor: string; confianza: number }>;
  requiereRevisionManual: boolean;
  revisadoPor?: string;
  revisadoAt?: string;
  zodValidado: boolean;
  zodSelloHash?: string;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ProcesoOnboarding {
  id: string;
  corredorNombre: string;
  corredorCedula: string;
  corredorEmail?: string;
  corredorTelefono?: string;
  empresaNombre?: string;
  empresaRuc?: string;
  etapaActual: number;
  estado: EstadoProceso;
  montoFianza?: number;
  tipoFianza?: string;
  estadoFianza: EstadoFianza;
  documentCompletenessScore: number;
  riskScore: number;
  controlPoints: Record<string, ControlPoint>;
  slaTimestamps: Record<number, string>;
  notas?: string;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  fecha: string;
  usuario: string;
  accion: string;
  motivo: string;
  etapa?: number;
}

// ============================================
// Definición de Etapas SOP-ACA-001
// ============================================
export const ETAPAS_SOP: EtapaOnboarding[] = [
  {
    id: 0,
    nombre: 'Solicitud Inicial',
    descripcion: 'Recepción y registro de solicitud del corredor aspirante',
    slaHoras: 4,
    controlPoints: ['CP-0'],
    documentosRequeridos: ['formulario_kyc'],
    rolesAprobacion: ['process_owner'],
  },
  {
    id: 1,
    nombre: 'Verificación de Identidad',
    descripcion: 'Validación KYC: cédula, antecedentes, y verificación biométrica',
    slaHoras: 24,
    controlPoints: ['CP-1'],
    documentosRequeridos: ['cedula_identidad', 'antecedentes_penales', 'foto_carnet'],
    rolesAprobacion: ['compliance'],
  },
  {
    id: 2,
    nombre: 'Idoneidad Profesional',
    descripcion: 'Verificación de certificado de idoneidad de corredor ante la ANA',
    slaHoras: 48,
    controlPoints: ['CP-2'],
    documentosRequeridos: ['certificado_idoneidad', 'curriculum_vitae', 'carta_recomendacion'],
    rolesAprobacion: ['process_owner', 'legal'],
  },
  {
    id: 3,
    nombre: 'Constitución de Fianza',
    descripcion: 'Revisión y aprobación de fianza aduanera (Art. 80 DL 1)',
    slaHoras: 72,
    controlPoints: ['CP-3'],
    documentosRequeridos: ['fianza_corredor'],
    rolesAprobacion: ['legal', 'admin'],
  },
  {
    id: 4,
    nombre: 'Compliance & Due Diligence',
    descripcion: 'Evaluación de riesgos AML/CFT y debida diligencia ampliada',
    slaHoras: 48,
    controlPoints: ['CP-4'],
    documentosRequeridos: ['declaracion_jurada', 'paz_y_salvo_dgi', 'constancia_css'],
    rolesAprobacion: ['compliance', 'ai_quality_lead'],
  },
  {
    id: 5,
    nombre: 'Expediente Builder',
    descripcion: 'Ensamblaje automático del expediente foliado con índice y carta de remisión',
    slaHoras: 8,
    controlPoints: ['CP-5'],
    documentosRequeridos: [],
    rolesAprobacion: ['process_owner'],
  },
  {
    id: 6,
    nombre: 'Revisión Legal',
    descripcion: 'Aprobación legal del expediente completo y dictamen jurídico',
    slaHoras: 72,
    controlPoints: ['CP-6'],
    documentosRequeridos: [],
    rolesAprobacion: ['legal'],
  },
  {
    id: 7,
    nombre: 'Aprobación Final',
    descripcion: 'Aprobación ejecutiva y registro en el sistema SIGA de la ANA',
    slaHoras: 24,
    controlPoints: ['CP-7'],
    documentosRequeridos: ['contrato_servicios', 'registro_publico'],
    rolesAprobacion: ['admin'],
  },
  {
    id: 8,
    nombre: 'Activación & Bienvenida',
    descripcion: 'Habilitación del corredor en ZENITH con credenciales operativas',
    slaHoras: 4,
    controlPoints: ['CP-8'],
    documentosRequeridos: [],
    rolesAprobacion: ['admin'],
  },
];

// ============================================
// Matriz RACI
// ============================================
export const MATRIZ_RACI: Record<string, Record<RolRaci, 'R' | 'A' | 'C' | 'I'>> = {
  'CP-0': { process_owner: 'R', legal: 'I', compliance: 'I', ai_quality_lead: 'I', admin: 'A' },
  'CP-1': { process_owner: 'I', legal: 'C', compliance: 'R', ai_quality_lead: 'C', admin: 'A' },
  'CP-2': { process_owner: 'R', legal: 'A', compliance: 'C', ai_quality_lead: 'I', admin: 'I' },
  'CP-3': { process_owner: 'I', legal: 'R', compliance: 'C', ai_quality_lead: 'I', admin: 'A' },
  'CP-4': { process_owner: 'I', legal: 'C', compliance: 'R', ai_quality_lead: 'A', admin: 'I' },
  'CP-5': { process_owner: 'R', legal: 'I', compliance: 'I', ai_quality_lead: 'C', admin: 'A' },
  'CP-6': { process_owner: 'I', legal: 'R', compliance: 'C', ai_quality_lead: 'I', admin: 'A' },
  'CP-7': { process_owner: 'I', legal: 'C', compliance: 'C', ai_quality_lead: 'I', admin: 'R' },
  'CP-8': { process_owner: 'C', legal: 'I', compliance: 'I', ai_quality_lead: 'I', admin: 'R' },
};

// ============================================
// Mapeo de documento tipo a label
// ============================================
export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  cedula_identidad: 'Cédula de Identidad',
  certificado_idoneidad: 'Certificado de Idoneidad (ANA)',
  fianza_corredor: 'Fianza de Corredor Aduanero',
  constancia_css: 'Constancia de CSS',
  antecedentes_penales: 'Antecedentes Penales',
  paz_y_salvo_dgi: 'Paz y Salvo DGI',
  registro_publico: 'Registro Público',
  poder_notarial: 'Poder Notarial',
  curriculum_vitae: 'Curriculum Vitae',
  foto_carnet: 'Fotografía Carnet',
  contrato_servicios: 'Contrato de Servicios',
  declaracion_jurada: 'Declaración Jurada',
  formulario_kyc: 'Formulario KYC',
  carta_recomendacion: 'Carta de Recomendación',
  otro: 'Otro',
};
