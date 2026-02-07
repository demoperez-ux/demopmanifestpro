// ZENITH - Centro de Comando Aduanero
// "La cumbre del control aduanero"
// Powered by Orion Freight System
// Developed by DemoPerez © 2025

export const COMPANY_INFO = {
  name: 'ZENITH',
  shortName: 'ZENITH',
  tradeName: 'ZENITH',
  tagline: 'La cumbre del control aduanero',
  ruc: '155678901-2-2025',
  location: 'Panamá, República de Panamá',
  country: 'República de Panamá',
  province: 'Panamá',
  district: 'Panamá',
  phone: '+507 238-4500',
  whatsapp: '+507 6500-0000',
  email: 'operaciones@zenith.pa',
  complianceEmail: 'compliance@zenith.pa',
  infoEmail: 'info@zenith.pa',
  website: 'www.zenith.pa',
  license: 'Agente de Carga Autorizado ANA',
};

export const PLATFORM_INFO = {
  name: 'ZENITH',
  fullName: 'ZENITH — Centro de Comando Aduanero',
  version: '4.0',
  description: 'La cumbre del control aduanero',
  poweredBy: 'Powered by Orion Freight System',
  standard: 'Gold Standard — OEA & BASC v6-2022',
  engines: {
    stella: {
      name: 'Stella Help',
      role: 'IA Proactiva — Entrenadora y Asistente Operativa',
      color: 'cyan',
      compliance: 'Monitoreo OEA + Ruta Crítica + Entrenamiento BASC',
    },
    zod: {
      name: 'Zod Integrity Engine',
      role: 'Guardián de Precisión — Motor de Integridad 0%',
      color: 'amber',
      compliance: 'Debida Diligencia + Sellos/Precintos + Bloqueo OFAC/ONU',
    },
  },
  compliance: {
    oea: 'Operador Económico Autorizado — Resolución ANA',
    basc: 'Business Alliance for Secure Commerce v6-2022',
    vuce: 'Ventanilla Única de Comercio Exterior (preparado)',
  },
};

export const DEVELOPER_INFO = {
  name: 'DemoPerez',
  year: 2025,
  version: '3.0',
};

export const REGULATORY_INFO = {
  authorities: {
    ana: {
      name: 'Autoridad Nacional de Aduanas',
      shortName: 'ANA',
      description: 'Ente rector de procedimientos aduaneros',
      phone: '+507 238-4300',
      email: 'tocumen@ana.gob.pa',
    },
    minsa: {
      name: 'Ministerio de Salud de Panamá',
      shortName: 'MINSA',
      description: 'Regulador de medicamentos y productos farmacéuticos',
      phone: '+507 512-9100',
      email: 'aeropuerto@minsa.gob.pa',
    },
    aupsa: {
      name: 'Autoridad Panameña de Seguridad de Alimentos',
      shortName: 'AUPSA',
      description: 'Regulador de suplementos alimenticios',
    },
    mida: {
      name: 'Ministerio de Desarrollo Agropecuario',
      shortName: 'MIDA',
      description: 'Regulador de productos veterinarios',
    },
  },
  laws: [
    'Código Fiscal de la República de Panamá',
    'Decreto Ejecutivo No. 266 (Reglamento Aduanero)',
    'Resoluciones de la Autoridad Nacional de Aduanas',
    'Ley 23 de 1997 (Control de Medicamentos)',
    'Ley 81 de 2019 (Protección de Datos Personales)',
  ],
  thresholds: {
    lowValue: 100,
    highValue: 500,
    veryHighValue: 1000,
  },
};

export const PHARMA_REQUIREMENTS = {
  medication: {
    authority: 'MINSA',
    requirement: 'Permiso sanitario previo',
    inspection: 'Inspección sanitaria obligatoria',
  },
  supplements: {
    authority: 'AUPSA',
    requirement: 'Notificación sanitaria',
    inspection: 'Verificación de etiquetado',
  },
  medical: {
    authority: 'MINSA',
    requirement: 'Registro sanitario vigente',
    inspection: 'Certificado de libre venta',
  },
  veterinary: {
    authority: 'MIDA',
    requirement: 'Permiso MIDA',
    inspection: 'Inspección veterinaria',
  },
};

export const CONTACT_EMERGENCY = {
  ana: {
    name: 'ANA - Aduana Tocumen',
    phone: '+507 238-4300',
    email: 'tocumen@ana.gob.pa',
  },
  minsa: {
    name: 'MINSA - Inspección Sanitaria',
    phone: '+507 512-9100',
    email: 'aeropuerto@minsa.gob.pa',
  },
  security: {
    name: 'Seguridad Aeroportuaria',
    phone: '+507 238-4000',
  },
  company: {
    name: COMPANY_INFO.shortName,
    phone: COMPANY_INFO.phone,
    whatsapp: COMPANY_INFO.whatsapp,
    email: COMPANY_INFO.email,
  },
};

export function getComplianceDeclaration(): string[] {
  return [
    'DECLARACIÓN DE CUMPLIMIENTO REGULATORIO',
    '',
    `Este documento ha sido generado por ${PLATFORM_INFO.name}`,
    `${PLATFORM_INFO.poweredBy}`,
    'en cumplimiento con las siguientes regulaciones:',
    '',
    ...REGULATORY_INFO.laws.map(law => `✓ ${law}`),
    '',
    `Operador: ${COMPANY_INFO.name}`,
    `Ubicación: ${COMPANY_INFO.location}`,
    '',
    'Para verificación, contactar:',
    COMPANY_INFO.name,
    `Email: ${COMPANY_INFO.complianceEmail}`,
  ];
}

export function getCompanyFooter(): string[] {
  return [
    '',
    '═══════════════════════════════════════════════════════════════',
    COMPANY_INFO.name,
    `RUC: ${COMPANY_INFO.ruc} | ${COMPANY_INFO.license}`,
    `${COMPANY_INFO.location}, ${COMPANY_INFO.country}`,
    `Tel: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.infoEmail}`,
    '',
    `${PLATFORM_INFO.name} v${PLATFORM_INFO.version}`,
    `${PLATFORM_INFO.poweredBy}`,
    `Desarrollado por ${DEVELOPER_INFO.name} © ${DEVELOPER_INFO.year}`,
    'En cumplimiento con regulaciones ANA y MINSA',
    '═══════════════════════════════════════════════════════════════',
  ];
}